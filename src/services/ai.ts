import { GoogleGenAI } from "@google/genai";
import { SubstitutionResponse, RecipeDetail, RecipeStep, IngredientSubstitution } from "@/types/recipe";
import { buildCookingAssistantPrompt, buildSubstitutionPrompt, buildApplySubstitutionPrompt, buildMatchIngredientPrompt } from "@/lib/prompts";

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash-native-audio-dialog";

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
