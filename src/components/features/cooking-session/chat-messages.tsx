"use client";

import { useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CookingSessionMessage } from "@/types/recipe";
import { ChefHat, User, Loader2 } from "lucide-react";

interface ChatMessagesProps {
  messages: CookingSessionMessage[];
  loading?: boolean;
  voiceMode: boolean;
  suggestedQuestions?: string[];
  onSuggestedQuestionClick?: (question: string) => void;
}

export function ChatMessages({
  messages,
  loading = false,
  voiceMode,
  suggestedQuestions = [],
  onSuggestedQuestionClick,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
          <ChefHat className="h-8 w-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">I'm here to help!</h3>
        <p className="text-sm text-gray-400 mb-4 max-w-xs">
          {voiceMode
            ? "Voice mode is active! Click the microphone button below to start talking."
            : "Ask me questions about the current step, ingredients, or cooking techniques."}
        </p>

        {!voiceMode && suggestedQuestions.length > 0 && onSuggestedQuestionClick && (
          <div className="space-y-2 w-full max-w-xs">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => onSuggestedQuestionClick(question)}
                className="w-full text-left px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          {message.role === "assistant" && (
            <Avatar className="h-8 w-8 border-2 border-blue-500/50">
              <AvatarImage src="/chef.jpg" alt="Chef Assistant" />
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
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
            <AvatarImage src="/chef.jpg" alt="Chef Assistant" />
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
  );
}
