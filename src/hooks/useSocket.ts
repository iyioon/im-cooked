"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "@/lib/chat-storage";
import { Recipe } from "@/types/recipe";
import { IntentDetectionResponse } from "@/types/recipe";

interface UseSocketOptions {
  sessionId: string;
  onMessage?: (message: Message) => void;
  onSearchResults?: (data: { recipes: Recipe[]; query: string; messageId: string }) => void;
  onSearchStatus?: (data: { status: string; message: string; messageId: string }) => void;
  onSearchError?: (data: { error: string; messageId: string }) => void;
  onIntentResult?: (data: { intent: IntentDetectionResponse; messageId: string }) => void;
  onIntentError?: (data: { error: string; messageId: string }) => void;
}

export function useSocket({
  sessionId,
  onMessage,
  onSearchResults,
  onSearchStatus,
  onSearchError,
  onIntentResult,
  onIntentError,
}: UseSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);
      socket.emit("join-session", sessionId);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    // Session event handlers
    socket.on("session-joined", (data) => {
      console.log("Joined session:", data);
    });

    // Chat message handlers
    socket.on("chat-message", (data) => {
      if (data.sessionId === sessionId && onMessage) {
        onMessage(data.message);
      }
    });

    // Recipe search handlers
    socket.on("search-results", (data) => {
      if (data.sessionId === sessionId && onSearchResults) {
        onSearchResults({
          recipes: data.recipes,
          query: data.query,
          messageId: data.messageId,
        });
      }
    });

    socket.on("search-status", (data) => {
      if (data.sessionId === sessionId && onSearchStatus) {
        onSearchStatus({
          status: data.status,
          message: data.message,
          messageId: data.messageId,
        });
      }
    });

    socket.on("search-error", (data) => {
      if (data.sessionId === sessionId && onSearchError) {
        onSearchError({
          error: data.error,
          messageId: data.messageId,
        });
      }
    });

    // Intent detection handlers
    socket.on("intent-result", (data) => {
      if (data.sessionId === sessionId && onIntentResult) {
        onIntentResult({
          intent: data.intent,
          messageId: data.messageId,
        });
      }
    });

    socket.on("intent-error", (data) => {
      if (data.sessionId === sessionId && onIntentError) {
        onIntentError({
          error: data.error,
          messageId: data.messageId,
        });
      }
    });

    // Cleanup on unmount
    return () => {
      socket.emit("leave-session", sessionId);
      socket.disconnect();
    };
  }, [sessionId, onMessage, onSearchResults, onSearchStatus, onSearchError, onIntentResult, onIntentError]);

  // Send chat message
  const sendMessage = useCallback(
    (message: Message) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("chat-message", {
          sessionId,
          message,
        });
      }
    },
    [sessionId]
  );

  // Search recipes via WebSocket
  const searchRecipes = useCallback(
    (query: string, messageId: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("search-recipes", {
          sessionId,
          query,
          messageId,
        });
      }
    },
    [sessionId]
  );

  // Detect intent via WebSocket
  const detectIntent = useCallback(
    (message: string, messageId: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("detect-intent", {
          sessionId,
          message,
          messageId,
        });
      }
    },
    [sessionId]
  );

  return {
    isConnected,
    sendMessage,
    searchRecipes,
    detectIntent,
    socket: socketRef.current,
  };
}
