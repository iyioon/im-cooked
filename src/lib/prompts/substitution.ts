/**
 * Ingredient Substitution Prompt Template
 * 
 * Generates intelligent ingredient substitution suggestions
 */

import { RecipeDetail } from "@/types/recipe";

export interface SubstitutionParams {
  recipeTitle: string;
  recipe: RecipeDetail;
  originalIngredient: string;
  parsedIngredient: string;
  userInput?: string;
  dietaryRestrictions: string[];
  allergies: string[];
  avoidedIngredients: string[];
  location?: {
    country: string;
    region?: string;
  };
}

export function buildSubstitutionPrompt(params: SubstitutionParams): string {
  const {
    recipeTitle,
    recipe,
    originalIngredient,
    parsedIngredient,
    userInput,
    dietaryRestrictions,
    allergies,
    avoidedIngredients,
    location,
  } = params;

  // Build dietary context string
  const dietaryContext = [];
  if (dietaryRestrictions.length > 0) {
    dietaryContext.push(`Dietary restrictions: ${dietaryRestrictions.join(", ")}`);
  }
  if (allergies.length > 0) {
    dietaryContext.push(`Allergies: ${allergies.join(", ")}`);
  }
  if (avoidedIngredients.length > 0) {
    dietaryContext.push(`User avoids: ${avoidedIngredients.join(", ")}`);
  }
  if (location?.country) {
    const locationStr = location.region ? `${location.region}, ${location.country}` : location.country;
    dietaryContext.push(`User location: ${locationStr} (consider regional ingredient availability)`);
  }

  return `You are a culinary expert AI assistant. Analyze the following recipe and provide intelligent ingredient substitution suggestions.

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
   - What function does "${parsedIngredient}" serve in this recipe?
   - Is it for flavor, texture, binding, leavening, moisture, or another purpose?
   - How critical is this ingredient to the dish's success?

3. Provide 2-3 substitution suggestions that:
   - Preserve the original taste as much as possible
   - MUST respect all dietary restrictions and allergies: ${dietaryRestrictions.join(", ") || "none specified"}
   - MUST avoid all allergens: ${allergies.join(", ") || "none"}
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
        "ingredient": "${parsedIngredient}",
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
  ]
}`;
}
