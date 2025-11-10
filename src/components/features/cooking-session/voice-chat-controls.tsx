"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CookingSessionMessage, RecipeStep } from "@/types/recipe";
import { useGeminiLive } from "@/hooks/useGeminiLive";
import { buildVoiceCookingContext, buildStepChangeUpdate } from "@/lib/prompts/cooking-assistant";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface VoiceChatControlsProps {
  recipeTitle: string;
  currentStep: RecipeStep | undefined;
  currentStepNumber: number;
  allSteps: RecipeStep[];
  ingredients: string[];
  totalSteps: number;
  voiceMode: boolean;
  onToggleVoiceMode: () => void;
  onSendMessage: (message: CookingSessionMessage) => void;
}

export function useVoiceChatControls({
  recipeTitle,
  currentStep,
  currentStepNumber,
  allSteps,
  ingredients,
  totalSteps,
  voiceMode,
  onToggleVoiceMode,
  onSendMessage,
}: VoiceChatControlsProps) {
  const previousStepRef = useRef(currentStepNumber);
  const lastAiTranscriptRef = useRef("");
  const [isActivating, setIsActivating] = useState(false);

  // Build voice cooking context (only once - step updates sent via sendContextUpdate)
  const systemInstruction = useMemo(() => 
    buildVoiceCookingContext({
      recipeTitle,
      currentStep: allSteps[0], // Start with first step
      currentStepNumber: 1,
      allSteps,
      ingredients,
      totalSteps,
    }),
    [recipeTitle, allSteps, ingredients, totalSteps]
  );

  // Initialize Gemini Live for voice
  const {
    isConnected,
    isRecording,
    isSpeaking,
    isAISpeaking,
    inputVolume,
    outputVolume,
    aiTranscript,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendContextUpdate,
    error: voiceError,
  } = useGeminiLive({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
    systemInstruction,
  });

  // Handle AI transcript and add to messages
  useEffect(() => {
    if (aiTranscript && voiceMode && aiTranscript !== lastAiTranscriptRef.current) {
      // Only add AI transcript as a message when it's substantial
      if (aiTranscript.length > 10) {
        lastAiTranscriptRef.current = aiTranscript;
        
        const assistantMessage: CookingSessionMessage = {
          id: `msg-voice-${Date.now()}`,
          role: "assistant",
          content: aiTranscript,
          timestamp: new Date(),
        };
        onSendMessage(assistantMessage);
      }
    }
  }, [aiTranscript, voiceMode, onSendMessage]);

  // Handle step changes - send context update to AI
  useEffect(() => {
    if (voiceMode && isConnected && previousStepRef.current !== currentStepNumber) {
      const updateMessage = buildStepChangeUpdate(
        currentStepNumber,
        currentStep,
        totalSteps
      );
      
      // Send silent context update to Gemini Live
      console.log("Step changed, sending update to AI:", updateMessage);
      sendContextUpdate(updateMessage);
      previousStepRef.current = currentStepNumber;
    }
  }, [currentStepNumber, currentStep, totalSteps, voiceMode, isConnected, sendContextUpdate]);

  // Toggle voice mode
  const handleToggleVoiceMode = async () => {
    if (!voiceMode) {
      // Entering voice mode
      setIsActivating(true);
      try {
        await connect();
        onToggleVoiceMode();
        
        // Send initial step context if not on step 1
        if (currentStepNumber !== 1) {
          const initialUpdate = buildStepChangeUpdate(
            currentStepNumber,
            currentStep,
            totalSteps
          );
          // Wait a bit for connection to stabilize
          setTimeout(() => {
            sendContextUpdate(initialUpdate);
          }, 500);
        }
      } catch (error) {
        console.error("Failed to connect to voice:", error);
        alert("Failed to connect to voice assistant. Please check your API key.");
      } finally {
        setIsActivating(false);
      }
    } else {
      // Exiting voice mode
      if (isRecording) {
        stopRecording();
      }
      disconnect();
      onToggleVoiceMode();
    }
  };

  // Toggle recording
  const handleToggleRecording = async () => {
    if (!isConnected) {
      alert("Please enable voice mode first");
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch (error) {
        console.error("Failed to start recording:", error);
        alert("Failed to access microphone. Please check permissions.");
      }
    }
  };

  return {
    toggleButton: (
      <div className="flex items-center gap-2">
        {voiceMode && (
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            {isAISpeaking && (
              <Badge
                variant="outline"
                className="border-green-500/50 text-green-400 animate-pulse"
                aria-label="AI is currently speaking"
              >
                <Volume2 className="h-3 w-3 mr-1" aria-hidden="true" />
                AI Speaking
              </Badge>
            )}
            {isSpeaking && (
              <Badge
                variant="outline"
                className="border-blue-500/50 text-blue-400 animate-pulse"
                aria-label="You are currently speaking"
              >
                <Mic className="h-3 w-3 mr-1" aria-hidden="true" />
                You're Speaking
              </Badge>
            )}
          </div>
        )}
        <Button
          onClick={handleToggleVoiceMode}
          variant={voiceMode ? "default" : "outline"}
          size="sm"
          disabled={isActivating}
          className={voiceMode ? "bg-green-600 hover:bg-green-700" : "border-white/20 hover:bg-white/10"}
          aria-label={voiceMode ? "Turn off voice mode" : "Turn on voice mode"}
          aria-pressed={voiceMode}
        >
          {voiceMode ? (
            <>
              <Volume2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Voice On
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4 mr-2" aria-hidden="true" />
              Voice Off
            </>
          )}
        </Button>
      </div>
    ),
    controls: voiceMode ? (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* Volume meters */}
          {isRecording && (
            <div className="flex-1 flex items-center gap-2" aria-label={`Your microphone volume at ${inputVolume} percent`}>
              <Mic className="h-4 w-4 text-blue-400" aria-hidden="true" />
              <div
                className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={inputVolume}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Microphone input volume"
              >
                <div
                  className="h-full bg-blue-500 transition-all duration-100"
                  style={{ width: `${inputVolume}%` }}
                />
              </div>
            </div>
          )}
          {isAISpeaking && (
            <div className="flex-1 flex items-center gap-2" aria-label={`AI speech volume at ${outputVolume} percent`}>
              <Volume2 className="h-4 w-4 text-green-400" aria-hidden="true" />
              <div
                className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={outputVolume}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="AI speech output volume"
              >
                <div
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${outputVolume}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={handleToggleRecording}
          disabled={!isConnected}
          className={`w-full ${
            isRecording
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          size="lg"
          aria-label={isRecording ? "Stop talking to cooking assistant" : "Start talking to cooking assistant"}
          aria-pressed={isRecording}
        >
          {isRecording ? (
            <>
              <MicOff className="h-5 w-5 mr-2" aria-hidden="true" />
              Stop Talking
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mr-2" aria-hidden="true" />
              Start Talking
            </>
          )}
        </Button>

        {voiceError && (
          <p className="text-xs text-red-400 text-center" role="alert" aria-live="assertive">
            {voiceError}
          </p>
        )}
      </div>
    ) : null,
  };
}
