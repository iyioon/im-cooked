/**
 * Audio Streamer for Gemini Live API
 * Handles playback of PCM16 audio received from Gemini
 */

import {
  OUTPUT_AUDIO_CONFIG,
  type VolumeMeterData,
} from "./types";
import {
  int16ToFloat32,
  calculateRMS,
  rmsToPercent,
  isSpeaking,
  createLogger,
} from "./utils";

const logger = createLogger("AudioStreamer", true);

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private volumeCallback: ((data: VolumeMeterData) => void) | null = null;
  private analyserNode: AnalyserNode | null = null;
  private volumeCheckInterval: NodeJS.Timeout | null = null;

  constructor() {}

  /**
   * Initialize audio context and analyzer
   */
  async initialize(): Promise<void> {
    if (this.audioContext) {
      return;
    }

    this.audioContext = new AudioContext({
      sampleRate: OUTPUT_AUDIO_CONFIG.sampleRate,
      latencyHint: "interactive",
    });

    // Create analyzer for volume monitoring
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.connect(this.audioContext.destination);

    // Start volume monitoring
    this.startVolumeMonitoring();

    logger.log("Audio streamer initialized");
  }

  /**
   * Add audio data to playback queue
   */
  addAudioData(pcm16Data: ArrayBuffer): void {
    if (!this.audioContext) {
      logger.warn("Audio context not initialized");
      return;
    }

    try {
      // Convert PCM16 to Float32
      const int16Array = new Int16Array(pcm16Data);
      const float32Array = int16ToFloat32(int16Array);

      // Create audio buffer
      const audioBuffer = this.audioContext.createBuffer(
        OUTPUT_AUDIO_CONFIG.channels,
        float32Array.length,
        OUTPUT_AUDIO_CONFIG.sampleRate
      );

      // Copy data to buffer
      const channelData = audioBuffer.getChannelData(0);
      channelData.set(float32Array);

      // Add to queue
      this.audioQueue.push(audioBuffer);

      // Start playback if not already playing
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (error) {
      logger.error("Error adding audio data:", error);
    }
  }

  /**
   * Play next audio buffer in queue
   */
  private playNext(): void {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    if (!this.audioContext || !this.analyserNode) {
      logger.warn("Audio context or analyser not initialized");
      return;
    }

    this.isPlaying = true;
    const buffer = this.audioQueue.shift()!;

    // Create source node
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.analyserNode);

    // Play next buffer when this one ends
    source.onended = () => {
      this.currentSource = null;
      this.playNext();
    };

    source.start(0);
    this.currentSource = source;
  }

  /**
   * Stop playback and clear queue
   */
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (error) {
        // Ignore errors from stopping already-stopped sources
      }
      this.currentSource = null;
    }

    this.audioQueue = [];
    this.isPlaying = false;

    logger.log("Playback stopped");
  }

  /**
   * Set volume meter callback
   */
  setVolumeCallback(callback: (data: VolumeMeterData) => void): void {
    this.volumeCallback = callback;
  }

  /**
   * Start volume monitoring
   */
  private startVolumeMonitoring(): void {
    if (!this.analyserNode) {
      return;
    }

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    this.volumeCheckInterval = setInterval(() => {
      if (!this.analyserNode) {
        return;
      }

      this.analyserNode.getByteTimeDomainData(dataArray);

      // Convert to Float32 for RMS calculation
      const float32Array = new Float32Array(bufferLength);
      for (let i = 0; i < bufferLength; i++) {
        float32Array[i] = (dataArray[i] - 128) / 128.0;
      }

      const rms = calculateRMS(float32Array);
      const volume = rmsToPercent(rms);
      const speaking = isSpeaking(rms);

      if (this.volumeCallback) {
        this.volumeCallback({ volume, isSpeaking: speaking });
      }
    }, 100);
  }

  /**
   * Stop volume monitoring
   */
  private stopVolumeMonitoring(): void {
    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.audioQueue.length;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Close audio context and cleanup
   */
  async close(): Promise<void> {
    this.stop();
    this.stopVolumeMonitoring();

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.analyserNode = null;
    this.volumeCallback = null;

    logger.log("Audio streamer closed");
  }
}
