"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeDetail, CookingSessionMessage } from "@/types/recipe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CookingAssistantChat } from "@/components/features/cooking-session/cooking-assistant-chat";
import { VoiceOverlay } from "@/components/features/cooking-session/voice-overlay";
import { useCookingSession } from "@/hooks/useCookingSession";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  ShoppingBasket,
  Mic,
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
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);

  const {
    session,
    loading: sessionLoading,
    createSession,
    goToNextStep,
    goToPreviousStep,
    addChatMessage,
  } = useCookingSession(sessionId);

  useEffect(() => {
    async function initializeSession() {
      try {
        setLoading(true);
        setError(null);

        // If session ID exists, load it and use the embedded recipe
        if (sessionId && session) {
          // Use the modified recipe if available, otherwise fall back to original
          const recipeFromSession = session.modifiedRecipe || session.originalRecipe;
          if (recipeFromSession) {
            setRecipe(recipeFromSession);
          } else {
            // Legacy session: fetch from API
            const response = await fetch(`/api/recipes/${recipeId}`);
            if (!response.ok) {
              throw new Error("Failed to load recipe");
            }
            const data = await response.json();
            setRecipe(data);
          }
        } else if (!sessionId) {
          // No session yet, fetch recipe and create one
          const response = await fetch(`/api/recipes/${recipeId}`);
          if (!response.ok) {
            throw new Error("Failed to load recipe");
          }

          const data = await response.json();
          setRecipe(data);
          const newSession = createSession(data);
          router.replace(`/cooking-session/${recipeId}?session=${newSession.id}`);
        }
      } catch (err) {
        console.error("Error initializing session:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    }

    initializeSession();
  }, [recipeId, sessionId, session, createSession, router]);

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
    <>
      <div className="h-screen bg-black text-white flex flex-col">
        {/* Header */}
        <header className="shrink-0 border-b border-white/10 bg-black/80 backdrop-blur-md">
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
              
              <Button
                onClick={() => setShowVoiceOverlay(true)}
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Mic className="mr-2 h-4 w-4" />
                Voice Mode
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 hover:bg-white/10 text-white"
                  >
                    <ShoppingBasket className="mr-2 h-4 w-4" />
                    Ingredients
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Ingredients</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto pr-2">
                    <ul className="space-y-3">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-start gap-3 text-gray-300">
                          <Checkbox className="mt-1 border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                          <span className="text-sm">{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 min-h-0">
          <div className="mx-auto max-w-[2000px] h-full p-4 sm:p-6 lg:p-8">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 h-full">
              {/* Instructions Panel */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm flex flex-col h-full overflow-hidden">
                <CardHeader className="shrink-0 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">Current Step</CardTitle>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                      {session.currentStep} / {totalSteps}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-y-auto p-6">
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
                    </div>
                  )}
                </CardContent>
                
                <div className="shrink-0 p-4 border-t border-white/10">
                  <div className="flex gap-2">
                    <Button
                      onClick={goToPreviousStep}
                      disabled={session.currentStep === 1}
                      variant="outline"
                      className="flex-1 border-white/20 hover:bg-white/10 text-white disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <Button
                      onClick={goToNextStep}
                      disabled={session.currentStep === totalSteps}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Chat Panel */}
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
      
      {/* Voice Overlay */}
      {showVoiceOverlay && (
        <VoiceOverlay
          recipe={recipe}
          currentStep={currentStep}
          currentStepNumber={session.currentStep}
          totalSteps={totalSteps}
          onClose={() => setShowVoiceOverlay(false)}
        />
      )}
    </>
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
