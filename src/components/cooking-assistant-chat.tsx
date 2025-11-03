"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CookingSessionMessage, RecipeStep, RecipeDetail } from "@/types/recipe";
import {
  ChefHat,
  User,
  Send,
  Loader2,
} from "lucide-react";

interface CookingAssistantChatProps {
  recipe: RecipeDetail;
  currentStep: RecipeStep | undefined;
  currentStepNumber: number;
  totalSteps: number;
  messages: CookingSessionMessage[];
  onSendMessage: (message: CookingSessionMessage) => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function CookingAssistantChat({
  recipe,
  currentStep,
  currentStepNumber,
  totalSteps,
  messages,
  onSendMessage,
  onNextStep,
  onPreviousStep,
  isFirstStep,
  isLastStep,
}: CookingAssistantChatProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect navigation intent from user input
  const detectNavigationIntent = (message: string): "next" | "previous" | null => {
    const lowerMessage = message.toLowerCase().trim();
    
    // Next step patterns
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
    
    // Previous step patterns
    const previousPatterns = [
      /^previous$/,
      /^previous step$/,
      /^go back$/,
      /^back$/,
      /^last step$/,
      /^return$/,
      /^go to previous( step)?$/,
    ];
    
    if (nextPatterns.some(pattern => pattern.test(lowerMessage))) {
      return "next";
    }
    
    if (previousPatterns.some(pattern => pattern.test(lowerMessage))) {
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

    // Add user message immediately
    onSendMessage(userMessage);
    const userInput = input;
    setInput("");

    // Check for navigation intent
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

    // No navigation intent detected, send to AI
    setLoading(true);

    try {
      // Call AI assistant API
      const response = await fetch("/api/cooking-session/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeTitle: recipe.title,
          currentStep: currentStep,
          currentStepNumber: currentStepNumber,
          ingredients: recipe.ingredients,
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

  const suggestedQuestions = [
    "How do I know when this step is done?",
    "What if I don't have this ingredient?",
    "Can you explain this technique?",
    "How long should this take?",
  ];

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm flex flex-col h-full">
      <CardHeader className="border-b border-white/10 shrink-0">
        <CardTitle className="text-white flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-blue-400" />
          Cooking Assistant
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Step {currentStepNumber} of {totalSteps}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
        {/* Messages - Full height scrollable */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
                <ChefHat className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                I'm here to help!
              </h3>
              <p className="text-sm text-gray-400 mb-4 max-w-xs">
                Ask me questions about the current step, ingredients, or cooking techniques.
              </p>

              {/* Suggested questions */}
              <div className="space-y-2 w-full max-w-xs">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(question)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 border-2 border-blue-500/50">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                        <ChefHat className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white"
                        : "bg-white/5 border border-white/10 text-gray-300"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 border-2 border-purple-500/50">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600">
                        <User className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 border-2 border-blue-500/50">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                      <ChefHat className="h-4 w-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-white/5 border border-white/10">
                    <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input - Fixed at bottom */}
        <div className="p-4 border-t border-white/10 shrink-0">
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
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
