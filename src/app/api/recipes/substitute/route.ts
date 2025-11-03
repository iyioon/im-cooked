import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  SubstitutionRequest,
  SubstitutionResponse,
  RecipeDetail,
} from "@/types/recipe";
import { parseIngredient } from "@/lib/ingredient-parser";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    const body: SubstitutionRequest & { recipe: RecipeDetail; preferences?: import("@/types/recipe").UserPreferences } =
      await request.json();
    const {
      recipeTitle,
      originalIngredient,
      userInput,
      dietaryRestrictions,
      recipe,
      preferences,
    } = body;

    if (!recipeTitle || !originalIngredient || !recipe) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse the original ingredient
    const parsedOriginal = parseIngredient(originalIngredient);

    // Merge dietary restrictions from preferences and explicit request
    const allDietaryRestrictions = [
      ...(dietaryRestrictions || []),
      ...(preferences?.dietaryRestrictions || []),
    ];

    const allAllergies = preferences?.allergies || [];
    const avoidedIngredients = preferences?.avoidedIngredients || [];
    const location = preferences?.location;

    // Build dietary context string
    const dietaryContext = [];
    if (allDietaryRestrictions.length > 0) {
      dietaryContext.push(`Dietary restrictions: ${allDietaryRestrictions.join(", ")}`);
    }
    if (allAllergies.length > 0) {
      dietaryContext.push(`Allergies: ${allAllergies.join(", ")}`);
    }
    if (avoidedIngredients.length > 0) {
      dietaryContext.push(`User avoids: ${avoidedIngredients.join(", ")}`);
    }
    if (location?.country) {
      const locationStr = location.region ? `${location.region}, ${location.country}` : location.country;
      dietaryContext.push(`User location: ${locationStr} (consider regional ingredient availability)`);
    }

    // Prepare the prompt for Gemini
    const prompt = `You are a culinary expert AI assistant. Analyze the following recipe and provide intelligent ingredient substitution suggestions.

RECIPE DETAILS:
Title: ${recipeTitle}
Description: ${recipe.description || "N/A"}
Ingredients:
${recipe.ingredients.map((ing, i) => `${i + 1}. ${ing}`).join("\n")}

Instructions:
${recipe.instructions?.map((inst, i) => `${i + 1}. ${inst}`).join("\n") || "N/A"}

SUBSTITUTION REQUEST:
Original ingredient: ${originalIngredient}
${userInput ? `User wants to substitute with: ${userInput}` : "User is asking for substitution suggestions"}

USER CONTEXT:
${dietaryContext.length > 0 ? dietaryContext.join("\n") : "No specific dietary restrictions"}

TASK:
1. Analyze the dish context:
   - What type of dish is this? (e.g., dessert, main course, soup, salad)
   - What cuisine or cooking style? (e.g., Italian, Asian, American, baking)
   - What cooking method is primarily used? (e.g., baking, frying, boiling, slow-cooking)
   - Any existing dietary tags? (vegetarian, vegan, gluten-free, etc.)

2. Determine the role of the original ingredient:
   - What function does "${parsedOriginal.ingredient}" serve in this recipe?
   - Is it for flavor, texture, binding, leavening, moisture, or another purpose?
   - How critical is this ingredient to the dish's success?

3. Provide 2-3 substitution suggestions that:
   - Preserve the original taste as much as possible
   - MUST respect all dietary restrictions and allergies: ${allDietaryRestrictions.join(", ") || "none specified"}
   - MUST avoid all allergens: ${allAllergies.join(", ") || "none"}
   - MUST avoid user disliked ingredients: ${avoidedIngredients.join(", ") || "none"}
   - Use commonly available ingredients${location ? ` (especially in ${location.region ? location.region + ", " : ""}${location.country})` : ""}
   - Are appropriate for this specific dish type and cooking method
   ${userInput ? `- Evaluate if "${userInput}" is a suitable substitute and explain why or why not` : ""}

4. For each suggestion:
   - Specify the substitute ingredient name
   - Provide the appropriate quantity and unit (may differ from original)
   - Explain WHY this substitution works
   - Describe potential impacts on: taste, texture, nutrition, cooking time
   - Provide any necessary warnings

5. If instructions need to change due to the substitution:
   - Identify which steps are affected
   - Provide modified instructions for those steps

IMPORTANT PRIORITIES:
- Taste preservation is the highest priority
- Dietary restrictions must be respected
- Suggest ingredients that are readily available
- Be honest about any compromises in taste/texture
- If a substitution would significantly alter the dish, say so

RESPONSE FORMAT (JSON only, no markdown):
{
  "dishContext": {
    "dishType": "string",
    "cuisine": "string or null",
    "cookingMethod": "string or null",
    "dietaryTags": ["array of strings"]
  },
  "suggestions": [
    {
      "original": {
        "original": "${originalIngredient}",
        "quantity": number or null,
        "unit": "string or null",
        "ingredient": "${parsedOriginal.ingredient}",
        "preparation": "string or null"
      },
      "substitute": {
        "ingredient": "string",
        "quantity": number or null,
        "unit": "string or null",
        "preparation": "string or null"
      },
      "reason": "detailed explanation of why this substitution works",
      "impact": {
        "taste": "description of taste impact or null",
        "texture": "description of texture impact or null",
        "nutrition": "description of nutritional changes or null",
        "cookingTime": "description of cooking time changes or null"
      }
    }
  ],
  "modifiedRecipe": {
    "ingredients": ["array of all ingredients with substitution applied"],
    "instructionChanges": [
      {
        "step": number,
        "original": "original instruction",
        "modified": "modified instruction"
      }
    ] or null,
    "warnings": ["array of important warnings"] or null
  }
}`;

    // Call Gemini AI
    const result = await genAI.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash-native-audio-dialog",
      contents: prompt,
    });

    const text = result.text || "";

    // Clean up response - remove markdown code blocks if present
    const cleanResponse = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse the JSON response
    let substitutionResponse: SubstitutionResponse;
    try {
      substitutionResponse = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    return NextResponse.json(substitutionResponse);
  } catch (error) {
    console.error("Error in substitution API:", error);
    return NextResponse.json(
      {
        error: "Failed to generate substitution suggestions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
