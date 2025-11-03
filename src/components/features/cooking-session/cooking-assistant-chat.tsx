"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CookingSessionMessage, RecipeStep, RecipeDetail } from "@/types/recipe";
import { TextChatInput } from "./text-chat-input";
import { ChatMessages } from "./chat-messages";
import { ChefHat } from "lucide-react";

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
  const [suggestedQuestionInput, setSuggestedQuestionInput] = useState("");

  const suggestedQuestions = [
    "How do I know when this step is done?",
    "What if I don't have this ingredient?",
    "Can you explain this technique?",
    "How long should this take?",
  ];

  const handleSuggestedQuestionClick = (question: string) => {
    setSuggestedQuestionInput(question);
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm flex flex-col h-full overflow-hidden">
      <CardHeader className="shrink-0 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-blue-400" />
              Cooking Assistant
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              Step {currentStepNumber} of {totalSteps}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4">
        <ChatMessages
          messages={messages}
          loading={false}
          voiceMode={false}
          suggestedQuestions={suggestedQuestions}
          onSuggestedQuestionClick={handleSuggestedQuestionClick}
        />
      </CardContent>

      <div className="shrink-0 p-4 border-t border-white/10">
        <TextChatInput
          recipeTitle={recipe.title}
          currentStep={currentStep}
          currentStepNumber={currentStepNumber}
          allSteps={recipe.steps || []}
          ingredients={recipe.ingredients}
          initialInput={suggestedQuestionInput}
          onSendMessage={onSendMessage}
          onNextStep={onNextStep}
          onPreviousStep={onPreviousStep}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
        />
      </div>
    </Card>
  );
}
