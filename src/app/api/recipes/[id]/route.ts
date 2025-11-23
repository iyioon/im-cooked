import { NextRequest, NextResponse } from "next/server";
import { getRecipeDetail } from "@/services/recipe-scraper";
import { UserPreferences } from "@/types/recipe";
import { getGenAI, getModelName } from "@/services/ai";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Recipe ID is required" }, { status: 400 });
    }

    const recipeDetail = await getRecipeDetail(id);

    if (!recipeDetail) {
      return NextResponse.json(
        { error: "Recipe not found or could not be loaded" },
        { status: 404 }
      );
    }

    return NextResponse.json(recipeDetail);
  } catch (error) {
    console.error("Error in recipe detail API:", error);
    return NextResponse.json(
      { error: "Failed to load recipe details. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { preferences } = body as { preferences?: UserPreferences };

    if (!id) {
      return NextResponse.json({ error: "Recipe ID is required" }, { status: 400 });
    }

    const recipeDetail = await getRecipeDetail(id);

    if (!recipeDetail) {
      return NextResponse.json(
        { error: "Recipe not found or could not be loaded" },
        { status: 404 }
      );
    }

    // If no preferences, return recipe as-is
    if (
      !preferences ||
      ((!preferences.dietaryRestrictions || preferences.dietaryRestrictions.length === 0) &&
        (!preferences.allergies || preferences.allergies.length === 0) &&
        (!preferences.avoidedIngredients || preferences.avoidedIngredients.length === 0))
    ) {
      return NextResponse.json({ recipe: recipeDetail });
    }

    // Auto-detect and apply substitutions for conflicting ingredients
    try {
      const autoSubstitutions = await detectAndApplySubstitutions(recipeDetail, preferences);

      return NextResponse.json({
        recipe: recipeDetail,
        autoSubstitutions: autoSubstitutions.hasSubstitutions ? autoSubstitutions : undefined,
      });
    } catch (error) {
      console.error("[Auto-Substitution] Error applying auto-substitutions:", error);
      // If auto-substitution fails, return recipe without modifications
      return NextResponse.json({ recipe: recipeDetail });
    }
  } catch (error) {
    console.error("Error in recipe detail API (POST):", error);
    return NextResponse.json(
      { error: "Failed to load recipe details. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Detect ingredients that conflict with preferences and auto-apply substitutions
 */
async function detectAndApplySubstitutions(recipe: any, preferences: UserPreferences) {
  const genAI = getGenAI();
  const modelName = getModelName();

  let restrictionsText = "";
  if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
    restrictionsText += `Dietary restrictions: ${preferences.dietaryRestrictions.join(", ")}\n`;
  }
  if (preferences.allergies && preferences.allergies.length > 0) {
    restrictionsText += `Allergies: ${preferences.allergies.join(", ")}\n`;
  }
  if (preferences.avoidedIngredients && preferences.avoidedIngredients.length > 0) {
    restrictionsText += `Avoided ingredients: ${preferences.avoidedIngredients.join(", ")}\n`;
  }

  const prompt = `You are a dietary substitution assistant. Analyze the recipe and identify ingredients that conflict with the user's dietary preferences, then suggest substitutions.

Recipe: ${recipe.title}

Ingredients:
${recipe.ingredients.map((ing: string, i: number) => `${i + 1}. ${ing}`).join("\n")}

User's Dietary Preferences:
${restrictionsText}

Instructions:
1. Identify ALL ingredients that conflict with the user's preferences
2. For each conflicting ingredient, suggest an appropriate substitution
3. Return the complete modified ingredients list with substitutions applied
4. Include any warnings or notes about the substitutions

Respond with ONLY a JSON object in this exact format:
{
  "hasSubstitutions": true or false,
  "ingredients": ["full modified ingredients list with substitutions applied"],
  "instructionChanges": [{"step": 1, "original": "original text", "modified": "modified text", "reason": "why it changed"}],
  "warnings": ["any warnings about taste/texture/cooking changes"]
}

If no substitutions are needed, set hasSubstitutions to false and return the original ingredients list.`;

  const result = await genAI.models.generateContent({
    model: modelName,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  const text = result.text || "";

  // Clean up response
  let cleanResponse = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanResponse = jsonMatch[0];
  }

  const response = JSON.parse(cleanResponse);
  console.log(
    `[Auto-Substitution] ${response.hasSubstitutions ? "Applied" : "No"} substitutions for "${recipe.title}"`
  );

  return response;
}
