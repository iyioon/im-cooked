/**
 * Audio Recorder for Gemini Live API
 * Captures microphone input and converts to PCM16 format
 */

import { INPUT_AUDIO_CONFIG, type VolumeMeterData } from "./types";
import {
  float32ToInt16,
  arrayBufferToBase64,
  calculateRMS,
  rmsToPercent,
  isSpeaking,
  createLogger,
} from "./utils";

const logger = createLogger("AudioRecorder", true);

export interface AudioRecorderConfig {
  onAudioData?: (base64Audio: string) => void;
  onVolumeChange?: (data: VolumeMeterData) => void;
  chunkSize?: number; // in samples
}

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private config: AudioRecorderConfig;
  private isRecording = false;
  private volumeCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: AudioRecorderConfig = {}) {
    this.config = {
      chunkSize: 4096,
      ...config,
    };
  }

  /**
   * Start recording from microphone
   */
  async start(): Promise<void> {
    if (this.isRecording) {
      logger.warn("Already recording");
      return;
    }

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: INPUT_AUDIO_CONFIG.channels,
          sampleRate: INPUT_AUDIO_CONFIG.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: INPUT_AUDIO_CONFIG.sampleRate,
        latencyHint: "interactive",
      });

      // Create nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;

      // Use ScriptProcessorNode for audio processing
      // Note: AudioWorklet would be better but requires separate file
      this.processorNode = this.audioContext.createScriptProcessor(
        this.config.chunkSize,
        INPUT_AUDIO_CONFIG.channels,
        INPUT_AUDIO_CONFIG.channels
      );

      // Process audio data
      this.processorNode.onaudioprocess = (event) => {
        if (!this.isRecording) {
          return;
        }

        const inputBuffer = event.inputBuffer;
        const audioData = inputBuffer.getChannelData(0);

        // Convert Float32 to Int16 (PCM16)
        const pcm16 = float32ToInt16(audioData);

        // Convert to base64
        const base64Audio = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);

        // Send to callback
        if (this.config.onAudioData) {
          this.config.onAudioData(base64Audio);
        }
      };

      // Connect nodes
      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isRecording = true;

      // Start volume monitoring
      this.startVolumeMonitoring();

      logger.log("Recording started");
    } catch (error) {
      logger.error("Error starting recording:", error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  stop(): void {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;

    // Stop volume monitoring
    this.stopVolumeMonitoring();

    // Disconnect nodes
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    logger.log("Recording stopped");
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
      if (!this.analyserNode || !this.config.onVolumeChange) {
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

      this.config.onVolumeChange({ volume, isSpeaking: speaking });
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
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AudioRecorderConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
}
