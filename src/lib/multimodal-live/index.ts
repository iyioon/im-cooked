/**
 * Gemini Live API - Multimodal Live Client Library
 *
 * This library provides a complete implementation of Google's Gemini Live API
 * for bidirectional voice conversations with AI.
 */

export { GeminiLiveClient } from "./client";
export { AudioStreamer } from "./audio-streamer";
export { AudioRecorder } from "./audio-recorder";
export type {
  ConnectionState,
  VolumeMeterData,
  ModelTurn,
  GeminiLiveConfig,
  LiveConfig,
  SetupMessage,
  RealtimeInputMessage,
  ServerMessage,
  ServerContentMessage,
  ToolCallMessage,
  ToolResponseMessage,
} from "./types";
export {
  base64ToArrayBuffer,
  arrayBufferToBase64,
  float32ToInt16,
  int16ToFloat32,
  calculateRMS,
  rmsToDb,
  rmsToPercent,
  isSpeaking,
  createAudioContext,
} from "./utils";
