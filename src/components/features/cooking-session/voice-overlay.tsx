"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { RecipeStep, RecipeDetail } from "@/types/recipe";
import { useGeminiLive } from "@/hooks/useGeminiLive";
import { useTimer } from "@/hooks/useTimer";
import { buildVoiceCookingContext, buildStepChangeUpdate } from "@/lib/prompts/cooking-assistant";
import { cookingTools } from "@/lib/prompts/cooking-tools";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimerDisplay } from "./timer-display";
import { X, Mic, MicOff, Volume2, Loader2 } from "lucide-react";

interface VoiceOverlayProps {
  recipe: RecipeDetail;
  currentStep: RecipeStep | undefined;
  currentStepNumber: number;
  totalSteps: number;
  onClose: () => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onGoToStep: (stepNumber: number) => void;
}

export function VoiceOverlay({
  recipe,
  currentStep,
  currentStepNumber,
  totalSteps,
  onClose,
  onNextStep,
  onPreviousStep,
  onGoToStep,
}: VoiceOverlayProps) {
  const previousStepRef = useRef(currentStepNumber);
  const [isInitializing, setIsInitializing] = useState(true);
  const initialStepRef = useRef(currentStepNumber);
  const initialStepTextRef = useRef(currentStep);

  // Initialize timer management
  const { timers, addTimer, removeTimer, onTimerComplete } = useTimer();

  // Build system instruction for voice context - memoized to prevent reconnection
  // We only build this once on mount with the initial step
  const systemInstruction = useMemo(() => {
    return buildVoiceCookingContext({
      recipeTitle: recipe.title,
      currentStep: initialStepTextRef.current,
      currentStepNumber: initialStepRef.current,
      allSteps: recipe.steps || [],
      ingredients: recipe.ingredients,
      totalSteps,
    });
  }, [recipe.title, recipe.steps, recipe.ingredients, totalSteps]);

  // Initialize Gemini Live
  const {
    isConnected,
    isRecording,
    isSpeaking,
    isAISpeaking,
    inputVolume,
    outputVolume,
    aiTranscript,
    userTranscript,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendContextUpdate,
    onFunctionCall,
    sendToolResponse,
    error: voiceError,
    connectionState,
  } = useGeminiLive({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
    systemInstruction,
    tools: cookingTools,
  });

  // Connect on mount and send initial greeting
  useEffect(() => {
    const initializeVoice = async () => {
      try {
        await connect();
        setIsInitializing(false);
        
        // Send initial context to have AI explain the current step
        const initialMessage = `The user just started voice mode. Please greet them and explain Step ${currentStepNumber} in 15-30 seconds.`;
        sendContextUpdate(initialMessage);
        previousStepRef.current = currentStepNumber;
      } catch (error) {
        console.error("Failed to connect to voice:", error);
        setIsInitializing(false);
      }
    };

    initializeVoice();

    // Cleanup on unmount
    return () => {
      if (isRecording) {
        stopRecording();
      }
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle step changes - silently update AI context
  useEffect(() => {
    if (isConnected && previousStepRef.current !== currentStepNumber) {
      const updateMessage = buildStepChangeUpdate(
        currentStepNumber,
        currentStep,
        totalSteps
      );
      
      console.log("Step changed in voice overlay, sending update:", updateMessage);
      sendContextUpdate(updateMessage);
      previousStepRef.current = currentStepNumber;
    }
  }, [currentStepNumber, currentStep, totalSteps, isConnected, sendContextUpdate]);

  // Register function call handler
  useEffect(() => {
    const handleFunctionCall = (call: { id: string; name: string; args: Record<string, unknown> }) => {
      console.log("Function call received:", call);

      if (call.name === "navigateToStep") {
        const args = call.args as { action: "next" | "previous" | "goto"; stepNumber?: number };
        
        if (args.action === "next") {
          onNextStep();
          sendToolResponse([{
            id: call.id,
            name: call.name,
            response: { success: true, message: "Moved to next step" }
          }]);
        } else if (args.action === "previous") {
          onPreviousStep();
          sendToolResponse([{
            id: call.id,
            name: call.name,
            response: { success: true, message: "Moved to previous step" }
          }]);
        } else if (args.action === "goto" && args.stepNumber) {
          onGoToStep(args.stepNumber);
          sendToolResponse([{
            id: call.id,
            name: call.name,
            response: { success: true, message: `Moved to step ${args.stepNumber}` }
          }]);
        }
      } else if (call.name === "markStepComplete") {
        onNextStep();
        sendToolResponse([{
          id: call.id,
          name: call.name,
          response: { success: true, message: "Step marked complete, moved to next step" }
        }]);
      } else if (call.name === "setTimer") {
        const args = call.args as { minutes: number; seconds?: number; label?: string };
        const totalSeconds = Math.floor(args.minutes * 60) + (args.seconds || 0);
        const label = args.label || "Timer";
        
        // Add the timer
        addTimer(totalSeconds, label);
        
        sendToolResponse([{
          id: call.id,
          name: call.name,
          response: { success: true, message: `Timer set for ${args.minutes} minutes` }
        }]);
      }
    };

    onFunctionCall(handleFunctionCall);
  }, [onFunctionCall, onNextStep, onPreviousStep, onGoToStep, sendToolResponse, addTimer]);

  // Handle timer completion - notify AI and auto-remove after delay
  useEffect(() => {
    onTimerComplete((timer) => {
      if (isConnected) {
        const timerMessage = `[TIMER COMPLETE] The "${timer.label}" timer has finished. Please notify the user that their ${timer.label} timer is done.`;
        sendContextUpdate(timerMessage);
      }

      // Auto-remove timer after 3 seconds
      setTimeout(() => {
        removeTimer(timer.id);
      }, 3000);
    });
  }, [onTimerComplete, isConnected, sendContextUpdate, removeTimer]);

  // Toggle recording
  const handleToggleRecording = async () => {
    if (!isConnected) {
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch (error) {
        console.error("Failed to start recording:", error);
      }
    }
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    disconnect();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header - Current Step */}
      <div className="shrink-0 p-6 border-b border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                  Step {currentStepNumber} of {totalSteps}
                </Badge>
                <h2 className="text-lg text-gray-400">{recipe.title}</h2>
              </div>
              <p className="text-2xl sm:text-3xl text-white font-medium leading-relaxed">
                {currentStep?.text || "Loading..."}
              </p>
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="icon"
              className="shrink-0 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - AI Response/Status */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="max-w-4xl w-full text-center space-y-8">
          {/* Connection Status */}
          {isInitializing && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
              <p className="text-xl text-gray-400">Connecting to voice assistant...</p>
            </div>
          )}

          {voiceError && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-xl text-red-400">{voiceError}</p>
              <Button
                onClick={handleClose}
                variant="outline"
                className="border-white/20 hover:bg-white/10 text-white"
              >
                Close
              </Button>
            </div>
          )}

          {/* AI Speaking Indicator */}
          {!isInitializing && !voiceError && isAISpeaking && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center animate-pulse">
                    <Volume2 className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 animate-ping opacity-20" />
                </div>
                <Badge variant="outline" className="border-green-500/50 text-green-400 text-lg px-4 py-2">
                  AI is speaking...
                </Badge>
              </div>

              {/* Output Volume Meter */}
              <div className="max-w-md mx-auto">
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-100"
                    style={{ width: `${outputVolume}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Ready State */}
          {!isInitializing && !voiceError && !isAISpeaking && !isRecording && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="h-24 w-24 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center">
                  <Mic className="h-12 w-12 text-gray-400" />
                </div>
                <p className="text-xl text-gray-400">
                  Press the button below to ask a question
                </p>
              </div>
            </div>
          )}

          {/* User Speaking */}
          {!isInitializing && !voiceError && isRecording && !isAISpeaking && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                    <Mic className="h-12 w-12 text-white" />
                  </div>
                  {isSpeaking && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 animate-ping opacity-20" />
                  )}
                </div>
                <Badge variant="outline" className="border-blue-500/50 text-blue-400 text-lg px-4 py-2">
                  {isSpeaking ? "Listening..." : "Ready to listen"}
                </Badge>
              </div>

              {/* Input Volume Meter */}
              <div className="max-w-md mx-auto">
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100"
                    style={{ width: `${inputVolume}%` }}
                  />
                </div>
              </div>

              {/* User Transcript Preview */}
              {userTranscript && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-w-2xl mx-auto">
                  <p className="text-sm text-gray-400 mb-1">You said:</p>
                  <p className="text-lg text-white">
                    {userTranscript}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Controls */}
      <div className="shrink-0 p-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-4">
            {/* Connection Status Badge */}
            <div className="flex items-center justify-center gap-2">
              {connectionState === "connecting" && (
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Connecting...
                </Badge>
              )}
              {connectionState === "connected" && (
                <Badge variant="outline" className="border-green-500/50 text-green-400">
                  Connected
                </Badge>
              )}
              {connectionState === "disconnected" && (
                <Badge variant="outline" className="border-gray-500/50 text-gray-400">
                  Disconnected
                </Badge>
              )}
              {connectionState === "error" && (
                <Badge variant="outline" className="border-red-500/50 text-red-400">
                  Connection Error
                </Badge>
              )}
            </div>

            {/* Main Control Button */}
            <Button
              onClick={handleToggleRecording}
              disabled={!isConnected || isInitializing}
              className={`w-full py-8 text-lg ${
                isRecording 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-blue-600 hover:bg-blue-700"
              } disabled:opacity-50`}
              size="lg"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-6 w-6 mr-3" />
                  Stop Talking
                </>
              ) : (
                <>
                  <Mic className="h-6 w-6 mr-3" />
                  Start Talking
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Timer Display */}
      <TimerDisplay timers={timers} onRemove={removeTimer} />
    </div>
  );
}
