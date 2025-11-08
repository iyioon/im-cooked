import { GoogleGenAI } from "@google/genai";
import { SubstitutionResponse, RecipeDetail, RecipeStep, IngredientSubstitution } from "@/types/recipe";
import { 
  buildCookingAssistantPrompt, 
  buildSubstitutionPrompt, 
  buildApplySubstitutionPrompt, 
  buildMatchIngredientPrompt, 
  buildIntentDetectionPrompt, 
  buildCookingSessionIntentPrompt,
  IntentDetectionResponse,
  CookingSessionIntentResponse
} from "@/lib/prompts";

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

/**
 * Model: gemini-2.0-flash
 * 
 * Selected for this cooking assistant because:
 * - Fast response times ideal for real-time chat interactions
 * - Cost-effective for frequent cooking assistance queries
 * - 1M token context window for long conversations with recipe context
 * - Excellent text generation quality for cooking instructions
 * - Stable version (not experimental) for production use
 * - Supports function calling for ingredient substitutions
 */
const MODEL_NAME = "gemini-2.0-flash";

/**
 * Get the configured Gemini AI instance
 */
export function getGenAI() {
  return genAI;
}

/**
 * Get the configured model name
 */
export function getModelName() {
  return MODEL_NAME;
}

/**
 * Get cooking assistance response
 */
export async function getCookingAssistance(params: {
  recipeTitle: string;
  currentStep?: RecipeStep;
  currentStepNumber: number;
  allSteps: RecipeStep[];
  ingredients: string[];
  userMessage: string;
}): Promise<string> {
  try {
    const prompt = buildCookingAssistantPrompt(params);

    const result = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const responseText = result.text || "";
    return responseText.trim();
  } catch (error) {
    console.error("Error getting cooking assistance:", error);
    throw new Error("Failed to get cooking assistance");
  }
}

/**
 * Get ingredient substitution suggestions
 */
export async function getSubstitutionSuggestions(params: {
  recipeTitle: string;
  recipe: RecipeDetail;
  originalIngredient: string;
  parsedIngredient: string;
  userInput?: string;
  dietaryRestrictions?: string[];
  allergies?: string[];
  avoidedIngredients?: string[];
  location?: { country: string; region?: string };
}): Promise<SubstitutionResponse> {
  try {
    const prompt = buildSubstitutionPrompt({
      recipeTitle: params.recipeTitle,
      recipe: params.recipe,
      originalIngredient: params.originalIngredient,
      parsedIngredient: params.parsedIngredient,
      userInput: params.userInput,
      dietaryRestrictions: params.dietaryRestrictions || [],
      allergies: params.allergies || [],
      avoidedIngredients: params.avoidedIngredients || [],
      location: params.location,
    });

    const result = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const text = result.text || "";

    // Clean up response - remove markdown code blocks if present
    const cleanResponse = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse the JSON response
    const substitutionResponse = JSON.parse(cleanResponse);
    return substitutionResponse as SubstitutionResponse;
  } catch (error) {
    console.error("Error getting substitution suggestions:", error);
    throw new Error("Failed to generate substitution suggestions");
  }
}

/**
 * Apply a specific substitution and regenerate the recipe
 */
export async function applySubstitutionToRecipe(params: {
  recipeTitle: string;
  recipe: RecipeDetail;
  selectedSubstitution: IngredientSubstitution;
  dietaryRestrictions?: string[];
  allergies?: string[];
  avoidedIngredients?: string[];
}): Promise<{
  ingredients: string[];
  instructionChanges?: Array<{
    step: number;
    original: string;
    modified: string;
    reason?: string;
  }>;
  warnings?: string[];
  summary?: string;
}> {
  try {
    const prompt = buildApplySubstitutionPrompt({
      recipeTitle: params.recipeTitle,
      recipe: params.recipe,
      selectedSubstitution: params.selectedSubstitution,
      dietaryRestrictions: params.dietaryRestrictions || [],
      allergies: params.allergies || [],
      avoidedIngredients: params.avoidedIngredients || [],
    });

    const result = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const text = result.text || "";

    // Clean up response - remove markdown code blocks if present
    const cleanResponse = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse the JSON response
    const appliedRecipe = JSON.parse(cleanResponse);
    return appliedRecipe;
  } catch (error) {
    console.error("Error applying substitution to recipe:", error);
    throw new Error("Failed to apply substitution to recipe");
  }
}

/**
 * Match ingredient from user message using LLM
 * Determines which ingredient from the recipe the user is referring to
 */
export async function matchIngredientFromMessage(params: {
  recipeTitle: string;
  recipeIngredients: string[];
  userMessage: string;
}): Promise<{
  matched: string | null;
  ingredient: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
}> {
  try {
    const prompt = buildMatchIngredientPrompt({
      recipeTitle: params.recipeTitle,
      recipeIngredients: params.recipeIngredients,
      userMessage: params.userMessage,
    });

    const result = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const text = result.text || "";

    // Clean up response - remove markdown code blocks if present
    const cleanResponse = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse the JSON response
    const matchResult = JSON.parse(cleanResponse);
    return matchResult;
  } catch (error) {
    console.error("Error matching ingredient from message:", error);
    throw new Error("Failed to match ingredient from message");
  }
}

/**
 * Detect user intent from their message
 * Classifies into RECIPE_SEARCH, GENERAL_FOOD_QUESTION, or REJECT
 */
export async function detectIntent(userMessage: string): Promise<IntentDetectionResponse> {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = buildIntentDetectionPrompt(userMessage);

      const result = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      const text = result.text || "";
      console.log(`[Intent Detection Attempt ${attempt}] Raw response:`, text);

      // Clean up response - remove markdown code blocks if present
      let cleanResponse = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Try to extract JSON if there's extra text
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      // Parse the JSON response
      const intentResponse = JSON.parse(cleanResponse) as IntentDetectionResponse;
      
      // Validate the response has required fields
      if (!intentResponse.intent || !['RECIPE_SEARCH', 'GENERAL_FOOD_QUESTION', 'REJECT'].includes(intentResponse.intent)) {
        throw new Error('Invalid intent value in response');
      }

      console.log(`[Intent Detection] Success on attempt ${attempt}:`, intentResponse);
      return intentResponse;
    } catch (error) {
      lastError = error as Error;
      console.error(`[Intent Detection Attempt ${attempt}] Error:`, error);
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < MAX_RETRIES) {
        const delayMs = attempt * 500; // Exponential backoff: 500ms, 1000ms
        console.log(`[Intent Detection] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // If all retries failed, return a default RECIPE_SEARCH intent as fallback
  // This ensures the app continues working even if intent detection fails
  console.error(`[Intent Detection] All ${MAX_RETRIES} attempts failed. Using fallback RECIPE_SEARCH intent.`);
  console.error('[Intent Detection] Last error:', lastError);
  
  return {
    intent: "RECIPE_SEARCH",
    confidence: "low",
    reason: "Intent detection failed, defaulting to recipe search",
    extractedRecipeQuery: userMessage,
  };
}

/**
 * Detect user intent during a cooking session
 * Classifies into COOKING_QUESTION, SUBSTITUTION_REQUEST, GENERAL_COOKING, or REJECT
 */
export async function detectCookingSessionIntent(params: {
  userMessage: string;
  recipeTitle: string;
  currentStep: number;
  totalSteps: number;
}): Promise<CookingSessionIntentResponse> {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = buildCookingSessionIntentPrompt(params);

      const result = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      const text = result.text || "";
      console.log(`[Cooking Session Intent Attempt ${attempt}] Raw response:`, text);

      // Clean up response - remove markdown code blocks if present
      let cleanResponse = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Try to extract JSON if there's extra text
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      // Parse the JSON response
      const intentResponse = JSON.parse(cleanResponse) as CookingSessionIntentResponse;

      // Validate the response has required fields
      if (!intentResponse.intent || !['COOKING_QUESTION', 'SUBSTITUTION_REQUEST', 'GENERAL_COOKING', 'REJECT'].includes(intentResponse.intent)) {
        throw new Error('Invalid intent value in response');
      }

      console.log(`[Cooking Session Intent] Success on attempt ${attempt}:`, intentResponse);
      return intentResponse;
    } catch (error) {
      lastError = error as Error;
      console.error(`[Cooking Session Intent Attempt ${attempt}] Error:`, error);

      if (attempt < MAX_RETRIES) {
        const delayMs = attempt * 500;
        console.log(`[Cooking Session Intent] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // Fallback to COOKING_QUESTION as default
  console.error(`[Cooking Session Intent] All ${MAX_RETRIES} attempts failed. Using fallback COOKING_QUESTION intent.`);
  console.error('[Cooking Session Intent] Last error:', lastError);

  return {
    intent: "COOKING_QUESTION",
    confidence: "low",
    reason: "Intent detection failed, defaulting to cooking question",
  };
}

/**
 * Validate if a search query conflicts with user dietary preferences
 * Returns suggestions for alternative searches if there's a conflict
 */
export async function validateSearchQuery(params: {
  query: string;
  dietaryRestrictions?: string[];
  allergies?: string[];
}): Promise<{
  hasConflict: boolean;
  reason?: string;
  suggestions?: string[];
}> {
  try {
    // If no restrictions, no conflict possible
    if ((!params.dietaryRestrictions || params.dietaryRestrictions.length === 0) &&
        (!params.allergies || params.allergies.length === 0)) {
      return { hasConflict: false };
    }

    let restrictionsText = "";
    if (params.dietaryRestrictions && params.dietaryRestrictions.length > 0) {
      restrictionsText += `Dietary restrictions: ${params.dietaryRestrictions.join(", ")}\n`;
    }
    if (params.allergies && params.allergies.length > 0) {
      restrictionsText += `Allergies: ${params.allergies.join(", ")}\n`;
    }

    const prompt = `You are a dietary compatibility checker. Analyze if the user's search query conflicts with their dietary preferences.

Search Query: "${params.query}"

User's Dietary Preferences:
${restrictionsText}

Determine if there's a fundamental conflict (e.g., searching for "chicken" when vegan, or "cheese pizza" when dairy-free).

If there's a conflict, suggest 2-3 alternative searches that would be compatible.

Respond with ONLY a JSON object in this exact format:
{
  "hasConflict": true or false,
  "reason": "Brief explanation of the conflict (only if hasConflict is true)",
  "suggestions": ["alternative 1", "alternative 2", "alternative 3"] (only if hasConflict is true)
}`;

    const result = await genAI.models.generateContent({
      model: MODEL_NAME,
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
    return response;
  } catch (error) {
    console.error("[Search Validation] Error validating search query:", error);
    // On error, assume no conflict to allow search to proceed
    return { hasConflict: false };
  }
}
