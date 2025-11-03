"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChatSession,
  createSession,
  deleteSession,
  getOrCreateActiveSession,
  getSession,
  loadSessions,
  renameSession,
  setActiveSessionId,
  addMessageToSession,
  clearSessionMessages,
} from "@/lib/session-manager";
import { Message, migrateLegacyChatHistory } from "@/lib/chat-storage";

export function useSessionManager(userId?: string) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load sessions on mount
  useEffect(() => {
    const loadData = () => {
      try {
        // Check for legacy chat history and migrate if needed
        const legacyMessages = migrateLegacyChatHistory();

        let loadedSessions = loadSessions();

        // If we have legacy messages and no sessions, create a session with them
        if (legacyMessages && legacyMessages.length > 0 && loadedSessions.length === 0) {
          const migratedSession = createSession(userId, legacyMessages);
          loadedSessions = [migratedSession];
        }

        // If no sessions exist, create a default one
        if (loadedSessions.length === 0) {
          const defaultSession = getOrCreateActiveSession(userId);
          loadedSessions = [defaultSession];
        }

        setSessions(loadedSessions);

        // Get or create active session
        const active = getOrCreateActiveSession(userId);
        setActiveSession(active);
      } catch (error) {
        console.error("Failed to load sessions:", error);
        // Create a fallback session
        const fallbackSession = createSession(userId);
        setSessions([fallbackSession]);
        setActiveSession(fallbackSession);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId]);

  // Refresh sessions from storage
  const refreshSessions = useCallback(() => {
    const loadedSessions = loadSessions();
    setSessions(loadedSessions);

    // Update active session if it exists
    if (activeSession) {
      const updatedActive = getSession(activeSession.id);
      if (updatedActive) {
        setActiveSession(updatedActive);
      }
    }
  }, [activeSession]);

  // Create a new session
  const createNewSession = useCallback(() => {
    const newSession = createSession(userId);
    setSessions((prev) => [...prev, newSession]);
    setActiveSession(newSession);
    return newSession;
  }, [userId]);

  // Switch to a different session
  const switchSession = useCallback((sessionId: string) => {
    const session = getSession(sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setActiveSession(session);
    }
  }, []);

  // Delete a session
  const removeSession = useCallback(
    (sessionId: string) => {
      const success = deleteSession(sessionId);
      if (success) {
        const loadedSessions = loadSessions();
        setSessions(loadedSessions);

        // If we deleted the active session, switch to another or create new
        if (activeSession?.id === sessionId) {
          if (loadedSessions.length > 0) {
            switchSession(loadedSessions[0].id);
          } else {
            const newSession = createNewSession();
            setActiveSession(newSession);
          }
        }
      }
      return success;
    },
    [activeSession, switchSession, createNewSession]
  );

  // Rename a session
  const renameActiveSession = useCallback(
    (newName: string) => {
      if (!activeSession) return null;
      const updated = renameSession(activeSession.id, newName);
      if (updated) {
        setActiveSession(updated);
        refreshSessions();
      }
      return updated;
    },
    [activeSession, refreshSessions]
  );

  // Add message to active session
  const addMessage = useCallback(
    (message: Message) => {
      if (!activeSession) return null;
      const updated = addMessageToSession(activeSession.id, message);
      if (updated) {
        setActiveSession(updated);
        refreshSessions();
      }
      return updated;
    },
    [activeSession, refreshSessions]
  );

  // Clear messages in active session
  const clearMessages = useCallback(() => {
    if (!activeSession) return null;
    const updated = clearSessionMessages(activeSession.id);
    if (updated) {
      setActiveSession(updated);
      refreshSessions();
    }
    return updated;
  }, [activeSession, refreshSessions]);

  return {
    sessions,
    activeSession,
    isLoading,
    createNewSession,
    switchSession,
    removeSession,
    renameActiveSession,
    addMessage,
    clearMessages,
    refreshSessions,
  };
}
