/**
 * Utility functions for Gemini Live API
 */

import type { ServerMessage, ServerContentMessage } from "./types";

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Type guard for ServerContentMessage
 */
export function isServerContentMessage(msg: ServerMessage): msg is ServerContentMessage {
  return "serverContent" in msg;
}

/**
 * Type guard for SetupCompleteMessage
 */
export function isSetupCompleteMessage(msg: ServerMessage): boolean {
  return "setupComplete" in msg;
}

/**
 * Type guard for ToolCallMessage
 */
export function isToolCallMessage(msg: ServerMessage): boolean {
  return "toolCall" in msg;
}

/**
 * Initialize audio context with proper browser support
 */
export function createAudioContext(sampleRate?: number): AudioContext {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("AudioContext not supported in this browser");
  }

  return new AudioContextClass({
    sampleRate: sampleRate || 24000,
    latencyHint: "interactive",
  });
}

/**
 * Convert Float32Array to Int16Array (PCM16)
 */
export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

/**
 * Convert Int16Array to Float32Array
 */
export function int16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32Array;
}

/**
 * Calculate RMS (Root Mean Square) volume from audio buffer
 */
export function calculateRMS(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

/**
 * Convert RMS to decibels
 */
export function rmsToDb(rms: number): number {
  if (rms === 0) return -Infinity;
  return 20 * Math.log10(rms);
}

/**
 * Convert RMS to percentage (0-100)
 */
export function rmsToPercent(rms: number): number {
  const db = rmsToDb(rms);
  // Map -60dB to 0%, 0dB to 100%
  const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
  return normalized * 100;
}

/**
 * Check if user is speaking based on volume threshold
 */
export function isSpeaking(rms: number, threshold = 0.01): boolean {
  return rms > threshold;
}

/**
 * Resample audio buffer to target sample rate
 */
export function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      (audioBuffer.duration * targetSampleRate) | 0,
      targetSampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    offlineContext
      .startRendering()
      .then((resampled) => resolve(resampled))
      .catch((err) => reject(err));
  });
}

/**
 * Create a simple logger with optional debug mode
 */
export function createLogger(namespace: string, debug = false) {
  return {
    log: (...args: any[]) => {
      if (debug) {
        console.log(`[${namespace}]`, ...args);
      }
    },
    warn: (...args: any[]) => {
      console.warn(`[${namespace}]`, ...args);
    },
    error: (...args: any[]) => {
      console.error(`[${namespace}]`, ...args);
    },
  };
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
