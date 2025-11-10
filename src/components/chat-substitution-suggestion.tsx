"use client";

import React, { useState } from "react";
import { IngredientSubstitution } from "@/types/recipe";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ChatSubstitutionSuggestionProps {
  originalIngredient: string;
  suggestions: IngredientSubstitution[];
  explanation: string;
  onApply: (suggestion: IngredientSubstitution) => Promise<void>;
  onDismiss?: () => void;
}

export function ChatSubstitutionSuggestion({
  originalIngredient,
  suggestions,
  explanation,
  onApply,
  onDismiss,
}: ChatSubstitutionSuggestionProps) {
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [appliedId, setAppliedId] = useState<number | null>(null);

  const handleApply = async (suggestion: IngredientSubstitution, index: number) => {
    try {
      setApplyingId(index);
      await onApply(suggestion);
      setAppliedId(index);
      setTimeout(() => setAppliedId(null), 2000); // Show success for 2 seconds
    } catch (error) {
      console.error("Error applying substitution:", error);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="space-y-4" role="region" aria-label={`Substitution suggestions for ${originalIngredient}`}>
      {/* Explanation */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-gray-300">{explanation}</p>
      </div>

      {/* Suggestions */}
      <div className="space-y-3" role="list">
        {suggestions.map((suggestion, index) => (
          <Card
            key={index}
            className="bg-white/5 border-white/10 hover:border-blue-500/30 transition-colors"
            role="listitem"
            aria-label={`Suggestion ${index + 1}: Use ${suggestion.substitute.ingredient} instead of ${originalIngredient}`}
          >
            <CardContent className="pt-4 space-y-3">
              {/* Substitution */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
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
                  <p className="text-sm text-gray-400">{suggestion.reason}</p>
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
                onClick={() => handleApply(suggestion, index)}
                disabled={applyingId === index}
                size="sm"
                className={`w-full text-white transition-all ${
                  appliedId === index
                    ? "bg-green-600 hover:bg-green-600"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                aria-label={`Use ${suggestion.substitute.ingredient} as substitution for ${originalIngredient}`}
                aria-busy={applyingId === index}
              >
                {applyingId === index ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Applying...
                  </>
                ) : appliedId === index ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Applied!
                  </>
                ) : (
                  "Use This Substitution"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dismiss Button */}
      {onDismiss && (
        <Button
          onClick={onDismiss}
          variant="outline"
          size="sm"
          className="w-full border-white/20 hover:bg-white/10 text-gray-400"
          aria-label="Dismiss substitution suggestions"
        >
          Dismiss
        </Button>
      )}
    </div>
  );
}
