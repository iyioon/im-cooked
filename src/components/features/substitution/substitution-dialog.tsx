"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SubstitutionResponse, RecipeDetail, UserPreferences, IngredientSubstitution } from "@/types/recipe";
import { loadPreferences } from "@/lib/preferences-manager";
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

interface SubstitutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: RecipeDetail;
  ingredient: string;
  onApplySubstitution?: (modifiedRecipe: SubstitutionResponse) => void;
  cookingSessionId?: string;
}

export function SubstitutionDialog({
  open,
  onOpenChange,
  recipe,
  ingredient,
  onApplySubstitution,
  cookingSessionId,
}: SubstitutionDialogProps) {
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [applyingSubstitution, setApplyingSubstitution] = useState(false);
  const [suggestions, setSuggestions] = useState<SubstitutionResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Load preferences when dialog opens
  useEffect(() => {
    if (open) {
      const prefs = loadPreferences();
      setPreferences(prefs);
    }
  }, [open]);

  const handleGetSuggestions = async () => {
    setLoading(true);
    setError(null);
    setSuggestions(null);

    try {
      const response = await fetch("/api/recipes/substitute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          originalIngredient: ingredient,
          userInput: userInput || undefined,
          recipe: recipe,
          preferences: preferences,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get suggestions");
      }

      const data: SubstitutionResponse = await response.json();
      setSuggestions(data);
    } catch (err) {
      console.error("Error getting substitutions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to get suggestions"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (suggestion: IngredientSubstitution) => {
    setApplyingSubstitution(true);
    setError(null);

    try {
      // Call the apply-substitution endpoint to regenerate the recipe
      const response = await fetch("/api/recipes/apply-substitution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeTitle: recipe.title,
          recipe: recipe,
          selectedSubstitution: suggestion,
          preferences: preferences,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to apply substitution");
      }

      const appliedRecipeData = await response.json();

      // If cooking session ID is provided, save the substitution record and update the modified recipe
      if (cookingSessionId) {
        // Build the modified recipe with updated ingredients and instructions
        // Apply instruction changes to instructions array
        const updatedInstructions = appliedRecipeData.instructionChanges
          ? recipe.instructions.map((instr, idx) => {
              const change = appliedRecipeData.instructionChanges.find(
                (c: any) => c.step === idx + 1
              );
              return change ? change.modified : instr;
            })
          : recipe.instructions;

        const modifiedRecipe: RecipeDetail = {
          ...recipe,
          ingredients: appliedRecipeData.ingredients || recipe.ingredients,
          instructions: updatedInstructions,
          // Rebuild steps array by matching original text with new instructions
          // This handles cases where steps were extracted from DOM and may not align with instructions array
          ...(recipe.steps && {
            steps: recipe.steps.map((step) => {
              // Find the original instruction at this position
              const originalInstruction = recipe.instructions[step.stepNumber - 1];

              // Find if this instruction was changed by matching the original text
              if (originalInstruction && appliedRecipeData.instructionChanges) {
                const change = appliedRecipeData.instructionChanges.find(
                  (c: any) => c.original === originalInstruction
                );
                if (change) {
                  return { ...step, text: change.modified };
                }
              }

              // If no match found by text, try by step index as fallback
              if (appliedRecipeData.instructionChanges) {
                const changeByStep = appliedRecipeData.instructionChanges.find(
                  (c: any) => c.step === step.stepNumber
                );
                if (changeByStep) {
                  return { ...step, text: changeByStep.modified };
                }
              }

              return step;
            }),
          }),
        };

        await fetch("/api/cooking-session/add-substitution", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: cookingSessionId,
            substitution: {
              id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              original: {
                ingredient: suggestion.original.ingredient,
                quantity: suggestion.original.quantity,
                unit: suggestion.original.unit,
              },
              substitute: {
                ingredient: suggestion.substitute.ingredient,
                quantity: suggestion.substitute.quantity,
                unit: suggestion.substitute.unit,
              },
              reason: suggestion.reason,
              impacts: suggestion.impact,
              appliedAt: new Date(),
            },
            modifiedRecipe: modifiedRecipe,  // Include the modified recipe
          }),
        });
      }

      // Call the callback with the modified recipe
      if (onApplySubstitution) {
        onApplySubstitution({
          dishContext: suggestions?.dishContext || { dishType: "unknown" },
          suggestions: [suggestion],
          modifiedRecipe: {
            ingredients: appliedRecipeData.ingredients || recipe.ingredients,
            instructionChanges: appliedRecipeData.instructionChanges,
            warnings: appliedRecipeData.warnings,
          },
        });
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Error applying substitution:", err);
      setError(
        err instanceof Error ? err.message : "Failed to apply substitution"
      );
    } finally {
      setApplyingSubstitution(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            Substitute Ingredient
          </DialogTitle>
          <DialogDescription>
            Get AI-powered suggestions for substituting{" "}
            <span className="text-white font-medium">{ingredient}</span> in{" "}
            {recipe.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Input */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">
              What would you like to use instead? (optional)
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., almond flour, coconut oil, plant-based milk"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                disabled={loading}
              />
              <Button
                onClick={handleGetSuggestions}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Get Suggestions
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Leave empty to get general substitution recommendations
            </p>
          </div>

          {/* Error */}
          {error && (
            <Card className="bg-red-500/10 border-red-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {suggestions && (
            <div className="space-y-4">
              {/* Dish Context */}
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-4">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Dish Analysis
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                      {suggestions.dishContext.dishType}
                    </Badge>
                    {suggestions.dishContext.cuisine && (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                        {suggestions.dishContext.cuisine}
                      </Badge>
                    )}
                    {suggestions.dishContext.cookingMethod && (
                      <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/50">
                        {suggestions.dishContext.cookingMethod}
                      </Badge>
                    )}
                    {suggestions.dishContext.dietaryTags?.map((tag) => (
                      <Badge
                        key={tag}
                        className="bg-green-500/20 text-green-400 border-green-500/50"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Substitution Suggestions */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">
                  Suggested Substitutions
                </h3>
                {suggestions.suggestions.map((suggestion, index) => (
                  <Card
                    key={index}
                    className="bg-white/5 border-white/10 hover:border-blue-500/30 transition-colors"
                  >
                    <CardContent className="pt-4 space-y-3">
                      {/* Substitution */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            <span className="font-medium text-white">
                              {suggestion.substitute.quantity &&
                                `${suggestion.substitute.quantity} `}
                              {suggestion.substitute.unit &&
                                `${suggestion.substitute.unit} `}
                              {suggestion.substitute.ingredient}
                              {suggestion.substitute.preparation &&
                                ` (${suggestion.substitute.preparation})`}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300">
                            {suggestion.reason}
                          </p>
                        </div>
                      </div>

                      {/* Impact */}
                      {suggestion.impact && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {suggestion.impact.taste && (
                            <div className="bg-white/5 p-2 rounded">
                              <span className="text-gray-500">Taste: </span>
                              <span className="text-gray-300">
                                {suggestion.impact.taste}
                              </span>
                            </div>
                          )}
                          {suggestion.impact.texture && (
                            <div className="bg-white/5 p-2 rounded">
                              <span className="text-gray-500">Texture: </span>
                              <span className="text-gray-300">
                                {suggestion.impact.texture}
                              </span>
                            </div>
                          )}
                          {suggestion.impact.nutrition && (
                            <div className="bg-white/5 p-2 rounded">
                              <span className="text-gray-500">Nutrition: </span>
                              <span className="text-gray-300">
                                {suggestion.impact.nutrition}
                              </span>
                            </div>
                          )}
                          {suggestion.impact.cookingTime && (
                            <div className="bg-white/5 p-2 rounded">
                              <span className="text-gray-500">Cook Time: </span>
                              <span className="text-gray-300">
                                {suggestion.impact.cookingTime}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Apply Button */}
                      <Button
                        onClick={() => handleApply(suggestion)}
                        disabled={applyingSubstitution}
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {applyingSubstitution ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          "Use This Substitution"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-white/20 hover:bg-white/10 text-white"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
