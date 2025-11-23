/**
 * Centralized Prompt Templates
 *
 * This directory contains all Gemini AI prompt templates used throughout the application.
 * Organizing prompts in one place makes them easier to maintain, test, and version.
 */

export { buildCookingAssistantPrompt } from "./cooking-assistant";
export type { CookingAssistantParams } from "./cooking-assistant";

export { buildSubstitutionPrompt } from "./substitution";
export type { SubstitutionParams } from "./substitution";

export { buildApplySubstitutionPrompt } from "./apply-substitution";
export type { ApplySubstitutionParams } from "./apply-substitution";

export { buildMatchIngredientPrompt } from "./match-ingredient";
export type { MatchIngredientParams } from "./match-ingredient";

export { buildIntentDetectionPrompt } from "./intent-detection";
export type { IntentDetectionParams, IntentDetectionResponse } from "./intent-detection";

export {
  buildCookingSessionIntentPrompt,
  isObviouslyOffTopic,
  generateRejectionMessage,
} from "./cooking-session-intent";
export type {
  CookingSessionIntentParams,
  CookingSessionIntentResponse,
} from "./cooking-session-intent";
