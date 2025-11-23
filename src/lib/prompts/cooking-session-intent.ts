/**
 * Cooking Session Intent Detection Prompt Template
 *
 * Classifies user input during active cooking sessions to ensure
 * the AI only handles cooking-related queries
 */

export interface CookingSessionIntentParams {
  userMessage: string;
  recipeTitle: string;
  currentStep: number;
  totalSteps: number;
}

export interface CookingSessionIntentResponse {
  intent: "COOKING_QUESTION" | "SUBSTITUTION_REQUEST" | "GENERAL_COOKING" | "REJECT";
  confidence: "high" | "medium" | "low";
  reason: string;
}

export function buildCookingSessionIntentPrompt(params: CookingSessionIntentParams): string {
  const { userMessage, recipeTitle, currentStep, totalSteps } = params;

  return `You are an intent classifier for a cooking assistant. The user is actively cooking "${recipeTitle}" and is currently on Step ${currentStep} of ${totalSteps}.

USER MESSAGE: "${userMessage}"

INTENT CATEGORIES:

1. COOKING_QUESTION
   - Questions about the current recipe, its steps, ingredients, or cooking process
   - Questions about timing, temperature, techniques specific to this recipe
   - Clarifications about measurements or instructions in this recipe
   - Troubleshooting issues with the current dish
   - Examples: "how long do I cook this?", "what's the next step?", "is the chicken supposed to be brown?", "what temperature should the oven be?", "can I skip the butter?", "how do I know when it's done?"
   
2. SUBSTITUTION_REQUEST
   - Explicit requests to substitute, replace, or swap ingredients
   - Asking about alternatives due to allergies, dietary restrictions, or missing ingredients
   - Examples: "can I use margarine instead of butter?", "substitute for eggs", "I don't have milk, what can I use?", "vegan alternative to cheese?", "I'm allergic to nuts"
   
3. GENERAL_COOKING
   - General cooking knowledge, techniques, or food science questions NOT specific to the current recipe
   - Questions about cooking methods, knife skills, or culinary terms
   - Food safety or storage questions
   - Examples: "how to dice an onion", "what temperature should chicken be cooked to", "what is blanching", "how to properly wash vegetables", "can I freeze this", "what does sauté mean"
   
4. REJECT
   - Anything completely unrelated to cooking, food preparation, or culinary topics
   - Questions about weather, news, sports, politics, entertainment, technology, etc.
   - General conversation or personal advice not related to cooking
   - Examples: "what's the weather today", "tell me a joke", "who won the game", "what time is it", "how do I fix my computer", "tell me about politics"

CLASSIFICATION RULES:
1. If the question is about the recipe they're actively cooking → COOKING_QUESTION
2. If explicitly asking to substitute or replace an ingredient → SUBSTITUTION_REQUEST
3. If asking about general cooking techniques/knowledge not tied to their current recipe → GENERAL_COOKING
4. If not about cooking, food, or culinary topics at all → REJECT
5. When uncertain between COOKING_QUESTION and GENERAL_COOKING:
   - If it could relate to their current step or recipe → COOKING_QUESTION
   - If it's purely educational/theoretical → GENERAL_COOKING
6. Be strict with REJECT - the user is actively cooking and needs to stay focused

CONFIDENCE LEVELS:
- high: Clear, unambiguous intent
- medium: Likely correct but some ambiguity
- low: Difficult to determine, needs context

RESPONSE FORMAT (JSON only, no markdown, no extra text):
{
  "intent": "COOKING_QUESTION" | "SUBSTITUTION_REQUEST" | "GENERAL_COOKING" | "REJECT",
  "confidence": "high" | "medium" | "low",
  "reason": "brief explanation of classification decision"
}

Examples:
- "how long should I bake this for?" → {"intent": "COOKING_QUESTION", "confidence": "high", "reason": "asking about timing for current recipe"}
- "can I use olive oil instead?" → {"intent": "SUBSTITUTION_REQUEST", "confidence": "high", "reason": "explicit substitution request"}
- "what does it mean to fold ingredients?" → {"intent": "GENERAL_COOKING", "confidence": "high", "reason": "general cooking technique question"}
- "what's the weather like?" → {"intent": "REJECT", "confidence": "high", "reason": "not related to cooking or food"}`;
}

/**
 * Pre-filter patterns for fast rejection of obviously off-topic queries
 * Returns true if the message appears to be off-topic
 */
export function isObviouslyOffTopic(userMessage: string): boolean {
  const message = userMessage.toLowerCase().trim();

  // Empty or very short messages
  if (message.length < 3) {
    return false; // Too short to determine, let LLM handle it
  }

  // Common off-topic patterns
  const offTopicPatterns = [
    // Weather
    /\b(weather|temperature outside|forecast|raining|snowing|sunny|cloudy)\b/,

    // Time/Date
    /\b(what time is it|current time|what day|what date)\b/,

    // Sports
    /\b(score|game|match|won|lost|team|playoff|championship|football|basketball|baseball|soccer)\b/,

    // Politics
    /\b(president|election|vote|politics|politician|government|congress|senate)\b/,

    // Entertainment
    /\b(movie|film|show|tv|series|episode|actor|actress|celebrity)\b/,

    // Technology (non-cooking)
    /\b(computer|laptop|phone|wifi|internet|app|software|download|install)\b/,

    // News
    /\b(news|headline|breaking|reported|journalist)\b/,

    // Jokes/Stories
    /\b(tell me a joke|funny story|knock knock)\b/,

    // Math/Homework
    /\b(solve|equation|homework|mathematics|calculate)\b/,
  ];

  // BUT: Some cooking-related terms might trigger false positives
  // Exceptions for cooking context
  const cookingExceptions = [
    /\boven temperature\b/,
    /\bcooking temperature\b/,
    /\bmeat temperature\b/,
    /\bfood temperature\b/,
    /\binstall timer\b/,
    /\bset timer\b/,
  ];

  // Check if any cooking exception matches
  for (const exception of cookingExceptions) {
    if (exception.test(message)) {
      return false; // It's cooking-related, not off-topic
    }
  }

  // Check if any off-topic pattern matches
  for (const pattern of offTopicPatterns) {
    if (pattern.test(message)) {
      return true; // Likely off-topic
    }
  }

  return false; // Doesn't match obvious off-topic patterns
}

/**
 * Generate a polite rejection message for off-topic queries
 */
export function generateRejectionMessage(recipeTitle: string): string {
  const messages = [
    `I'm here to help you cook ${recipeTitle}! Let's stay focused on your recipe. What do you need help with?`,
    `I can only assist with cooking ${recipeTitle} right now. Do you have any questions about your recipe?`,
    `Let's keep our focus on ${recipeTitle}. How can I help you with your cooking?`,
    `I'm your cooking assistant for ${recipeTitle}. What would you like to know about the recipe?`,
  ];

  // Return a random message for variety
  return messages[Math.floor(Math.random() * messages.length)];
}
