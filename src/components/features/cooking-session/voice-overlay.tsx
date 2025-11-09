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
  const isSettingTimerRef = useRef(false);
  const isNavigatingRef = useRef(false);

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
    sendText,
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

  // Handle step changes - send as user message so AI responds
  useEffect(() => {
    if (isConnected && previousStepRef.current !== currentStepNumber) {
      const updateMessage = buildStepChangeUpdate(
        currentStepNumber,
        currentStep,
        totalSteps
      );
      
      console.log("Step changed in voice overlay, sending update:", updateMessage);
      sendText(updateMessage);
      previousStepRef.current = currentStepNumber;
    }
  }, [currentStepNumber, currentStep, totalSteps, isConnected, sendText]);

  // Register function call handler
  useEffect(() => {
    const handleFunctionCall = (call: { id: string; name: string; args: Record<string, unknown> }) => {
      console.log("Function call received:", call);
      console.log("Function name:", call.name);
      console.log("Function args:", JSON.stringify(call.args));

      if (call.name === "navigateToStep") {
        // Prevent multiple navigation actions from being executed simultaneously
        if (isNavigatingRef.current) {
          console.log("Navigation already in progress, rejecting duplicate request");
          sendToolResponse([{
            id: call.id,
            name: call.name,
            response: { 
              success: false, 
              message: "Navigation is already in progress. Please wait a moment before navigating again." 
            }
          }]);
          return;
        }
        
        const args = call.args as { action: "next" | "previous" | "goto"; stepNumber?: number };
        
        // Set flag to prevent duplicate navigation
        isNavigatingRef.current = true;
        
        if (args.action === "next") {
          // Check if we're already at the last step
          if (currentStepNumber >= totalSteps) {
            sendToolResponse([{
              id: call.id,
              name: call.name,
              response: { 
                success: false, 
                message: `Cannot move to next step. Already at the final step (${totalSteps} of ${totalSteps}).` 
              }
            }]);
            // Reset flag after error response
            isNavigatingRef.current = false;
            return;
          }
          
          onNextStep();
          sendToolResponse([{
            id: call.id,
            name: call.name,
            response: { success: true, message: `Navigation complete. Context update will follow - wait for it before responding to user.` }
          }]);
          
          // Reset flag after a delay to allow the navigation to complete
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 1500);
        } else if (args.action === "previous") {
          // Check if we're already at the first step
          if (currentStepNumber <= 1) {
            sendToolResponse([{
              id: call.id,
              name: call.name,
              response: { 
                success: false, 
                message: `Cannot move to previous step. Already at the first step (1 of ${totalSteps}).` 
              }
            }]);
            // Reset flag after error response
            isNavigatingRef.current = false;
            return;
          }
          
          onPreviousStep();
          sendToolResponse([{
            id: call.id,
            name: call.name,
            response: { success: true, message: `Navigation complete. Context update will follow - wait for it before responding to user.` }
          }]);
          
          // Reset flag after a delay to allow the navigation to complete
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 1500);
        } else if (args.action === "goto" && args.stepNumber) {
          // Validate step number is within bounds
          if (args.stepNumber < 1 || args.stepNumber > totalSteps) {
            sendToolResponse([{
              id: call.id,
              name: call.name,
              response: { 
                success: false, 
                message: `Cannot go to step ${args.stepNumber}. Step must be between 1 and ${totalSteps}.` 
              }
            }]);
            // Reset flag after error response
            isNavigatingRef.current = false;
            return;
          }
          
          onGoToStep(args.stepNumber);
          sendToolResponse([{
            id: call.id,
            name: call.name,
            response: { success: true, message: `Navigation complete. Context update will follow - wait for it before responding to user.` }
          }]);
          
          // Reset flag after a delay to allow the navigation to complete
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 1500);
        }
      } else if (call.name === "markStepComplete") {
        // Prevent multiple navigation actions from being executed simultaneously
        if (isNavigatingRef.current) {
          console.log("Navigation already in progress, rejecting duplicate request");
          sendToolResponse([{
            id: call.id,
            name: call.name,
            response: { 
              success: false, 
              message: "Navigation is already in progress. Please wait a moment before marking the step complete." 
            }
          }]);
          return;
        }
        
        // Set flag to prevent duplicate navigation
        isNavigatingRef.current = true;
        
        // Check if we're already at the last step
        if (currentStepNumber >= totalSteps) {
          sendToolResponse([{
            id: call.id,
            name: call.name,
            response: { 
              success: false, 
              message: `Cannot mark step as complete. Already at the final step (${totalSteps} of ${totalSteps}). The recipe is complete!` 
            }
          }]);
          // Reset flag after error response
          isNavigatingRef.current = false;
          return;
        }
        
        onNextStep();
        sendToolResponse([{
          id: call.id,
          name: call.name,
          response: { success: true, message: `Step marked complete. Navigation complete. Context update will follow - wait for it before responding to user.` }
        }]);
        
        // Reset flag after a delay to allow the navigation to complete
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 1500);
      } else if (call.name === "setTimer") {
        console.log("setTimer function called!");
        
        // Prevent multiple timers from being set simultaneously
        if (isSettingTimerRef.current) {
          console.log("Timer already being set, rejecting duplicate request");
          sendToolResponse([{
            id: call.id,
            name: call.name,
            response: { 
              success: false, 
              message: "A timer is already being set. Please wait a moment before setting another timer." 
            }
          }]);
          return;
        }
        
        const args = call.args as { minutes: number; seconds?: number; label?: string };
        console.log("Timer args - minutes:", args.minutes, "seconds:", args.seconds, "label:", args.label);
        
        const totalSeconds = Math.floor(args.minutes * 60) + (args.seconds || 0);
        const label = args.label || "Timer";
        
        console.log("Setting timer for", totalSeconds, "seconds with label:", label);
        
        // Set flag to prevent duplicate timer creation
        isSettingTimerRef.current = true;
        
        // Add the timer
        addTimer(totalSeconds, label);
        
        // Build response message with proper duration formatting
        let durationText = "";
        if (args.minutes > 0 && args.seconds && args.seconds > 0) {
          durationText = `${args.minutes} minute${args.minutes !== 1 ? 's' : ''} and ${args.seconds} second${args.seconds !== 1 ? 's' : ''}`;
        } else if (args.minutes > 0) {
          durationText = `${args.minutes} minute${args.minutes !== 1 ? 's' : ''}`;
        } else if (args.seconds && args.seconds > 0) {
          durationText = `${args.seconds} second${args.seconds !== 1 ? 's' : ''}`;
        }
        
        console.log("Sending timer response:", durationText);
        
        sendToolResponse([{
          id: call.id,
          name: call.name,
          response: { success: true, message: `Timer set for ${durationText}` }
        }]);
        
        // Reset flag after a brief delay to allow the tool response to complete
        setTimeout(() => {
          isSettingTimerRef.current = false;
        }, 1000);
        
        console.log("Timer function completed");
      } else {
        console.log("Unknown function call:", call.name);
      }
    };

    onFunctionCall(handleFunctionCall);
  }, [onFunctionCall, onNextStep, onPreviousStep, onGoToStep, sendToolResponse, addTimer]);

  // Handle timer completion - notify AI and auto-remove after delay
  useEffect(() => {
    onTimerComplete((timer) => {
      // Play alarm sound
      playAlarmSound();
      
      if (isConnected) {
        const minutes = Math.floor(timer.totalSeconds / 60);
        const seconds = timer.totalSeconds % 60;
        const timerMessage = `The "${timer.label}" timer has finished (${minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}${minutes > 0 && seconds > 0 ? ' and ' : ''}${seconds > 0 ? `${seconds} second${seconds !== 1 ? 's' : ''}` : ''}). Please notify the user clearly and ask if they need anything else.`;
        console.log("Timer completed, sending message:", timerMessage);
        sendText(timerMessage);
      }

      // Auto-remove timer after 5 seconds (give AI time to respond)
      setTimeout(() => {
        removeTimer(timer.id);
      }, 5000);
    });
  }, [onTimerComplete, isConnected, sendText, removeTimer]);

  // Play alarm sound using Web Audio API
  const playAlarmSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create three beeps
      for (let i = 0; i < 3; i++) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set frequency (800 Hz for a pleasant beep)
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        // Set volume envelope
        const startTime = audioContext.currentTime + (i * 0.3);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
        
        // Play beep
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.2);
      }
    } catch (error) {
      console.error("Failed to play alarm sound:", error);
    }
  };

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
      {/* Header */}
      <div className="shrink-0 p-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
              Step {currentStepNumber} of {totalSteps}
            </Badge>
            <h2 className="text-lg text-gray-400">{recipe.title}</h2>
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

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex items-stretch overflow-hidden">
        {/* Left Side - Step Image */}
        <div className="w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-white/5 to-transparent">
          {currentStep?.imageUrl ? (
            <div className="relative w-full h-full max-w-2xl max-h-[800px]">
              <img
                src={currentStep.imageUrl}
                alt={currentStep.caption || `Step ${currentStepNumber}`}
                className="w-full h-full object-contain rounded-2xl shadow-2xl"
              />
              {currentStep.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-4 rounded-b-2xl">
                  <p className="text-sm text-gray-300 text-center italic">
                    {currentStep.caption}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-center space-y-4">
                <div className="h-32 w-32 mx-auto rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white/30">
                    {currentStepNumber}
                  </span>
                </div>
                <p className="text-gray-400">No image for this step</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Instruction & AI Status */}
        <div className="w-1/2 flex flex-col p-8 border-l border-white/10">
          {/* AI Speaking Indicator - Top of Right Section */}
          <div className="shrink-0 mb-8">
            {isInitializing && (
              <div className="flex items-center gap-4 p-6 bg-white/5 rounded-2xl border border-white/10">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <div>
                  <p className="text-lg font-medium text-white">Connecting...</p>
                  <p className="text-sm text-gray-400">Setting up voice assistant</p>
                </div>
              </div>
            )}

            {voiceError && (
              <div className="flex items-center gap-4 p-6 bg-red-500/10 rounded-2xl border border-red-500/30">
                <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <X className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-medium text-red-400">Connection Error</p>
                  <p className="text-sm text-gray-400">{voiceError}</p>
                </div>
              </div>
            )}

            {!isInitializing && !voiceError && isAISpeaking && (
              <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl border border-green-500/30 animate-pulse">
                <div className="relative shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                    <Volume2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 animate-ping opacity-20" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-medium text-green-400">AI is speaking...</p>
                  {/* Output Volume Meter */}
                  <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-100"
                      style={{ width: `${outputVolume}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {!isInitializing && !voiceError && !isAISpeaking && (
              <div className="flex items-center gap-4 p-6 bg-white/5 rounded-2xl border border-white/10">
                <div className="h-12 w-12 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center shrink-0">
                  <Mic className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-white">Ready</p>
                  <p className="text-sm text-gray-400">Press the button below to ask a question</p>
                </div>
              </div>
            )}
          </div>

          {/* Current Instruction - Center of Right Section */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-2xl">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-2xl font-bold text-white shadow-lg">
                  {currentStepNumber}
                </div>
              </div>
              <p className="text-3xl sm:text-4xl text-white font-medium leading-relaxed">
                {currentStep?.text || "Loading..."}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Footer - Controls and Status */}
      <div className="shrink-0 border-t border-white/10">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          {/* Connection Status */}
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

          {/* Control Bar - Listening Indicator & Button Side by Side */}
          <div className="flex items-stretch gap-4">
            {/* Listening Indicator */}
            {!isInitializing && !voiceError && isRecording && (
              <div className="flex-1 flex items-center gap-4 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl border border-blue-500/30">
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                    <Mic className="h-5 w-5 text-white" />
                  </div>
                  {isSpeaking && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 animate-ping opacity-20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-blue-400">
                    {isSpeaking ? "Listening..." : "Ready to listen"}
                  </p>
                  {/* Input Volume Meter */}
                  <div className="mt-1.5 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100"
                      style={{ width: `${inputVolume}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Control Button */}
            <Button
              onClick={handleToggleRecording}
              disabled={!isConnected || isInitializing}
              className={`${isRecording ? 'flex-none' : 'flex-1'} py-8 text-lg ${
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
