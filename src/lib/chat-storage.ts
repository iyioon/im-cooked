/**
 * Client-side storage utilities for persisting chat history
 * Updated to support multi-session management
 */

import { Recipe } from "@/types/recipe";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  recipes?: Recipe[];
  isRecipeSearch?: boolean;
  query?: string;
  streaming?: boolean; // For real-time message streaming
}

const STORAGE_KEY = "im-cooked-chat-history"; // Legacy key for backward compatibility
const MAX_MESSAGES = 100; // Limit to prevent storage bloat

/**
 * Save messages to localStorage (legacy function for backward compatibility)
 * @deprecated Use session-manager.ts for multi-session support
 */
export function saveChatHistory(messages: Message[]): void {
  try {
    // Limit number of messages to store
    const messagesToStore = messages.slice(-MAX_MESSAGES);

    // Convert Date objects to ISO strings for storage
    const serialized = messagesToStore.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error("Failed to save chat history:", error);
  }
}

/**
 * Load messages from localStorage (legacy function for backward compatibility)
 * @deprecated Use session-manager.ts for multi-session support
 */
export function loadChatHistory(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Convert ISO strings back to Date objects
    return parsed.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return [];
  }
}

/**
 * Clear chat history (legacy function for backward compatibility)
 * @deprecated Use session-manager.ts for multi-session support
 */
export function clearChatHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear chat history:", error);
  }
}

/**
 * Migrate legacy chat history to new session-based system
 */
export function migrateLegacyChatHistory(): Message[] | null {
  try {
    const legacy = loadChatHistory();
    if (legacy.length > 0) {
      // Clear legacy storage after migration
      clearChatHistory();
      return legacy;
    }
    return null;
  } catch (error) {
    console.error("Failed to migrate legacy chat history:", error);
    return null;
  }
}
