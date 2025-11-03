"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Extend Window interface for WebKit Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export function SpeechTranscript() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if Speech Recognition is supported
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (SpeechRecognition) {
      setIsSupported(true);

      // Initialize speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;

          if (result.isFinal) {
            final += transcriptText + " ";
          } else {
            interim += transcriptText;
          }
        }

        if (final) {
          setTranscript((prev) => prev + final);
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        
        // Handle recoverable errors by auto-restarting
        if (event.error === "network" || event.error === "no-speech" || event.error === "audio-capture") {
          setError(`Connection issue. Attempting to reconnect...`);
          setIsListening(false);
          
          // Clear any existing restart timeout
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          
          // Attempt to restart after a brief delay
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
                setError(null);
              } catch (err) {
                console.error("Failed to restart recognition:", err);
                setError("Failed to restart. Please try again manually.");
              }
            }
          }, 1000);
        } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Microphone access denied. Please allow microphone permissions.");
          setIsListening(false);
        } else {
          setError(`Error: ${event.error}`);
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      setError("Speech Recognition is not supported in your browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Error starting recognition:", err);
        setError("Failed to start speech recognition");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const clearTranscript = () => {
    setTranscript("");
    setInterimTranscript("");
  };

  if (!isSupported) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        <Card className="p-8 max-w-md mx-4">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Not Supported
          </h2>
          <p className="text-center text-muted-foreground">
            Speech Recognition is not supported in your browser. Please try
            Chrome, Edge, or Safari.
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
            Real-time Speech Transcript
          </h2>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isListening ? "bg-red-500 animate-pulse" : "bg-gray-400"
              }`}
            />
            <span className="text-sm font-medium">
              {isListening ? "Listening..." : "Not listening"}
            </span>
          </div>

          {/* Transcript display */}
          <div className="w-full min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-muted rounded-lg">
            {transcript || interimTranscript ? (
              <p className="text-lg leading-relaxed">
                {transcript}
                {interimTranscript && (
                  <span className="text-muted-foreground italic">
                    {interimTranscript}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-muted-foreground text-center italic">
                Start speaking to see your transcript here...
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="w-full p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-destructive text-sm text-center">{error}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-4 flex-wrap justify-center">
            {!isListening ? (
              <Button onClick={startListening} size="lg">
                Start Listening
              </Button>
            ) : (
              <Button onClick={stopListening} size="lg" variant="destructive">
                Stop Listening
              </Button>
            )}
            <Button
              onClick={clearTranscript}
              size="lg"
              variant="outline"
              disabled={!transcript && !interimTranscript}
            >
              Clear Transcript
            </Button>
          </div>

          {/* Instructions */}
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Click "Start Listening" and allow microphone access. Speak clearly
            into your microphone to see the transcript appear in real-time.
          </p>
        </div>
      </Card>
    </div>
  );
}
