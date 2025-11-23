"use client";

import React, { createContext, useCallback, useState } from "react";
import { RecipeDetail, SubstitutionRecord } from "@/types/recipe";

export interface ModifiedRecipeContextType {
  // State
  recipeId: string | null;
  originalRecipe: RecipeDetail | null;
  modifiedRecipe: RecipeDetail | null;
  appliedSubstitutions: SubstitutionRecord[];
  isDirty: boolean;

  // Actions
  setRecipe: (recipe: RecipeDetail) => void;
  applySubstitution: (updatedRecipe: RecipeDetail, substitution: SubstitutionRecord) => void;
  undoSubstitution: (substitutionId: string) => void;
  revertToOriginal: () => void;
  updateRecipeField: (field: keyof RecipeDetail, value: any) => void;
  clearModifications: () => void;
}

export const ModifiedRecipeContext = createContext<ModifiedRecipeContextType | undefined>(
  undefined
);

export interface ModifiedRecipeProviderProps {
  children: React.ReactNode;
}

/**
 * Provider for tracking recipe modifications across the application
 * Allows modifications made in View page or sidebar to persist to cooking session
 */
export function ModifiedRecipeProvider({ children }: ModifiedRecipeProviderProps) {
  const [originalRecipe, setOriginalRecipe] = useState<RecipeDetail | null>(null);
  const [modifiedRecipe, setModifiedRecipe] = useState<RecipeDetail | null>(null);
  const [appliedSubstitutions, setAppliedSubstitutions] = useState<SubstitutionRecord[]>([]);

  const isDirty =
    modifiedRecipe !== null && originalRecipe !== null
      ? JSON.stringify(modifiedRecipe) !== JSON.stringify(originalRecipe)
      : false;

  // Initialize with a recipe
  const handleSetRecipe = useCallback((recipe: RecipeDetail) => {
    setOriginalRecipe(recipe);
    setModifiedRecipe({ ...recipe }); // Deep copy to allow mutations
    setAppliedSubstitutions([]);
  }, []);

  // Apply a substitution and update the modified recipe
  const handleApplySubstitution = useCallback(
    (updatedRecipe: RecipeDetail, substitution: SubstitutionRecord) => {
      // Ensure both instructions and steps arrays stay in sync
      // Steps can be extracted from DOM and may not perfectly align with instructions array
      const normalizedRecipe = {
        ...updatedRecipe,
        // Sync steps with updated instructions
        ...(updatedRecipe.steps &&
          updatedRecipe.instructions && {
            steps: updatedRecipe.steps.map((step) => {
              // Try to get the instruction at this step number
              const correspondingInstruction = updatedRecipe.instructions[step.stepNumber - 1];

              if (correspondingInstruction) {
                return {
                  ...step,
                  text: correspondingInstruction,
                };
              }

              return step;
            }),
          }),
      };
      setModifiedRecipe(normalizedRecipe);
      setAppliedSubstitutions((prev) => [...prev, substitution]);
    },
    []
  );

  // Undo a specific substitution
  const handleUndoSubstitution = useCallback(
    (substitutionId: string) => {
      setAppliedSubstitutions((prev) => prev.filter((sub) => sub.id !== substitutionId));

      // Rebuild modified recipe by removing the undone substitution
      // In practice, you'd want to regenerate the recipe without that substitution
      // For now, we just remove it from the tracking
      if (originalRecipe && modifiedRecipe) {
        const remainingSubs = appliedSubstitutions.filter((sub) => sub.id !== substitutionId);
        // If no more substitutions, revert to original
        if (remainingSubs.length === 0) {
          setModifiedRecipe({ ...originalRecipe });
        }
      }
    },
    [originalRecipe, modifiedRecipe, appliedSubstitutions]
  );

  // Revert all modifications back to original
  const handleRevertToOriginal = useCallback(() => {
    if (originalRecipe) {
      setModifiedRecipe({ ...originalRecipe });
      setAppliedSubstitutions([]);
    }
  }, [originalRecipe]);

  // Update a specific field in the modified recipe
  const handleUpdateRecipeField = useCallback((field: keyof RecipeDetail, value: any) => {
    setModifiedRecipe((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  }, []);

  // Clear all modifications (useful when starting a new session)
  const handleClearModifications = useCallback(() => {
    setOriginalRecipe(null);
    setModifiedRecipe(null);
    setAppliedSubstitutions([]);
  }, []);

  const value: ModifiedRecipeContextType = {
    recipeId: originalRecipe?.id || null,
    originalRecipe,
    modifiedRecipe,
    appliedSubstitutions,
    isDirty,
    setRecipe: handleSetRecipe,
    applySubstitution: handleApplySubstitution,
    undoSubstitution: handleUndoSubstitution,
    revertToOriginal: handleRevertToOriginal,
    updateRecipeField: handleUpdateRecipeField,
    clearModifications: handleClearModifications,
  };

  return <ModifiedRecipeContext.Provider value={value}>{children}</ModifiedRecipeContext.Provider>;
}
