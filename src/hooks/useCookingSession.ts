import { useState, useEffect, useCallback } from "react";
import { CookingSession, CookingSessionMessage, RecipeDetail } from "@/types/recipe";
import {
  createCookingSession,
  loadCookingSession,
  saveCookingSession,
  updateCurrentStep as updateStep,
  markStepComplete as markComplete,
  markStepIncomplete as markIncomplete,
  addStepNote as addNote,
  toggleIngredientsCollapsed as toggleIngredients,
  addChatMessage as addMessage,
} from "@/lib/cooking-session-manager";

export function useCookingSession(sessionId: string | null) {
  const [session, setSession] = useState<CookingSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const loadedSession = loadCookingSession(sessionId);
    setSession(loadedSession);
    setLoading(false);
  }, [sessionId]);

  // Create a new session
  const createSession = useCallback((recipe: RecipeDetail) => {
    const newSession = createCookingSession(recipe);
    setSession(newSession);
    return newSession;
  }, []);

  // Update current step
  const goToStep = useCallback(
    (stepNumber: number) => {
      if (!session) return;
      const updated = updateStep(session.id, stepNumber);
      if (updated) setSession(updated);
    },
    [session]
  );

  // Navigate to next step (auto-marks current step as complete)
  const goToNextStep = useCallback(() => {
    if (!session) return;

    // Mark current step as complete before moving forward
    let updatedSession = session;
    if (!session.completedSteps.includes(session.currentStep)) {
      const withComplete = markComplete(session.id, session.currentStep);
      if (withComplete) updatedSession = withComplete;
    }

    // Move to next step
    const updated = updateStep(updatedSession.id, updatedSession.currentStep + 1);
    if (updated) setSession(updated);
  }, [session]);

  // Navigate to previous step (auto-marks new current step as incomplete)
  const goToPreviousStep = useCallback(() => {
    if (!session) return;
    if (session.currentStep > 1) {
      const newStepNumber = session.currentStep - 1;

      // Move to previous step
      const updated = updateStep(session.id, newStepNumber);

      // Mark the new current step (previous step) as incomplete
      if (updated && updated.completedSteps.includes(newStepNumber)) {
        const withIncomplete = markIncomplete(updated.id, newStepNumber);
        if (withIncomplete) {
          setSession(withIncomplete);
          return;
        }
      }

      if (updated) setSession(updated);
    }
  }, [session]);

  // Toggle step completion
  const toggleStepComplete = useCallback(
    (stepNumber: number) => {
      if (!session) return;

      const isCompleted = session.completedSteps.includes(stepNumber);
      const updated = isCompleted
        ? markIncomplete(session.id, stepNumber)
        : markComplete(session.id, stepNumber);

      if (updated) setSession(updated);
    },
    [session]
  );

  // Add note to current step
  const addNoteToStep = useCallback(
    (stepNumber: number, note: string) => {
      if (!session) return;
      const updated = addNote(session.id, stepNumber, note);
      if (updated) setSession(updated);
    },
    [session]
  );

  // Toggle ingredients panel
  const toggleIngredientsPanel = useCallback(() => {
    if (!session) return;
    const updated = toggleIngredients(session.id);
    if (updated) setSession(updated);
  }, [session]);

  // Add chat message
  const addChatMessage = useCallback(
    (message: CookingSessionMessage) => {
      if (!session) return;
      const updated = addMessage(session.id, message);
      if (updated) setSession(updated);
    },
    [session]
  );

  // Manual save (for optimistic updates)
  const saveSession = useCallback(() => {
    if (session) {
      saveCookingSession(session);
    }
  }, [session]);

  return {
    session,
    loading,
    createSession,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    toggleStepComplete,
    addNoteToStep,
    toggleIngredientsPanel,
    addChatMessage,
    saveSession,
  };
}
