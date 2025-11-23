/**
 * Type definitions for Gemini Live API
 * Based on Google's Multimodal Live API specification
 */

// Configuration types
export interface LiveConfig {
  model: string;
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    responseModalities?: string[];
  };
  tools?: Array<{
    functionDeclarations: FunctionDeclaration[];
  }>;
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// WebSocket message types
export interface SetupMessage {
  setup: LiveConfig;
}

export interface RealtimeInputMessage {
  realtimeInput: {
    mediaChunks: Array<{
      mimeType: string;
      data: string; // base64 encoded audio
    }>;
  };
}

export interface ClientContentMessage {
  clientContent: {
    turns: Array<{
      role: string;
      parts: Array<{ text: string }>;
    }>;
    turnComplete: boolean;
  };
}

export interface ToolResponseMessage {
  toolResponse: {
    functionResponses: Array<{
      id: string;
      name: string;
      response: Record<string, unknown>;
    }>;
  };
}

// Server response types
export interface ServerContentMessage {
  serverContent: {
    modelTurn?: {
      parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
        | { functionCall: { name: string; args: Record<string, unknown> } }
      >;
    };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
}

export interface SetupCompleteMessage {
  setupComplete: Record<string, never>;
}

export interface ToolCallMessage {
  toolCall: {
    functionCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  };
}

export interface ToolCallCancellationMessage {
  toolCallCancellation: {
    ids: string[];
  };
}

export type ServerMessage =
  | SetupCompleteMessage
  | ServerContentMessage
  | ToolCallMessage
  | ToolCallCancellationMessage;

// Audio configuration
export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export const INPUT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
};

export const OUTPUT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 24000,
  channels: 1,
  bitDepth: 16,
};

// Client event types
export interface GeminiLiveEvents {
  open: () => void;
  close: (event: CloseEvent) => void;
  error: (error: Error) => void;
  setupComplete: () => void;
  audio: (audioData: ArrayBuffer) => void;
  text: (text: string) => void;
  interrupted: () => void;
  turnComplete: () => void;
  functionCall: (call: { id: string; name: string; args: Record<string, unknown> }) => void;
}

// Connection state
export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

// Transcript entry
export interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  type: "text" | "audio";
}

// Volume meter data
export interface VolumeMeterData {
  volume: number; // 0-100
  isSpeaking: boolean;
}

// Model turn data (simplified from serverContent.modelTurn)
export interface ModelTurn {
  parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
    | { functionCall: { name: string; args: Record<string, unknown> } }
  >;
}

// Client configuration
export interface GeminiLiveConfig {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  tools?: any[];
}
