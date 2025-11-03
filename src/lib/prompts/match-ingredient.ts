/**
 * Ingredient Matching Prompt Template
 *
 * Determines which ingredient from a recipe the user is referring to
 * in their natural language message about substitutions
 */

export interface MatchIngredientParams {
  recipeTitle: string;
  recipeIngredients: string[];
  userMessage: string;
}

export function buildMatchIngredientPrompt(params: MatchIngredientParams): string {
  const { recipeTitle, recipeIngredients, userMessage } = params;

  return `You are a culinary AI assistant. Your task is to determine which ingredient from a recipe the user is referring to when they ask about substitutions.

RECIPE: ${recipeTitle}

RECIPE INGREDIENTS:
${recipeIngredients.map((ing, i) => `${i + 1}. ${ing}`).join("\n")}

USER MESSAGE: "${userMessage}"

TASK:
Analyze the user's message and determine which ingredient from the recipe they are asking about substituting or replacing.

IMPORTANT RULES:
1. The user might mention the ingredient directly (e.g., "substitute baking soda")
2. The user might describe what they want to replace (e.g., "what can I use instead of the leavening agent")
3. The user might reference an ingredient partially (e.g., "butter" when recipe has "2 cups unsalted butter")
4. The user might use pronouns or contextual references
5. If the user's message is ambiguous or refers to multiple ingredients, choose the most likely one
6. If the user is asking about something that's NOT in the recipe, respond with {"matched": null, "reason": "ingredient not in recipe"}

RESPONSE FORMAT (JSON only, no markdown, no extra text):
{
  "matched": "the full ingredient string from the recipe list (exactly as written), or null if no match found",
  "ingredient": "the main ingredient name extracted from the matched ingredient",
  "confidence": "high, medium, or low",
  "reason": "brief explanation of why this ingredient matches the user's request"
}`;
}
