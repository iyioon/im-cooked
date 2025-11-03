/**
 * Function declarations for voice-controlled cooking assistance
 * These tools enable the AI to trigger actions like step navigation and timers
 */

import type { FunctionDeclaration } from "@/lib/multimodal-live/types";

/**
 * Step navigation tool
 * Allows AI to move between cooking steps based on user voice commands
 */
export const navigateToStepTool: FunctionDeclaration = {
  name: "navigateToStep",
  description:
    "Navigate to a different cooking step. Use this when the user says 'next step', 'previous step', 'go back', 'skip to step X', or similar navigation commands.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description:
          "The navigation action to perform: 'next' to move forward one step, 'previous' to go back one step, or 'goto' to jump to a specific step number",
        enum: ["next", "previous", "goto"],
      },
      stepNumber: {
        type: "number",
        description:
          "The target step number (1-based index) when action is 'goto'. For example, if user says 'go to step 3', this should be 3.",
      },
    },
    required: ["action"],
  },
};

/**
 * Set timer tool
 * Allows AI to set cooking timers based on user requests
 */
export const setTimerTool: FunctionDeclaration = {
  name: "setTimer",
  description:
    "Set a cooking timer. Use this when the user asks to set a timer, like 'set a timer for 10 minutes' or 'remind me in 5 minutes'.",
  parameters: {
    type: "object",
    properties: {
      minutes: {
        type: "number",
        description: "Timer duration in minutes (can be decimal, e.g., 1.5 for 90 seconds)",
      },
      seconds: {
        type: "number",
        description: "Additional seconds to add to the timer (0-59)",
      },
      label: {
        type: "string",
        description:
          "Optional label describing what the timer is for (e.g., 'boil pasta', 'rest meat', 'preheat oven')",
      },
    },
    required: ["minutes"],
  },
};

/**
 * Mark step complete tool
 * Allows AI to mark the current step as done and move to next
 */
export const markStepCompleteTool: FunctionDeclaration = {
  name: "markStepComplete",
  description:
    "Mark the current cooking step as complete and automatically move to the next step. Use when user says 'I'm done', 'finished with this step', 'what's next', or indicates completion.",
  parameters: {
    type: "object",
    properties: {},
  },
};

/**
 * All cooking tools bundled together
 */
export const cookingTools = [
  {
    functionDeclarations: [
      navigateToStepTool,
      setTimerTool,
      markStepCompleteTool,
    ],
  },
];

/**
 * Tool call handler types
 */
export interface NavigateToStepArgs {
  action: "next" | "previous" | "goto";
  stepNumber?: number;
}

export interface SetTimerArgs {
  minutes: number;
  seconds?: number;
  label?: string;
}

export interface MarkStepCompleteArgs {}

/**
 * Union type for all tool call arguments
 */
export type CookingToolArgs =
  | NavigateToStepArgs
  | SetTimerArgs
  | MarkStepCompleteArgs;
