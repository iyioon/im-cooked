import { CookingSession, CookingSessionMessage, RecipeDetail, SubstitutionRecord } from "@/types/recipe";

const COOKING_SESSIONS_KEY = "im-cooked-cooking-sessions";
const MAX_SESSIONS = 10; // Keep last 10 sessions

/**
 * Create a new cooking session
 */
export function createCookingSession(recipe: RecipeDetail): CookingSession {
  const session: CookingSession = {
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    recipeId: recipe.id,
    recipeTitle: recipe.title,
    currentStep: 1,
    completedSteps: [],
    startedAt: new Date(),
    lastActiveAt: new Date(),
    notes: {},
    ingredientsCollapsed: false,
    messages: [],
    appliedSubstitutions: [],
  };

  // Save to localStorage
  saveCookingSession(session);

  return session;
}

/**
 * Load all cooking sessions from localStorage
 */
export function loadAllCookingSessions(): CookingSession[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(COOKING_SESSIONS_KEY);
    if (!stored) return [];

    const sessions = JSON.parse(stored) as CookingSession[];

    // Parse dates
    return sessions.map(session => ({
      ...session,
      startedAt: new Date(session.startedAt),
      lastActiveAt: new Date(session.lastActiveAt),
      messages: session.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
      appliedSubstitutions: (session.appliedSubstitutions || []).map(sub => ({
        ...sub,
        appliedAt: new Date(sub.appliedAt),
      })),
    }));
  } catch (error) {
    console.error("Failed to load cooking sessions:", error);
    return [];
  }
}

/**
 * Load a specific cooking session by ID
 */
export function loadCookingSession(sessionId: string): CookingSession | null {
  const sessions = loadAllCookingSessions();
  return sessions.find(s => s.id === sessionId) || null;
}

/**
 * Save a cooking session to localStorage
 */
export function saveCookingSession(session: CookingSession): void {
  if (typeof window === "undefined") return;

  try {
    const sessions = loadAllCookingSessions();

    // Update or add session
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    // Keep only the most recent sessions
    const sortedSessions = sessions
      .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime())
      .slice(0, MAX_SESSIONS);

    localStorage.setItem(COOKING_SESSIONS_KEY, JSON.stringify(sortedSessions));
  } catch (error) {
    console.error("Failed to save cooking session:", error);
  }
}

/**
 * Delete a cooking session
 */
export function deleteCookingSession(sessionId: string): void {
  if (typeof window === "undefined") return;

  try {
    const sessions = loadAllCookingSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(COOKING_SESSIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete cooking session:", error);
  }
}

/**
 * Update current step
 */
export function updateCurrentStep(
  sessionId: string,
  stepNumber: number
): CookingSession | null {
  const session = loadCookingSession(sessionId);
  if (!session) return null;

  session.currentStep = stepNumber;
  session.lastActiveAt = new Date();
  saveCookingSession(session);

  return session;
}

/**
 * Mark a step as completed
 */
export function markStepComplete(
  sessionId: string,
  stepNumber: number
): CookingSession | null {
  const session = loadCookingSession(sessionId);
  if (!session) return null;

  if (!session.completedSteps.includes(stepNumber)) {
    session.completedSteps.push(stepNumber);
  }
  session.lastActiveAt = new Date();
  saveCookingSession(session);

  return session;
}

/**
 * Mark a step as incomplete
 */
export function markStepIncomplete(
  sessionId: string,
  stepNumber: number
): CookingSession | null {
  const session = loadCookingSession(sessionId);
  if (!session) return null;

  session.completedSteps = session.completedSteps.filter(s => s !== stepNumber);
  session.lastActiveAt = new Date();
  saveCookingSession(session);

  return session;
}

/**
 * Add or update a note for a step
 */
export function addStepNote(
  sessionId: string,
  stepNumber: number,
  note: string
): CookingSession | null {
  const session = loadCookingSession(sessionId);
  if (!session) return null;

  session.notes[stepNumber] = note;
  session.lastActiveAt = new Date();
  saveCookingSession(session);

  return session;
}

/**
 * Toggle ingredients panel collapsed state
 */
export function toggleIngredientsCollapsed(
  sessionId: string
): CookingSession | null {
  const session = loadCookingSession(sessionId);
  if (!session) return null;

  session.ingredientsCollapsed = !session.ingredientsCollapsed;
  session.lastActiveAt = new Date();
  saveCookingSession(session);

  return session;
}

/**
 * Add a chat message to the session
 */
export function addChatMessage(
  sessionId: string,
  message: CookingSessionMessage
): CookingSession | null {
  const session = loadCookingSession(sessionId);
  if (!session) return null;

  session.messages.push(message);
  session.lastActiveAt = new Date();
  saveCookingSession(session);

  return session;
}

/**
 * Get active (recent) cooking sessions
 */
export function getActiveCookingSessions(maxAgeHours: number = 24): CookingSession[] {
  const sessions = loadAllCookingSessions();
  const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

  return sessions.filter(session =>
    session.lastActiveAt.getTime() > cutoffTime
  );
}

/**
 * Clear all cooking sessions
 */
export function clearAllCookingSessions(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(COOKING_SESSIONS_KEY);
}

/**
 * Add a substitution record to the session
 */
export function addSubstitutionToSession(
  sessionId: string,
  substitution: SubstitutionRecord
): CookingSession | null {
  const session = loadCookingSession(sessionId);
  if (!session) return null;

  session.appliedSubstitutions.push(substitution);
  session.lastActiveAt = new Date();
  saveCookingSession(session);

  return session;
}
