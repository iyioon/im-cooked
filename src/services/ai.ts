import { GoogleGenAI } from "@google/genai";
import { SubstitutionResponse, RecipeDetail, RecipeStep } from "@/types/recipe";
import { buildCookingAssistantPrompt, buildSubstitutionPrompt } from "@/lib/prompts";

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
