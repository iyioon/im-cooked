"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CookingSessionMessage, RecipeStep } from "@/types/recipe";
import { Send, Loader2 } from "lucide-react";

interface TextChatInputProps {
  recipeTitle: string;
  currentStep: RecipeStep | undefined;
  currentStepNumber: number;
  allSteps: RecipeStep[];
  ingredients: string[];
  initialInput?: string;
  onSendMessage: (message: CookingSessionMessage) => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function TextChatInput({
  recipeTitle,
  currentStep,
  currentStepNumber,
  allSteps,
  ingredients,
  initialInput = "",
  onSendMessage,
  onNextStep,
  onPreviousStep,
  isFirstStep,
  isLastStep,
}: TextChatInputProps) {
  const [input, setInput] = useState(initialInput);
  const [loading, setLoading] = useState(false);

  // Update input when initialInput changes (from suggested questions)
  useEffect(() => {
    if (initialInput) {
      setInput(initialInput);
    }
  }, [initialInput]);

  const detectNavigationIntent = (message: string): "next" | "previous" | null => {
    const lowerMessage = message.toLowerCase().trim();

    const nextPatterns = [
      /^next$/,
      /^next step$/,
      /^move (on|forward|to next)$/,
      /^go to next( step)?$/,
      /^continue$/,
      /^proceed$/,
      /^i'?m ready$/,
      /^ready$/,
      /^done$/,
      /^finished$/,
      /^what'?s next\??$/,
      /^next please$/,
      /^move on$/,
      /^let'?s move on$/,
    ];

    const previousPatterns = [
      /^previous$/,
      /^previous step$/,
      /^go back$/,
      /^back$/,
      /^last step$/,
      /^return$/,
      /^go to previous( step)?$/,
    ];

    if (nextPatterns.some((pattern) => pattern.test(lowerMessage))) {
      return "next";
    }

    if (previousPatterns.some((pattern) => pattern.test(lowerMessage))) {
      return "previous";
    }

    return null;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: CookingSessionMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    onSendMessage(userMessage);
    const userInput = input;
    setInput("");

    const navigationIntent = detectNavigationIntent(userInput);

    if (navigationIntent === "next") {
      if (isLastStep) {
        const assistantMessage: CookingSessionMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: "You're already on the last step! Great job making it this far.",
          timestamp: new Date(),
        };
        onSendMessage(assistantMessage);
      } else {
        onNextStep();
        const assistantMessage: CookingSessionMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: `Moving to step ${currentStepNumber + 1}!`,
          timestamp: new Date(),
        };
        onSendMessage(assistantMessage);
      }
      return;
    }

    if (navigationIntent === "previous") {
      if (isFirstStep) {
        const assistantMessage: CookingSessionMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: "You're already on the first step!",
          timestamp: new Date(),
        };
        onSendMessage(assistantMessage);
      } else {
        onPreviousStep();
        const assistantMessage: CookingSessionMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: `Going back to step ${currentStepNumber - 1}.`,
          timestamp: new Date(),
        };
        onSendMessage(assistantMessage);
      }
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/cooking-session/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeTitle,
          currentStep,
          currentStepNumber,
          allSteps,
          ingredients,
          userMessage: userInput,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from assistant");
      }

      const data = await response.json();

      const assistantMessage: CookingSessionMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      onSendMessage(assistantMessage);
    } catch (error) {
      console.error("Error sending message:", error);

      const errorMessage: CookingSessionMessage = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: "Sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date(),
      };

      onSendMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Ask me anything..."
        disabled={loading}
        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
      />
      <Button
        onClick={handleSendMessage}
        disabled={!input.trim() || loading}
        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
