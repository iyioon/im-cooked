/**
 * Intent Detection Prompt Template
 *
 * Classifies user input into different intent categories to route
 * to appropriate handling logic
 */

export interface IntentDetectionParams {
  userMessage: string;
}

export interface IntentDetectionResponse {
  intent: "RECIPE_SEARCH" | "GENERAL_FOOD_QUESTION" | "INGREDIENT_SUBSTITUTION" | "REJECT";
  confidence: "high" | "medium" | "low";
  reason: string;
  extractedRecipeQuery?: string;
}

export function buildIntentDetectionPrompt(userMessage: string): string {
  return `You are an AI cooking assistant classifier. Your task is to determine the user's intent and classify their message into one of four categories.

USER MESSAGE: "${userMessage}"

INTENT CATEGORIES:

1. RECIPE_SEARCH
   - User is looking for a specific recipe or dish
   - Examples: "chocolate chip cookies", "pasta carbonara", "chicken curry", "easy pasta recipes", "vegan brownies", "find me a lasagna recipe"
   - Characteristics: Contains dish names, recipe names, food items that can be cooked, requests for recipe suggestions

2. GENERAL_FOOD_QUESTION
   - User has a general question about food, cooking techniques, ingredients, or culinary knowledge
   - Examples: "how do I boil an egg", "what is umami", "what temperature should chicken be cooked to", "is honey vegan", "what's the difference between baking soda and baking powder", "how to dice an onion", "what does blanching mean"
   - Characteristics: Questions about cooking methods, ingredient properties, food science, culinary techniques, food definitions, cooking temperatures/times

3. INGREDIENT_SUBSTITUTION
   - User is asking for ingredient substitutions or alternatives
   - Examples: "substitute for butter", "what can I use instead of eggs", "replace baking soda", "alternative to milk", "without garlic", "swap out the cream"
   - Keywords: substitute, alternative, replace, swap, instead of, without
   - Characteristics: Questions about replacing or finding alternatives for specific ingredients

4. REJECT
   - User's query is not related to food, cooking, or recipes
   - Examples: "what's the weather today", "tell me a joke", "who won the superbowl", "how to fix my computer", "what time is it", "tell me about politics"
   - Characteristics: Questions about non-food topics, general conversation, unrelated queries

CLASSIFICATION RULES:
1. If the message mentions a specific dish name or type of food to cook → RECIPE_SEARCH
2. If the message asks "how to" about a cooking technique or food preparation → GENERAL_FOOD_QUESTION
3. If the message asks about food properties, ingredients, or culinary concepts → GENERAL_FOOD_QUESTION
4. If the message asks about substituting, replacing, or finding alternatives for ingredients → INGREDIENT_SUBSTITUTION
5. If the message is completely unrelated to food or cooking → REJECT
6. When in doubt between intents:
   - If it's about making a specific dish → RECIPE_SEARCH
   - If it's about a technique or concept → GENERAL_FOOD_QUESTION
   - If it's about replacing an ingredient → INGREDIENT_SUBSTITUTION
7. For RECIPE_SEARCH intents, extract and clean the recipe query (remove filler words like "find me", "I want", etc.)

RESPONSE FORMAT (JSON only, no markdown, no extra text):
{
  "intent": "RECIPE_SEARCH" | "GENERAL_FOOD_QUESTION" | "INGREDIENT_SUBSTITUTION" | "REJECT",
  "confidence": "high" | "medium" | "low",
  "reason": "brief explanation of why this classification was chosen",
  "extractedRecipeQuery": "cleaned recipe query (only for RECIPE_SEARCH intent, otherwise omit this field)"
}

Examples:
- "chocolate chip cookies" → {"intent": "RECIPE_SEARCH", "confidence": "high", "reason": "specific recipe request", "extractedRecipeQuery": "chocolate chip cookies"}
- "how to boil eggs" → {"intent": "GENERAL_FOOD_QUESTION", "confidence": "high", "reason": "asking about cooking technique"}
- "substitute for butter" → {"intent": "INGREDIENT_SUBSTITUTION", "confidence": "high", "reason": "asking for ingredient alternative"}
- "what's the weather" → {"intent": "REJECT", "confidence": "high", "reason": "not related to food or cooking"}
- "find me a good lasagna recipe" → {"intent": "RECIPE_SEARCH", "confidence": "high", "reason": "explicit recipe search request", "extractedRecipeQuery": "lasagna"}`;
}
