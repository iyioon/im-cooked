/**
 * React hook for Gemini Live API integration
 * Provides voice conversation capabilities with bidirectional streaming
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { GeminiLiveClient } from "@/lib/multimodal-live/client";
import { AudioStreamer } from "@/lib/multimodal-live/audio-streamer";
import { AudioRecorder } from "@/lib/multimodal-live/audio-recorder";
import type {
  ConnectionState,
  VolumeMeterData,
  ModelTurn,
} from "@/lib/multimodal-live/types";

export interface UseGeminiLiveConfig {
  apiKey: string;
  systemInstruction?: string;
  tools?: any[];
  autoConnect?: boolean;
}

export interface FunctionCallData {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface UseGeminiLiveReturn {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;
  error: string | null;

  // Recording state
  isRecording: boolean;
  isSpeaking: boolean;

  // Playback state
  isAIPlaying: boolean;
  isAISpeaking: boolean;

  // Volume meters
  inputVolume: number;
  outputVolume: number;

  // Transcripts
  userTranscript: string;
  aiTranscript: string;
  currentTurn: ModelTurn | null;

  // Controls
  connect: () => Promise<void>;
  disconnect: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  sendText: (text: string) => void;
  sendContextUpdate: (text: string) => void;
  interrupt: () => void;

  // Function calling
  onFunctionCall: (handler: (call: FunctionCallData) => void) => void;
  sendToolResponse: (
    functionResponses: Array<{
      id: string;
      name: string;
      response: Record<string, unknown>;
    }>
  ) => void;
}

export function useGeminiLive(
  config: UseGeminiLiveConfig
): UseGeminiLiveReturn {
  // Refs for clients (persistent across renders)
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);

  // Connection state
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Playback state
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  // Volume meters
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);

  // Transcripts
  const [userTranscript, setUserTranscript] = useState("");
  const [aiTranscript, setAiTranscript] = useState("");
  const [currentTurn, setCurrentTurn] = useState<ModelTurn | null>(null);

  /**
   * Initialize clients
   */
  useEffect(() => {
    clientRef.current = new GeminiLiveClient({
      apiKey: config.apiKey,
      systemInstruction: config.systemInstruction,
      tools: config.tools,
    });

    streamerRef.current = new AudioStreamer();
    recorderRef.current = new AudioRecorder();

    return () => {
      // Cleanup on unmount
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      if (streamerRef.current) {
        streamerRef.current.close();
      }
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
    };
  }, [config.apiKey, config.systemInstruction, config.tools]);

  /**
   * Setup event listeners
   */
  useEffect(() => {
    const client = clientRef.current;
    const streamer = streamerRef.current;

    if (!client || !streamer) return;

    // Connection events
    const handleOpen = () => {
      setConnectionState("connected");
    };

    const handleClose = () => {
      setConnectionState("disconnected");
      setIsAIPlaying(false);
      setIsAISpeaking(false);
    };

    const handleError = (err: Error) => {
      setError(err.message);
      setConnectionState("error");
      console.error("Gemini Live error:", err);
    };

    // Audio events
    const handleAudio = (data: ArrayBuffer) => {
      streamer.addAudioData(data);
      setIsAIPlaying(true);
    };

    // Text events
    const handleText = (text: string) => {
      setAiTranscript((prev) => prev + text);
    };

    // Turn events
    const handleTurnComplete = () => {
      setIsAIPlaying(false);
      setIsAISpeaking(false);
    };

    const handleInterrupted = () => {
      streamer.stop();
      setIsAIPlaying(false);
      setIsAISpeaking(false);
      setAiTranscript("");
    };

    // Setup events
    const handleSetupComplete = () => {
      console.log("Gemini Live setup complete");
    };

    // Register all listeners
    client.on("open", handleOpen);
    client.on("close", handleClose);
    client.on("error", handleError);
    client.on("audio", handleAudio);
    client.on("text", handleText);
    client.on("turnComplete", handleTurnComplete);
    client.on("interrupted", handleInterrupted);
    client.on("setupComplete", handleSetupComplete);

    // Setup volume meters
    streamer.setVolumeCallback((data: VolumeMeterData) => {
      setOutputVolume(data.volume);
      setIsAISpeaking(data.isSpeaking);
    });

    // Cleanup
    return () => {
      client.off("open", handleOpen);
      client.off("close", handleClose);
      client.off("error", handleError);
      client.off("audio", handleAudio);
      client.off("text", handleText);
      client.off("turnComplete", handleTurnComplete);
      client.off("interrupted", handleInterrupted);
      client.off("setupComplete", handleSetupComplete);
    };
  }, []);

  /**
   * Connect to Gemini Live API
   */
  const connect = useCallback(async () => {
    const client = clientRef.current;
    const streamer = streamerRef.current;

    if (!client || !streamer) {
      throw new Error("Clients not initialized");
    }

    try {
      setError(null);
      await streamer.initialize();
      await client.connect({
        generationConfig: {
          responseModalities: ["audio"],
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Disconnect from Gemini Live API
   */
  const disconnect = useCallback(() => {
    const client = clientRef.current;
    const streamer = streamerRef.current;
    const recorder = recorderRef.current;

    if (recorder) {
      recorder.stop();
      setIsRecording(false);
    }

    if (streamer) {
      streamer.stop();
    }

    if (client) {
      client.disconnect();
    }

    setUserTranscript("");
    setAiTranscript("");
    setCurrentTurn(null);
  }, []);

  /**
   * Start recording user audio
   */
  const startRecording = useCallback(async () => {
    const client = clientRef.current;
    const recorder = recorderRef.current;

    if (!client || !recorder) {
      throw new Error("Clients not initialized");
    }

    if (!client.isConnected()) {
      throw new Error("Not connected to Gemini Live");
    }

    try {
      // Configure recorder to send audio to client
      recorder.updateConfig({
        onAudioData: (base64Audio: string) => {
          client.sendAudio(base64Audio);
        },
        onVolumeChange: (data: VolumeMeterData) => {
          setInputVolume(data.volume);
          setIsSpeaking(data.isSpeaking);
        },
      });

      await recorder.start();
      setIsRecording(true);
      setUserTranscript("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Stop recording user audio
   */
  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;

    if (recorder) {
      recorder.stop();
      setIsRecording(false);
      setIsSpeaking(false);
      setInputVolume(0);
    }
  }, []);

  /**
   * Send text message to AI
   */
  const sendText = useCallback(
    (text: string) => {
      const client = clientRef.current;

      if (!client) {
        throw new Error("Client not initialized");
      }

      if (!client.isConnected()) {
        throw new Error("Not connected to Gemini Live");
      }

      client.sendText(text);

      setUserTranscript((prev) => prev + text);
      setAiTranscript(""); // Clear AI transcript for new response
    },
    []
  );

  /**
   * Send silent context update to AI (doesn't appear in transcripts)
   */
  const sendContextUpdate = useCallback(
    (text: string) => {
      const client = clientRef.current;

      if (!client) {
        console.warn("Cannot send context update: client not initialized");
        return;
      }

      if (!client.isConnected()) {
        console.warn("Cannot send context update: not connected to Gemini Live");
        return;
      }

      try {
        // Send as incomplete turn so AI doesn't respond immediately
        client.sendText(text, false);
      } catch (err) {
        console.error("Error sending context update:", err);
      }
    },
    []
  );

  /**
   * Interrupt AI mid-response
   */
  const interrupt = useCallback(() => {
    const streamer = streamerRef.current;

    if (streamer) {
      streamer.stop();
      setIsAIPlaying(false);
      setIsAISpeaking(false);
    }
  }, []);

  /**
   * Register a function call handler
   */
  const onFunctionCall = useCallback((handler: (call: FunctionCallData) => void) => {
    const client = clientRef.current;
    if (!client) {
      console.warn("Cannot register function call handler: client not initialized");
      return;
    }

    client.on("functionCall", handler);
  }, []);

  /**
   * Send tool response back to AI
   */
  const sendToolResponse = useCallback(
    (
      functionResponses: Array<{
        id: string;
        name: string;
        response: Record<string, unknown>;
      }>
    ) => {
      const client = clientRef.current;

      if (!client) {
        throw new Error("Client not initialized");
      }

      if (!client.isConnected()) {
        throw new Error("Not connected to Gemini Live");
      }

      client.sendToolResponse(functionResponses);
    },
    []
  );

  /**
   * Auto-connect if configured
   */
  useEffect(() => {
    if (config.autoConnect) {
      connect().catch((err) => {
        console.error("Auto-connect failed:", err);
      });
    }
  }, [config.autoConnect, connect]);

  return {
    // Connection state
    connectionState,
    isConnected: connectionState === "connected",
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
    currentTurn,

    // Controls
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendText,
    sendContextUpdate,
    interrupt,

    // Function calling
    onFunctionCall,
    sendToolResponse,
  };
}
