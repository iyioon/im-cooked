"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CookingSessionMessage, RecipeStep, RecipeDetail } from "@/types/recipe";
import { useGeminiLive } from "@/hooks/useGeminiLive";
import { buildVoiceCookingContext, buildStepChangeUpdate } from "@/lib/prompts/cooking-assistant";
import {
  ChefHat,
  User,
  Send,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
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
  const [voiceMode, setVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef(currentStepNumber);
  const lastAiTranscriptRef = useRef("");

  // Build voice cooking context (only once - step updates sent via sendContextUpdate)
  const systemInstruction = useMemo(() => 
    buildVoiceCookingContext({
      recipeTitle: recipe.title,
      currentStep: recipe.steps?.[0], // Start with first step
      currentStepNumber: 1,
      allSteps: recipe.steps || [],
      ingredients: recipe.ingredients,
      totalSteps,
    }),
    [recipe.title, recipe.steps, recipe.ingredients, totalSteps]
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
    sendText,
    sendContextUpdate,
    error: voiceError,
  } = useGeminiLive({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
    systemInstruction,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      try {
        await connect();
        setVoiceMode(true);
        
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
      }
    } else {
      // Exiting voice mode
      if (isRecording) {
        stopRecording();
      }
      disconnect();
      setVoiceMode(false);
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
          recipeTitle: recipe.title,
          currentStep: currentStep,
          currentStepNumber: currentStepNumber,
          allSteps: recipe.steps || [],
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
          
          {/* Voice Mode Toggle */}
          <div className="flex items-center gap-2">
            {voiceMode && (
              <div className="flex items-center gap-2">
                {isAISpeaking && (
                  <Badge variant="outline" className="border-green-500/50 text-green-400 animate-pulse">
                    <Volume2 className="h-3 w-3 mr-1" />
                    AI Speaking
                  </Badge>
                )}
                {isSpeaking && (
                  <Badge variant="outline" className="border-blue-500/50 text-blue-400 animate-pulse">
                    <Mic className="h-3 w-3 mr-1" />
                    You're Speaking
                  </Badge>
                )}
              </div>
            )}
            <Button
              onClick={handleToggleVoiceMode}
              variant={voiceMode ? "default" : "outline"}
              size="sm"
              className={voiceMode ? "bg-green-600 hover:bg-green-700" : "border-white/20 hover:bg-white/10"}
            >
              {voiceMode ? (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Voice On
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 mr-2" />
                  Voice Off
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
              <ChefHat className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              I'm here to help!
            </h3>
            <p className="text-sm text-gray-400 mb-4 max-w-xs">
              {voiceMode 
                ? "Voice mode is active! Click the microphone button below to start talking."
                : "Ask me questions about the current step, ingredients, or cooking techniques."
              }
            </p>

            {!voiceMode && (
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
            )}
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
      </CardContent>

      <div className="shrink-0 p-4 border-t border-white/10">
        {voiceMode ? (
          // Voice mode controls
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {/* Volume meters */}
              {isRecording && (
                <div className="flex-1 flex items-center gap-2">
                  <Mic className="h-4 w-4 text-blue-400" />
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-100"
                      style={{ width: `${inputVolume}%` }}
                    />
                  </div>
                </div>
              )}
              {isAISpeaking && (
                <div className="flex-1 flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-green-400" />
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
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
            >
              {isRecording ? (
                <>
                  <MicOff className="h-5 w-5 mr-2" />
                  Stop Talking
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Start Talking
                </>
              )}
            </Button>

            {voiceError && (
              <p className="text-xs text-red-400 text-center">{voiceError}</p>
            )}
          </div>
        ) : (
          // Text mode controls
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
        )}
      </div>
    </Card>
  );
}
