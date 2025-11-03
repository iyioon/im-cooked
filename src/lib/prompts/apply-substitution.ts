/**
 * Apply Substitution Prompt Template
 *
 * Regenerates the complete recipe with a specific substitution applied,
 * updating ingredients list and instructions as needed
 */

import { RecipeDetail, IngredientSubstitution } from "@/types/recipe";

export interface ApplySubstitutionParams {
  recipeTitle: string;
  recipe: RecipeDetail;
  selectedSubstitution: IngredientSubstitution;
  dietaryRestrictions?: string[];
  allergies?: string[];
  avoidedIngredients?: string[];
}

export function buildApplySubstitutionPrompt(params: ApplySubstitutionParams): string {
  const {
    recipeTitle,
    recipe,
    selectedSubstitution,
    dietaryRestrictions = [],
    allergies = [],
    avoidedIngredients = [],
  } = params;

  const { original, substitute, reason, impact } = selectedSubstitution;

  // Format the original ingredient for matching
  const originalIngredientName = original.ingredient.toLowerCase();
  const originalQuantityStr = original.quantity && original.unit
    ? `${original.quantity} ${original.unit}`
    : original.quantity
    ? `${original.quantity}`
    : "";

  return `You are a culinary expert AI assistant. Your task is to regenerate a complete recipe with a specific ingredient substitution applied.

ORIGINAL RECIPE:
Title: ${recipeTitle}
Description: ${recipe.description || "N/A"}

Ingredients:
${recipe.ingredients.map((ing, i) => `${i + 1}. ${ing}`).join("\n")}

Instructions:
${recipe.instructions?.map((inst, i) => `${i + 1}. ${inst}`).join("\n") || "N/A"}

SUBSTITUTION TO APPLY:
Original Ingredient: ${original.ingredient}
${originalQuantityStr ? `Original Quantity: ${originalQuantityStr}` : ""}
${original.preparation ? `Original Preparation: ${original.preparation}` : ""}

Substitute Ingredient: ${substitute.ingredient}
${substitute.quantity && substitute.unit ? `Substitute Quantity: ${substitute.quantity} ${substitute.unit}` : substitute.quantity ? `Substitute Quantity: ${substitute.quantity}` : ""}
${substitute.preparation ? `Substitute Preparation: ${substitute.preparation}` : ""}

Reason for Substitution: ${reason}

TASK:
1. Create the modified ingredients list:
   - Replace the original ingredient (${original.ingredient}) with the substitute (${substitute.ingredient})
   - Use the provided quantity and unit for the substitute
   - Keep all other ingredients exactly as they are
   - Preserve the complete ingredient list structure

2. Update instructions if necessary:
   - Review each cooking instruction
   - Identify steps that are affected by this substitution
   - If the substitute has different cooking properties (as noted below), modify the relevant instructions
   - Keep unaffected instructions exactly the same

3. Consider these impacts when updating instructions:
   ${impact?.taste ? `- Taste Impact: ${impact.taste}` : ""}
   ${impact?.texture ? `- Texture Impact: ${impact.texture}` : ""}
   ${impact?.cookingTime ? `- Cooking Time Impact: ${impact.cookingTime}` : ""}

4. Important constraints:
   - Preserve dietary restrictions: ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(", ") : "none"}
   - Respect allergies: ${allergies.length > 0 ? allergies.join(", ") : "none"}
   - Avoid user dislikes: ${avoidedIngredients.length > 0 ? avoidedIngredients.join(", ") : "none"}
   - The substitute ${substitute.ingredient} must already respect these constraints
   - Only modify instructions where necessary due to the substitution

RESPONSE FORMAT (JSON only, no markdown):
{
  "ingredients": [
    "array of all ingredients with the substitution applied",
    "keep original formatting and structure",
    "each ingredient should be on its own line in the array"
  ],
  "instructionChanges": [
    {
      "step": number,
      "original": "original instruction text",
      "modified": "modified instruction text",
      "reason": "brief explanation of why this step was changed"
    }
  ] or null if no changes needed,
  "warnings": [
    "array of important warnings or notes about the substitution",
    "e.g., cooking time differences, texture changes, flavor notes"
  ] or null if no warnings,
  "summary": "brief summary of the key changes made"
}`;
}
