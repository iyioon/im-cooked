import { useContext } from "react";
import { ModifiedRecipeContext, ModifiedRecipeContextType } from "@/contexts/ModifiedRecipeContext";

/**
 * Hook to access and manage modified recipes
 * Provides access to the modified recipe state and all modification actions
 *
 * @throws Error if used outside of ModifiedRecipeProvider
 */
export function useModifiedRecipe(): ModifiedRecipeContextType {
  const context = useContext(ModifiedRecipeContext);

  if (!context) {
    throw new Error("useModifiedRecipe must be used within a ModifiedRecipeProvider");
  }

  return context;
}
