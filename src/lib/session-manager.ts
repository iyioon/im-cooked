/**
 * Multi-session state management system
 * Manages multiple chat sessions with localStorage persistence
 */

import { Message } from "./chat-storage";
import { STORAGE_LIMITS } from "./constants";

export interface ChatSession {
  id: string;
  name: string;
  userId?: string; // Optional user identifier
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  metadata?: {
    lastActivity?: Date;
    messageCount?: number;
    recipeCount?: number;
  };
}

const SESSIONS_STORAGE_KEY = "im-cooked-sessions";
const ACTIVE_SESSION_KEY = "im-cooked-active-session";

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a default session name based on timestamp
 */
export function generateSessionName(index: number = 0): string {
  const date = new Date();
  const timeStr = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return index > 0 ? `Chat ${index} - ${timeStr}` : `Chat - ${timeStr}`;
}

/**
 * Load all sessions from localStorage
 */
export function loadSessions(): ChatSession[] {
  try {
    const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return parsed.map((session: any) => ({
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      messages: session.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
      metadata: {
        ...session.metadata,
        lastActivity: session.metadata?.lastActivity
          ? new Date(session.metadata.lastActivity)
          : undefined,
      },
    }));
  } catch (error) {
    console.error("Failed to load sessions:", error);
    return [];
  }
}

/**
 * Save all sessions to localStorage
 */
export function saveSessions(sessions: ChatSession[]): void {
  try {
    // Limit number of sessions
    const sessionsToStore = sessions.slice(-STORAGE_LIMITS.MAX_SESSIONS);

    // Convert Date objects to ISO strings
    const serialized = sessionsToStore.map((session) => ({
      ...session,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messages: session.messages.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(),
      })),
      metadata: {
        ...session.metadata,
        lastActivity: session.metadata?.lastActivity?.toISOString(),
      },
    }));

    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error("Failed to save sessions:", error);
  }
}

/**
 * Get the active session ID
 */
export function getActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch (error) {
    console.error("Failed to get active session:", error);
    return null;
  }
}

/**
 * Set the active session ID
 */
export function setActiveSessionId(sessionId: string): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
  } catch (error) {
    console.error("Failed to set active session:", error);
  }
}

/**
 * Create a new session
 */
export function createSession(userId?: string, initialMessages: Message[] = []): ChatSession {
  const sessions = loadSessions();
  const sessionId = generateSessionId();

  const newSession: ChatSession = {
    id: sessionId,
    name: generateSessionName(sessions.length + 1),
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: initialMessages,
    metadata: {
      lastActivity: new Date(),
      messageCount: initialMessages.length,
      recipeCount: 0,
    },
  };

  sessions.push(newSession);
  saveSessions(sessions);
  setActiveSessionId(sessionId);

  return newSession;
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): ChatSession | null {
  const sessions = loadSessions();
  return sessions.find((s) => s.id === sessionId) || null;
}

/**
 * Update a session
 */
export function updateSession(
  sessionId: string,
  updates: Partial<ChatSession>
): ChatSession | null {
  const sessions = loadSessions();
  const sessionIndex = sessions.findIndex((s) => s.id === sessionId);

  if (sessionIndex === -1) return null;

  const updatedSession = {
    ...sessions[sessionIndex],
    ...updates,
    updatedAt: new Date(),
    metadata: {
      ...sessions[sessionIndex].metadata,
      ...updates.metadata,
      lastActivity: new Date(),
    },
  };

  sessions[sessionIndex] = updatedSession;
  saveSessions(sessions);

  return updatedSession;
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): boolean {
  const sessions = loadSessions();
  const filteredSessions = sessions.filter((s) => s.id !== sessionId);

  if (filteredSessions.length === sessions.length) return false;

  saveSessions(filteredSessions);

  // If deleted session was active, clear active session
  if (getActiveSessionId() === sessionId) {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }

  return true;
}

/**
 * Add a message to a session
 */
export function addMessageToSession(sessionId: string, message: Message): ChatSession | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const messages = [...session.messages, message];
  const recipeCount = (session.metadata?.recipeCount || 0) + (message.recipes?.length || 0);

  return updateSession(sessionId, {
    messages,
    metadata: {
      ...session.metadata,
      messageCount: messages.length,
      recipeCount,
    },
  });
}

/**
 * Update session name
 */
export function renameSession(sessionId: string, newName: string): ChatSession | null {
  return updateSession(sessionId, { name: newName });
}

/**
 * Get all sessions for a user
 */
export function getUserSessions(userId?: string): ChatSession[] {
  const sessions = loadSessions();
  if (!userId) return sessions;
  return sessions.filter((s) => s.userId === userId);
}

/**
 * Clear all messages in a session
 */
export function clearSessionMessages(sessionId: string): ChatSession | null {
  return updateSession(sessionId, {
    messages: [],
    metadata: {
      messageCount: 0,
      recipeCount: 0,
    },
  });
}

/**
 * Get or create the current active session
 */
export function getOrCreateActiveSession(userId?: string): ChatSession {
  const activeSessionId = getActiveSessionId();

  if (activeSessionId) {
    const session = getSession(activeSessionId);
    if (session) return session;
  }

  // No active session, create one
  return createSession(userId);
}

/**
 * Export session data as JSON
 */
export function exportSession(sessionId: string): string | null {
  const session = getSession(sessionId);
  if (!session) return null;
  return JSON.stringify(session, null, 2);
}

/**
 * Import session data from JSON
 */
export function importSession(jsonData: string): ChatSession | null {
  try {
    const session = JSON.parse(jsonData);
    const sessions = loadSessions();

    // Generate new ID to avoid conflicts
    const newSession: ChatSession = {
      ...session,
      id: generateSessionId(),
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(),
      messages: session.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    };

    sessions.push(newSession);
    saveSessions(sessions);

    return newSession;
  } catch (error) {
    console.error("Failed to import session:", error);
    return null;
  }
}
