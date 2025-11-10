"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGeminiLive } from "@/hooks/useGeminiLive";

export function SpeechTranscript() {
  const {
    // Connection state
    connectionState,
    isConnected,
    error,

    // Recording state
    isRecording,
    isSpeaking,

    // Playback state
    isAIPlaying,
    isAISpeaking,

    // Volume meters
    inputVolume,
    outputVolume,

    // Transcripts
    userTranscript,
    aiTranscript,

    // Controls
    connect,
    disconnect,
    startRecording,
    stopRecording,
    interrupt,
  } = useGeminiLive({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
    systemInstruction:
      "You are a helpful AI assistant. Respond to the user's questions in a friendly and conversational manner. Keep your responses concise and natural.",
  });

  // Auto-connect on mount
  useEffect(() => {
    connect().catch((err) => {
      console.error("Failed to connect:", err);
    });

    return () => {
      disconnect();
    };
  }, []);

  const handleStartConversation = async () => {
    if (!isConnected) {
      await connect();
    }
    await startRecording();
  };

  const handleStopConversation = () => {
    stopRecording();
  };

  const handleClearTranscript = () => {
    disconnect();
    // Reconnect to clear state
    connect().catch((err) => {
      console.error("Failed to reconnect:", err);
    });
  };

  const handleInterrupt = () => {
    interrupt();
  };

  // Check if API key is configured
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        <Card className="p-8 max-w-md mx-4">
          <h2 className="text-xl font-semibold mb-4 text-center">
            API Key Missing
          </h2>
          <p className="text-center text-muted-foreground mb-4">
            Please configure your Gemini API key in the environment variables.
          </p>
          <p className="text-sm text-muted-foreground text-center">
            Add <code className="bg-muted px-2 py-1 rounded">NEXT_PUBLIC_GEMINI_API_KEY</code> to your{" "}
            <code className="bg-muted px-2 py-1 rounded">.env.local</code> file.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="flex flex-col items-center gap-6">
          {/* Title */}
          <h2 className="text-2xl font-semibold text-center">
            Gemini Live Voice Conversation
          </h2>

          {/* Connection status */}
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <div
              className={`w-3 h-3 rounded-full ${
                connectionState === "connected"
                  ? "bg-green-500"
                  : connectionState === "connecting"
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-gray-400"
              }`}
              aria-hidden="true"
            />
            <span className="text-sm font-medium capitalize">
              {connectionState}
            </span>
          </div>

          {/* Voice activity indicators */}
          <div className="w-full grid grid-cols-2 gap-4">
            {/* User input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">You</span>
                <span
                  className={`text-xs ${
                    isSpeaking ? "text-green-500" : "text-muted-foreground"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {isSpeaking ? "Speaking" : "Silent"}
                </span>
              </div>
              <div
                className="h-2 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={inputVolume}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Your microphone volume"
              >
                <div
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${inputVolume}%` }}
                />
              </div>
            </div>

            {/* AI output */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AI</span>
                <span
                  className={`text-xs ${
                    isAISpeaking ? "text-blue-500" : "text-muted-foreground"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {isAISpeaking ? "Speaking" : "Silent"}
                </span>
              </div>
              <div
                className="h-2 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={outputVolume}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="AI speech volume"
              >
                <div
                  className="h-full bg-blue-500 transition-all duration-100"
                  style={{ width: `${outputVolume}%` }}
                />
              </div>
            </div>
          </div>

          {/* Transcript display */}
          <div className="w-full min-h-[300px] max-h-[400px] overflow-y-auto space-y-4" role="log" aria-live="polite" aria-label="Conversation transcript">
            {/* User transcript */}
            {userTranscript && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-xs font-medium text-green-600 mb-2">
                  You
                </div>
                <p className="text-sm leading-relaxed">{userTranscript}</p>
              </div>
            )}

            {/* AI transcript */}
            {aiTranscript && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-xs font-medium text-blue-600 mb-2 flex items-center justify-between">
                  <span>AI Assistant</span>
                  {isAIPlaying && (
                    <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
                      Speaking...
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{aiTranscript}</p>
              </div>
            )}

            {/* Empty state */}
            {!userTranscript && !aiTranscript && (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground text-center italic">
                  Start a conversation to see transcripts here...
                </p>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="w-full p-4 bg-destructive/10 border border-destructive rounded-lg" role="alert" aria-live="assertive">
              <p className="text-destructive text-sm text-center">{error}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-4 flex-wrap justify-center">
            {!isRecording ? (
              <Button
                onClick={handleStartConversation}
                size="lg"
                disabled={connectionState === "connecting"}
                aria-label="Start voice conversation with AI"
              >
                Start Conversation
              </Button>
            ) : (
              <Button
                onClick={handleStopConversation}
                size="lg"
                variant="destructive"
                aria-label="Stop recording your voice"
              >
                Stop Recording
              </Button>
            )}

            {isAIPlaying && (
              <Button onClick={handleInterrupt} size="lg" variant="outline" aria-label="Interrupt AI speech">
                Interrupt AI
              </Button>
            )}

            <Button
              onClick={handleClearTranscript}
              size="lg"
              variant="outline"
              disabled={!userTranscript && !aiTranscript}
              aria-label="Clear conversation and reset"
            >
              Clear & Reset
            </Button>
          </div>

          {/* Instructions */}
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Click "Start Conversation" to begin. The AI will listen and respond
            with voice. You can interrupt the AI at any time by clicking
            "Interrupt AI".
          </p>
        </div>
      </Card>
    </div>
  );
}
