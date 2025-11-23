import { GoogleGenAI } from "@google/genai";
import {
  SubstitutionResponse,
  RecipeDetail,
  RecipeStep,
  IngredientSubstitution,
} from "@/types/recipe";
import {
  buildCookingAssistantPrompt,
  buildSubstitutionPrompt,
  buildApplySubstitutionPrompt,
  buildMatchIngredientPrompt,
  buildIntentDetectionPrompt,
  buildCookingSessionIntentPrompt,
  IntentDetectionResponse,
  CookingSessionIntentResponse,
} from "@/lib/prompts";
import { getGeminiApiKey } from "@/lib/env-validation";
import { llmLogger } from "@/lib/logger";
import { RETRY_SETTINGS } from "@/lib/constants";

/**
 * Custom error classes for API errors
 */
export class RateLimitError extends Error {
  constructor(message: string = "API rate limit reached. Please try again later.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class QuotaExhaustedError extends Error {
  constructor(message: string = "API quota exhausted. Please check your API key.") {
    super(message);
    this.name = "QuotaExhaustedError";
  }
}

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (!error) return false;

  const errorStr = String(error).toLowerCase();
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";

  // Check for common rate limit indicators
  return (
    errorStr.includes("rate limit") ||
    errorStr.includes("429") ||
    errorStr.includes("too many requests") ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("429") ||
    errorMessage.includes("too many requests")
  );
}

/**
 * Check if error is a quota exhaustion error
 */
function isQuotaError(error: unknown): boolean {
  if (!error) return false;

  const errorStr = String(error).toLowerCase();
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";

  // Check for common quota exhaustion indicators
  return (
    errorStr.includes("quota") ||
    errorStr.includes("exceeded") ||
    errorStr.includes("insufficient") ||
    errorMessage.includes("quota") ||
    errorMessage.includes("exceeded") ||
    errorMessage.includes("insufficient")
  );
}

/**
 * Check API errors and throw appropriate custom errors
 */
function checkApiError(error: unknown): void {
  if (isRateLimitError(error)) {
    throw new RateLimitError();
  }
  if (isQuotaError(error)) {
    throw new QuotaExhaustedError();
  }
}

/**
 * Retry wrapper for JSON parsing with LLM calls
 * Retries up to MAX_LLM_RETRIES times if JSON parsing fails
 *
 * @param llmCallFn - Function that calls the LLM and returns the text response
 * @param maxRetries - Maximum number of retry attempts
 * @param functionName - Name of calling function for logging
 * @returns Parsed JSON object
 */
async function parseJSONWithRetry<T>(
  llmCallFn: () => Promise<string>,
  maxRetries: number = RETRY_SETTINGS.MAX_LLM_RETRIES,
  functionName: string = "parseJSONWithRetry"
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Call the LLM to get response
      const text = await llmCallFn();

      // Clean up response - remove markdown code blocks if present
      const cleanResponse = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Try to parse JSON
      const parsed = JSON.parse(cleanResponse);

      return parsed as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a rate limit or quota error - fail immediately
      checkApiError(error);

      // If we've exhausted retries, throw
      if (attempt >= maxRetries) {
        throw new Error(
          `Failed to parse LLM response as valid JSON after ${maxRetries} attempts. Last error: ${lastError.message}`
        );
      }

      // Log retry attempt
      llmLogger.retryAttempt(functionName, attempt, maxRetries, "JSON parsing failed");
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error("Unexpected error in parseJSONWithRetry");
}

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: getGeminiApiKey(),
});

/**
 * Primary Model: gemini-2.5-flash
 *
 * Selected for this cooking assistant because:
 * - Fast response times ideal for real-time chat interactions
 * - Cost-effective for frequent cooking assistance queries
 * - 1M token context window for long conversations with recipe context
 * - Excellent text generation quality for cooking instructions
 * - Stable version (not experimental) for production use
 * - Supports function calling for ingredient substitutions
 */
const MODEL_NAME = "gemini-2.5-flash";

/**
 * Fallback Model: gemini-2.0-flash
 *
 * Used when the primary model encounters rate limits:
 * - Slightly older version with potentially more available quota
 * - Still maintains good quality for cooking assistance
 * - Helps ensure service availability during high-traffic periods
 */
const FALLBACK_MODEL_NAME = "gemini-2.0-flash";

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
 * Get the fallback model name
 */
export function getFallbackModelName() {
  return FALLBACK_MODEL_NAME;
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
  const functionName = "getCookingAssistance";
  const prompt = buildCookingAssistantPrompt(params);

  try {
    // Log request
    llmLogger.request(functionName, MODEL_NAME, prompt);

    // Try with primary model first
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

    // Log response
    llmLogger.response(functionName, MODEL_NAME, responseText, true);

    return responseText.trim();
  } catch (error) {
    llmLogger.error(functionName, MODEL_NAME, error);
    checkApiError(error);

    // If rate limited, try with fallback model
    if (error instanceof RateLimitError) {
      llmLogger.modelFallback(MODEL_NAME, FALLBACK_MODEL_NAME, functionName);
      try {
        // Log fallback request
        llmLogger.request(functionName, FALLBACK_MODEL_NAME, prompt);

        const fallbackResult = await genAI.models.generateContent({
          model: FALLBACK_MODEL_NAME,
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        });

        const responseText = fallbackResult.text || "";

        // Log fallback response
        llmLogger.response(functionName, FALLBACK_MODEL_NAME, responseText, true);

        return responseText.trim();
      } catch (fallbackError) {
        llmLogger.error(functionName, FALLBACK_MODEL_NAME, fallbackError);
        // Check if fallback also hit rate limit or quota - fail immediately
        checkApiError(fallbackError);
        throw new Error("Failed to get cooking assistance with both primary and fallback models");
      }
    }

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
  const functionName = "getSubstitutionSuggestions";
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

  try {
    // Log request
    llmLogger.request(functionName, MODEL_NAME, JSON.stringify(prompt).substring(0, 200));

    // Try with primary model first
    const substitutionResponse = await parseJSONWithRetry<SubstitutionResponse>(
      async () => {
        const result = await genAI.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
        });
        const text = result.text || "";
        // Log response inside retry wrapper
        llmLogger.response(functionName, MODEL_NAME, text, true);
        return text;
      },
      RETRY_SETTINGS.MAX_LLM_RETRIES,
      functionName
    );

    return substitutionResponse;
  } catch (error) {
    llmLogger.error(functionName, MODEL_NAME, error);

    // If rate limited, try with fallback model
    if (error instanceof RateLimitError) {
      llmLogger.modelFallback(MODEL_NAME, FALLBACK_MODEL_NAME, functionName);
      try {
        llmLogger.request(
          functionName,
          FALLBACK_MODEL_NAME,
          JSON.stringify(prompt).substring(0, 200)
        );

        const fallbackResponse = await parseJSONWithRetry<SubstitutionResponse>(
          async () => {
            const result = await genAI.models.generateContent({
              model: FALLBACK_MODEL_NAME,
              contents: prompt,
            });
            const text = result.text || "";
            llmLogger.response(functionName, FALLBACK_MODEL_NAME, text, true);
            return text;
          },
          RETRY_SETTINGS.MAX_LLM_RETRIES,
          functionName
        );

        return fallbackResponse;
      } catch (fallbackError) {
        llmLogger.error(functionName, FALLBACK_MODEL_NAME, fallbackError);
        // Re-throw custom errors (RateLimitError, QuotaExhaustedError) as-is
        if (
          fallbackError instanceof RateLimitError ||
          fallbackError instanceof QuotaExhaustedError
        ) {
          throw fallbackError;
        }
        throw new Error(
          "Failed to generate substitution suggestions with both primary and fallback models"
        );
      }
    }

    // Re-throw custom errors (QuotaExhaustedError) as-is
    if (error instanceof QuotaExhaustedError) {
      throw error;
    }
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
  const functionName = "applySubstitutionToRecipe";
  const prompt = buildApplySubstitutionPrompt({
    recipeTitle: params.recipeTitle,
    recipe: params.recipe,
    selectedSubstitution: params.selectedSubstitution,
    dietaryRestrictions: params.dietaryRestrictions || [],
    allergies: params.allergies || [],
    avoidedIngredients: params.avoidedIngredients || [],
  });

  type AppliedRecipeType = {
    ingredients: string[];
    instructionChanges?: Array<{
      step: number;
      original: string;
      modified: string;
      reason?: string;
    }>;
    warnings?: string[];
    summary?: string;
  };

  try {
    llmLogger.request(functionName, MODEL_NAME, JSON.stringify(prompt).substring(0, 200));

    const appliedRecipe = await parseJSONWithRetry<AppliedRecipeType>(
      async () => {
        const result = await genAI.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
        });
        const text = result.text || "";
        llmLogger.response(functionName, MODEL_NAME, text, true);
        return text;
      },
      RETRY_SETTINGS.MAX_LLM_RETRIES,
      functionName
    );

    return appliedRecipe;
  } catch (error) {
    llmLogger.error(functionName, MODEL_NAME, error);

    if (error instanceof RateLimitError) {
      llmLogger.modelFallback(MODEL_NAME, FALLBACK_MODEL_NAME, functionName);
      try {
        llmLogger.request(
          functionName,
          FALLBACK_MODEL_NAME,
          JSON.stringify(prompt).substring(0, 200)
        );

        const fallbackRecipe = await parseJSONWithRetry<AppliedRecipeType>(
          async () => {
            const result = await genAI.models.generateContent({
              model: FALLBACK_MODEL_NAME,
              contents: prompt,
            });
            const text = result.text || "";
            llmLogger.response(functionName, FALLBACK_MODEL_NAME, text, true);
            return text;
          },
          RETRY_SETTINGS.MAX_LLM_RETRIES,
          functionName
        );

        return fallbackRecipe;
      } catch (fallbackError) {
        llmLogger.error(functionName, FALLBACK_MODEL_NAME, fallbackError);
        if (
          fallbackError instanceof RateLimitError ||
          fallbackError instanceof QuotaExhaustedError
        ) {
          throw fallbackError;
        }
        throw new Error(
          "Failed to apply substitution to recipe with both primary and fallback models"
        );
      }
    }

    if (error instanceof QuotaExhaustedError) {
      throw error;
    }
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
  const functionName = "matchIngredientFromMessage";
  const prompt = buildMatchIngredientPrompt({
    recipeTitle: params.recipeTitle,
    recipeIngredients: params.recipeIngredients,
    userMessage: params.userMessage,
  });

  type MatchResultType = {
    matched: string | null;
    ingredient: string | null;
    confidence: "high" | "medium" | "low";
    reason: string;
  };

  try {
    llmLogger.request(functionName, MODEL_NAME, prompt);

    const matchResult = await parseJSONWithRetry<MatchResultType>(
      async () => {
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
        llmLogger.response(functionName, MODEL_NAME, text, true);
        return text;
      },
      RETRY_SETTINGS.MAX_LLM_RETRIES,
      functionName
    );

    return matchResult;
  } catch (error) {
    llmLogger.error(functionName, MODEL_NAME, error);

    if (error instanceof RateLimitError) {
      llmLogger.modelFallback(MODEL_NAME, FALLBACK_MODEL_NAME, functionName);
      try {
        llmLogger.request(functionName, FALLBACK_MODEL_NAME, prompt);

        const fallbackResult = await parseJSONWithRetry<MatchResultType>(
          async () => {
            const result = await genAI.models.generateContent({
              model: FALLBACK_MODEL_NAME,
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt }],
                },
              ],
            });
            const text = result.text || "";
            llmLogger.response(functionName, FALLBACK_MODEL_NAME, text, true);
            return text;
          },
          RETRY_SETTINGS.MAX_LLM_RETRIES,
          functionName
        );

        return fallbackResult;
      } catch (fallbackError) {
        llmLogger.error(functionName, FALLBACK_MODEL_NAME, fallbackError);
        if (
          fallbackError instanceof RateLimitError ||
          fallbackError instanceof QuotaExhaustedError
        ) {
          throw fallbackError;
        }
        throw new Error(
          "Failed to match ingredient from message with both primary and fallback models"
        );
      }
    }

    if (error instanceof QuotaExhaustedError) {
      throw error;
    }
    throw new Error("Failed to match ingredient from message");
  }
}

/**
 * Detect user intent from their message
 * Classifies into RECIPE_SEARCH, GENERAL_FOOD_QUESTION, or REJECT
 */
export async function detectIntent(userMessage: string): Promise<IntentDetectionResponse> {
  const functionName = "detectIntent";
  const prompt = buildIntentDetectionPrompt(userMessage);

  try {
    llmLogger.request(functionName, MODEL_NAME, prompt);

    const intentResponse = await parseJSONWithRetry<IntentDetectionResponse>(
      async () => {
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
        llmLogger.response(functionName, MODEL_NAME, text, true);
        return text;
      },
      RETRY_SETTINGS.MAX_LLM_RETRIES,
      functionName
    );

    return intentResponse;
  } catch (error) {
    llmLogger.error(functionName, MODEL_NAME, error);

    if (error instanceof RateLimitError) {
      llmLogger.modelFallback(MODEL_NAME, FALLBACK_MODEL_NAME, functionName);
      try {
        llmLogger.request(functionName, FALLBACK_MODEL_NAME, prompt);

        const fallbackResponse = await parseJSONWithRetry<IntentDetectionResponse>(
          async () => {
            const result = await genAI.models.generateContent({
              model: FALLBACK_MODEL_NAME,
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt }],
                },
              ],
            });
            const text = result.text || "";
            llmLogger.response(functionName, FALLBACK_MODEL_NAME, text, true);
            return text;
          },
          RETRY_SETTINGS.MAX_LLM_RETRIES,
          functionName
        );

        return fallbackResponse;
      } catch (fallbackError) {
        llmLogger.error(functionName, FALLBACK_MODEL_NAME, fallbackError);
        if (
          fallbackError instanceof RateLimitError ||
          fallbackError instanceof QuotaExhaustedError
        ) {
          throw fallbackError;
        }
        throw new Error("Failed to detect user intent with both primary and fallback models");
      }
    }

    if (error instanceof QuotaExhaustedError) {
      throw error;
    }
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
  const functionName = "detectCookingSessionIntent";
  const prompt = buildCookingSessionIntentPrompt(params);

  try {
    llmLogger.request(functionName, MODEL_NAME, prompt);

    const intentResponse = await parseJSONWithRetry<CookingSessionIntentResponse>(
      async () => {
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
        llmLogger.response(functionName, MODEL_NAME, text, true);
        return text;
      },
      RETRY_SETTINGS.MAX_LLM_RETRIES,
      functionName
    );

    return intentResponse;
  } catch (error) {
    llmLogger.error(functionName, MODEL_NAME, error);

    if (error instanceof RateLimitError) {
      llmLogger.modelFallback(MODEL_NAME, FALLBACK_MODEL_NAME, functionName);
      try {
        llmLogger.request(functionName, FALLBACK_MODEL_NAME, prompt);

        const fallbackResponse = await parseJSONWithRetry<CookingSessionIntentResponse>(
          async () => {
            const result = await genAI.models.generateContent({
              model: FALLBACK_MODEL_NAME,
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt }],
                },
              ],
            });
            const text = result.text || "";
            llmLogger.response(functionName, FALLBACK_MODEL_NAME, text, true);
            return text;
          },
          RETRY_SETTINGS.MAX_LLM_RETRIES,
          functionName
        );

        return fallbackResponse;
      } catch (fallbackError) {
        llmLogger.error(functionName, FALLBACK_MODEL_NAME, fallbackError);
        if (
          fallbackError instanceof RateLimitError ||
          fallbackError instanceof QuotaExhaustedError
        ) {
          throw fallbackError;
        }
        throw new Error(
          "Failed to detect cooking session intent with both primary and fallback models"
        );
      }
    }

    if (error instanceof QuotaExhaustedError) {
      throw error;
    }
    throw new Error("Failed to detect cooking session intent");
  }
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
  const functionName = "validateSearchQuery";

  try {
    // If no restrictions, no conflict possible
    if (
      (!params.dietaryRestrictions || params.dietaryRestrictions.length === 0) &&
      (!params.allergies || params.allergies.length === 0)
    ) {
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

    llmLogger.request(functionName, MODEL_NAME, prompt);

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

    llmLogger.response(functionName, MODEL_NAME, text, true);

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
    llmLogger.error(functionName, MODEL_NAME, error);
    // On error, assume no conflict to allow search to proceed
    return { hasConflict: false };
  }
}
