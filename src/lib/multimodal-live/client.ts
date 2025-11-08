/**
 * Gemini Live API Client
 * Manages WebSocket connection and bidirectional communication
 * 
 * Supported Models for Live API (use with v1alpha):
 * - models/gemini-2.5-flash-native-audio-preview-09-2025 (Default - native audio support)
 * - models/gemini-2.0-flash-exp (Alternative - widely tested)
 * - models/gemini-live-2.5-flash-preview (Alternative)
 * - models/gemini-2.5-flash-lite-preview-06-17 (Alternative - lightweight)
 * 
 * IMPORTANT: Use v1alpha API version for Live API, not v1beta
 * IMPORTANT: Model names must include the "models/" prefix
 */

import EventEmitter from "eventemitter3";
import type {
  LiveConfig,
  ServerMessage,
  ServerContentMessage,
  SetupMessage,
  RealtimeInputMessage,
  ClientContentMessage,
  ToolResponseMessage,
  GeminiLiveEvents,
  ConnectionState,
} from "./types";
import {
  isServerContentMessage,
  isSetupCompleteMessage,
  isToolCallMessage,
  createLogger,
} from "./utils";

const logger = createLogger("GeminiLiveClient", true);

export interface GeminiLiveClientConfig {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  tools?: any[];
  debug?: boolean;
}

export class GeminiLiveClient extends EventEmitter<GeminiLiveEvents> {
  private ws: WebSocket | null = null;
  private config: GeminiLiveClientConfig;
  private connectionState: ConnectionState = "disconnected";

  constructor(config: GeminiLiveClientConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to Gemini Live API
   */
  async connect(liveConfig?: Partial<LiveConfig>): Promise<void> {
    if (this.connectionState === "connected" || this.connectionState === "connecting") {
      logger.warn("Already connected or connecting");
      return;
    }

    this.connectionState = "connecting";
    logger.log("Attempting to connect to Gemini Live API...");

    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.config.apiKey}`;

    return new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          logger.log("WebSocket connected");
          this.connectionState = "connected";

          // Send setup message with verified model
          const setupMessage: SetupMessage = {
            setup: {
              // Hard-coded to use native audio model
              model: "models/gemini-2.5-flash-native-audio-preview-09-2025",
              ...(this.config.systemInstruction && {
                systemInstruction: { parts: [{ text: this.config.systemInstruction }] }
              }),
              ...(liveConfig?.generationConfig && { generationConfig: liveConfig.generationConfig }),
              ...(this.config.tools && { tools: this.config.tools }),
            },
          };

          logger.log("Sending setup message:", JSON.stringify(setupMessage, null, 2));
          this.send(setupMessage);
          this.emit("open");
          resolve();
        };

        this.ws.onmessage = async (event) => {
          let textData: string;
          
          // Log the actual type for debugging
          logger.log("Received message type:", typeof event.data);
          logger.log("Is Blob:", event.data instanceof Blob);
          logger.log("Is ArrayBuffer:", event.data instanceof ArrayBuffer);
          
          if (typeof event.data === "string") {
            textData = event.data;
          } else if (event.data instanceof Blob) {
            // Handle binary message (Blob)
            try {
              textData = await event.data.text();
            } catch (error) {
              logger.error("Error reading Blob message:", error);
              this.emit("error", new Error("Failed to read binary message"));
              return;
            }
          } else if (event.data instanceof ArrayBuffer) {
            // Handle ArrayBuffer
            textData = new TextDecoder().decode(event.data);
          } else {
            logger.error("Unsupported message format:", typeof event.data, event.data);
            return;
          }

          this.handleMessage(textData);
        };

        this.ws.onerror = (event) => {
          logger.error("WebSocket error:", event);
          this.connectionState = "error";
          this.emit("error", new Error("WebSocket connection error"));
          reject(new Error("WebSocket connection error"));
        };

        this.ws.onclose = (event) => {
          logger.log("WebSocket closed:", event.code, event.reason);
          this.connectionState = "disconnected";
          this.emit("close", event);
          
          if (event.code !== 1000) {
            reject(new Error(`WebSocket closed with code ${event.code}: ${event.reason}`));
          }
        };
      } catch (error) {
        logger.error("Connection error:", error);
        this.connectionState = "error";
        this.emit("error", error instanceof Error ? error : new Error("Connection failed"));
        reject(error);
      }
    });
  }

  /**
   * Disconnect from Gemini Live API
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.connectionState = "disconnected";
  }

  /**
   * Send audio data to Gemini
   */
  sendAudio(audioBase64: string): void {
    if (!this.isConnected()) {
      logger.warn("Cannot send audio: not connected");
      return;
    }

    const message: RealtimeInputMessage = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: "audio/pcm;rate=16000",
            data: audioBase64,
          },
        ],
      },
    };

    this.send(message);
  }

  /**
   * Send text message to Gemini
   */
  sendText(text: string, turnComplete = true): void {
    if (!this.isConnected()) {
      logger.warn("Cannot send text: not connected");
      return;
    }

    const message: ClientContentMessage = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete,
      },
    };

    this.send(message);
  }

  /**
   * Send tool response to Gemini
   */
  sendToolResponse(
    functionResponses: Array<{
      id: string;
      name: string;
      response: Record<string, unknown>;
    }>
  ): void {
    if (!this.isConnected()) {
      logger.warn("Cannot send tool response: not connected");
      return;
    }

    const message: ToolResponseMessage = {
      toolResponse: {
        functionResponses,
      },
    };

    this.send(message);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === "connected" && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      logger.log("Attempting to parse message, length:", data.length);
      logger.log("First 100 chars:", data.substring(0, 100));
      
      const message = JSON.parse(data) as ServerMessage;
      
      logger.log("Parsed message type:", Object.keys(message)[0]);

      if (isSetupCompleteMessage(message)) {
        logger.log("Setup complete");
        this.emit("setupComplete");
      } else if (isServerContentMessage(message)) {
        this.handleServerContent(message);
      } else if (isToolCallMessage(message)) {
        // This is the correct format with proper IDs for tool responses
        const toolCallMsg = message as any;
        if (toolCallMsg.toolCall?.functionCalls) {
          toolCallMsg.toolCall.functionCalls.forEach((call: any) => {
            logger.log("Tool call received with ID:", call.id);
            this.emit("functionCall", {
              id: call.id,
              name: call.name,
              args: call.args,
            });
          });
        }
      }
    } catch (error) {
      logger.error("Error parsing message:", error);
      logger.error("Failed data type:", typeof data);
      logger.error("Failed data value (first 500 chars):", data.substring(0, 500));
      this.emit("error", error instanceof Error ? error : new Error("Message parse error"));
    }
  }

  /**
   * Handle server content messages (audio, text, etc.)
   */
  private handleServerContent(message: ServerContentMessage): void {
    const { serverContent } = message;

    // Handle interruption
    if (serverContent.interrupted) {
      logger.log("Turn interrupted");
      this.emit("interrupted");
      return;
    }

    // Handle model turn parts
    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if ("text" in part && part.text) {
          logger.log("Received text:", part.text);
          this.emit("text", part.text);
        } else if ("inlineData" in part && part.inlineData) {
          // Audio data
          const { mimeType, data } = part.inlineData;
          if (mimeType.startsWith("audio/")) {
            logger.log("Received audio chunk");
            // Convert base64 to ArrayBuffer
            const binaryString = atob(data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            this.emit("audio", bytes.buffer);
          }
        } else if ("functionCall" in part && part.functionCall) {
          // Function calls in modelTurn.parts don't have IDs
          // These are handled separately via toolCall messages which include proper IDs
          logger.log("Function call in modelTurn (ignoring, will be handled via toolCall message):", part.functionCall);
        }
      }
    }

    // Handle turn complete
    if (serverContent.turnComplete) {
      logger.log("Turn complete");
      this.emit("turnComplete");
    }
  }

  /**
   * Send message through WebSocket
   */
  private send(message: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      logger.warn("Cannot send message: WebSocket not ready");
    }
  }

}
