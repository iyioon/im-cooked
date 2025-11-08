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

    // Clean up response - remove markdown code blocks if present
    const cleanResponse = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse the JSON response
    const intentResponse = JSON.parse(cleanResponse) as IntentDetectionResponse;
    return intentResponse;
  } catch (error) {
    console.error("Error detecting intent:", error);
    throw new Error("Failed to detect user intent");
  }
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

    // Clean up response - remove markdown code blocks if present
    const cleanResponse = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse the JSON response
    const intentResponse = JSON.parse(cleanResponse) as CookingSessionIntentResponse;
    return intentResponse;
  } catch (error) {
    console.error("Error detecting cooking session intent:", error);
    throw new Error("Failed to detect cooking session intent");
  }
}
