"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeDetail, CookingSessionMessage } from "@/types/recipe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CookingAssistantChat } from "@/components/cooking-assistant-chat";
import { useCookingSession } from "@/hooks/useCookingSession";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  Users,
  ChefHat,
} from "lucide-react";

interface CookingSessionClientProps {
  recipeId: string;
  sessionId: string | null;
}

export function CookingSessionClient({
  recipeId,
  sessionId,
}: CookingSessionClientProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    session,
    loading: sessionLoading,
    createSession,
    goToNextStep,
    goToPreviousStep,
    toggleStepComplete,
    toggleIngredientsPanel,
    addChatMessage,
  } = useCookingSession(sessionId);

  // Fetch recipe data
  useEffect(() => {
    async function fetchRecipe() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/recipes/${recipeId}`);
        if (!response.ok) {
          throw new Error("Failed to load recipe");
        }

        const data = await response.json();
        setRecipe(data);

        // Create session if it doesn't exist
        if (!sessionId && data) {
          const newSession = createSession(data);
          // Update URL with session ID
          router.replace(`/cooking-session/${recipeId}?session=${newSession.id}`);
        }
      } catch (err) {
        console.error("Error fetching recipe:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    }

    fetchRecipe();
  }, [recipeId, sessionId, createSession, router]);

  const handleSendMessage = (message: CookingSessionMessage) => {
    addChatMessage(message);
  };

  if (loading || sessionLoading) {
    return <CookingSessionLoading />;
  }

  if (error || !recipe || !session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-red-500/10 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <h3 className="text-xl font-bold text-white">Failed to load cooking session</h3>
              <p className="text-gray-400">{error || "Session not found"}</p>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="border-white/20 hover:bg-white/10 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps = recipe.steps || [];
  const currentStep = steps.find((s) => s.stepNumber === session.currentStep);
  const totalSteps = steps.length;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto max-w-[2000px] flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push(`/recipe/${recipe.id}`)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Exit
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">{recipe.title}</h1>
              <p className="text-sm text-gray-400">
                Cooking Session • Step {session.currentStep} of {totalSteps}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {recipe.prepTime && (
              <Badge variant="outline" className="border-white/20 text-gray-300">
                <Clock className="mr-1 h-3 w-3" />
                {recipe.prepTime}
              </Badge>
            )}
            {recipe.servings && (
              <Badge variant="outline" className="border-white/20 text-gray-300">
                <Users className="mr-1 h-3 w-3" />
                {recipe.servings}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <div className="mx-auto max-w-[2000px] p-4 sm:p-6 lg:p-8">
        <div className={`grid gap-6 ${session.ingredientsCollapsed ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"} h-[calc(100vh-8rem)]`}>
          {/* Ingredients Panel (Collapsible) */}
          {!session.ingredientsCollapsed && (
            <div className="flex flex-col">
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full flex flex-col">
                <CardHeader className="border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">Ingredients</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleIngredientsPanel}
                      className="h-8 w-8 p-0 hover:bg-white/10"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <ul className="space-y-3 pt-4">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start gap-3 text-gray-300">
                        <Checkbox className="mt-1 border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                        <span className="text-sm">{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Instructions Panel */}
          <div className="flex flex-col">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full flex flex-col">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center justify-between">
                  {session.ingredientsCollapsed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleIngredientsPanel}
                      className="h-8 w-8 p-0 hover:bg-white/10"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                  <CardTitle className="text-white">
                    Current Step
                  </CardTitle>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                    {session.currentStep} / {totalSteps}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Current Step - Large and Prominent */}
                {currentStep && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-lg font-bold text-white">
                        {currentStep.stepNumber}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg text-white leading-relaxed">
                          {currentStep.text}
                        </p>
                      </div>
                    </div>

                    {currentStep.imageUrl && (
                      <div>
                        <img
                          src={currentStep.imageUrl}
                          alt={currentStep.caption || `Step ${currentStep.stepNumber}`}
                          className="rounded-lg border border-white/10 w-full object-cover"
                        />
                        {currentStep.caption && (
                          <p className="text-sm text-gray-400 mt-2 italic">
                            {currentStep.caption}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Step Completion Checkbox */}
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                      <Checkbox
                        checked={session.completedSteps.includes(session.currentStep)}
                        onCheckedChange={() => toggleStepComplete(session.currentStep)}
                        className="border-white/20 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <span className="text-sm text-gray-300">
                        Mark this step as complete
                      </span>
                    </div>
                  </div>
                )}

                {/* All Steps Overview */}
                <div className="pt-6 border-t border-white/10">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4">All Steps</h3>
                  <div className="space-y-2">
                    {steps.map((step) => {
                      const isCurrent = step.stepNumber === session.currentStep;
                      const isCompleted = session.completedSteps.includes(step.stepNumber);

                      return (
                        <div
                          key={step.stepNumber}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                            isCurrent
                              ? "bg-blue-500/10 border-blue-500/50"
                              : isCompleted
                              ? "bg-green-500/5 border-green-500/20"
                              : "bg-white/5 border-white/10"
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-400" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${isCurrent ? "text-white font-medium" : "text-gray-400"}`}>
                              Step {step.stepNumber}: {step.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cooking Assistant Chat Panel */}
          <div className="flex flex-col">
            <CookingAssistantChat
              recipe={recipe}
              currentStep={currentStep}
              currentStepNumber={session.currentStep}
              totalSteps={totalSteps}
              messages={session.messages}
              onSendMessage={handleSendMessage}
              onNextStep={goToNextStep}
              onPreviousStep={goToPreviousStep}
              isFirstStep={session.currentStep === 1}
              isLastStep={session.currentStep === totalSteps}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CookingSessionLoading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="animate-pulse">
        <div className="h-16 bg-white/5 border-b border-white/10" />
        <div className="max-w-[2000px] mx-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-[600px] bg-white/5 rounded-lg" />
            <div className="h-[600px] bg-white/5 rounded-lg" />
            <div className="h-[600px] bg-white/5 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
