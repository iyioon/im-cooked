"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeDetail, SubstitutionResponse } from "@/types/recipe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SubstitutionDialog } from "@/components/features/substitution/substitution-dialog";
import { useModifiedRecipe } from "@/hooks/useModifiedRecipe";
import { createCookingSession } from "@/lib/cooking-session-manager";
import {
  ArrowLeft,
  Clock,
  ChefHat,
  Users,
  ExternalLink,
  AlertCircle,
  Replace,
} from "lucide-react";

interface RecipeDetailClientProps {
  recipeId: string;
}

export function RecipeDetailClient({ recipeId }: RecipeDetailClientProps) {
  const router = useRouter();
  const { setRecipe: setContextRecipe, modifiedRecipe, clearModifications } = useModifiedRecipe();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Substitution state
  const [substitutionDialogOpen, setSubstitutionDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<string>("");
  const [modifiedIngredients, setModifiedIngredients] = useState<string[]>([]);
  const [modifiedInstructions, setModifiedInstructions] = useState<string[]>([]);
  const [substitutionWarnings, setSubstitutionWarnings] = useState<string[]>([]);

  useEffect(() => {
    async function fetchRecipe() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/recipes/${recipeId}`);

        if (!response.ok) {
          throw new Error("Failed to load recipe");
        }

        const data = await response.json();
        setRecipe(data);
        // Initialize context with fetched recipe
        setContextRecipe(data);
      } catch (err) {
        console.error("Error fetching recipe:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    }

    fetchRecipe();
  }, [recipeId, setContextRecipe]);

  const handleOpenSubstitution = (ingredient: string) => {
    setSelectedIngredient(ingredient);
    setSubstitutionDialogOpen(true);
  };

  const handleApplySubstitution = (substitutionResponse: SubstitutionResponse) => {
    if (substitutionResponse.modifiedRecipe) {
      setModifiedIngredients(substitutionResponse.modifiedRecipe.ingredients);

      // Apply instruction changes if any
      if (substitutionResponse.modifiedRecipe.instructionChanges && recipe) {
        const newInstructions = [...recipe.instructions];
        substitutionResponse.modifiedRecipe.instructionChanges.forEach((change) => {
          if (change.step >= 1 && change.step <= newInstructions.length) {
            newInstructions[change.step - 1] = change.modified;
          }
        });
        setModifiedInstructions(newInstructions);
      }

      // Store warnings
      if (substitutionResponse.modifiedRecipe.warnings) {
        setSubstitutionWarnings(substitutionResponse.modifiedRecipe.warnings);
      }
    }
  };

  const displayIngredients = modifiedIngredients.length > 0 ? modifiedIngredients : recipe?.ingredients || [];
  const displayInstructions = modifiedInstructions.length > 0 ? modifiedInstructions : recipe?.instructions || [];

  if (loading) {
    return <RecipeDetailLoading />;
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-red-500/10 border-red-500/20 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Failed to load recipe</h3>
              <p className="text-gray-400">{error || "Recipe not found"}</p>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="border-white/20 hover:bg-white/10 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Image */}
      <div className="relative h-96 w-full overflow-hidden">
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        {/* Back Button */}
        <Button
          onClick={() => router.push("/dashboard")}
          variant="outline"
          className="absolute top-6 left-6 border-white/20 hover:bg-white/10 text-white backdrop-blur-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              {recipe.title}
            </h1>
            <Badge
              variant="secondary"
              className="bg-white/10 backdrop-blur-sm text-white border-white/20 shrink-0"
            >
              {recipe.sourceName}
            </Badge>
          </div>

          <p className="text-lg text-gray-300 mb-6">{recipe.description}</p>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Button
              onClick={() => {
                // Use modified recipe if available, otherwise use original
                const recipeToUse = modifiedRecipe || recipe;
                if (recipeToUse) {
                  const session = createCookingSession(recipeToUse);
                  clearModifications(); // Reset context for next recipe
                  router.push(`/cooking-session/${recipe.id}?session=${session.id}`);
                }
              }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20"
            >
              <ChefHat className="mr-2 h-4 w-4" />
              Start Cooking Session
            </Button>
            <Button
              onClick={() => window.open(recipe.sourceUrl, "_blank")}
              variant="outline"
              className="border-white/20 hover:bg-white/10 text-white"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Original Recipe on {recipe.sourceName}
            </Button>
          </div>

          {/* Info Row */}
          <div className="flex flex-wrap gap-6">
            {recipe.prepTime && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Clock className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Prep Time</p>
                  <p className="text-sm font-medium text-white">{recipe.prepTime}</p>
                </div>
              </div>
            )}

            {recipe.cookTime && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <ChefHat className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cook Time</p>
                  <p className="text-sm font-medium text-white">{recipe.cookTime}</p>
                </div>
              </div>
            )}

            {recipe.servings && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 border border-pink-500/20">
                  <Users className="h-5 w-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Servings</p>
                  <p className="text-sm font-medium text-white">{recipe.servings}</p>
                </div>
              </div>
            )}

            {recipe.difficulty && (
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    recipe.difficulty === "Easy"
                      ? "bg-green-500/20 text-green-400 border-green-500/50"
                      : recipe.difficulty === "Medium"
                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                      : "bg-red-500/20 text-red-400 border-red-500/50"
                  }
                >
                  {recipe.difficulty}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div className="md:col-span-1">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm sticky top-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  Ingredients
                  {modifiedIngredients.length > 0 && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                      Modified
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Warnings */}
                {substitutionWarnings.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold">
                      <AlertCircle className="h-4 w-4" />
                      Important Notes
                    </div>
                    <ul className="text-xs text-yellow-300 space-y-1 ml-6">
                      {substitutionWarnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ingredients List */}
                <ul className="space-y-3">
                  {displayIngredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-300 group">
                      <Checkbox className="mt-1 border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                      <span className="text-sm flex-1">{ingredient}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenSubstitution(ingredient)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500/20 text-blue-400"
                        title="Substitute ingredient"
                      >
                        <Replace className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>

                {/* Reset Button */}
                {modifiedIngredients.length > 0 && (
                  <Button
                    onClick={() => {
                      setModifiedIngredients([]);
                      setModifiedInstructions([]);
                      setSubstitutionWarnings([]);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full border-white/20 hover:bg-white/10 text-white"
                  >
                    Reset to Original
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Instructions & Nutrition */}
          <div className="md:col-span-2 space-y-8">
            {/* Instructions */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  Instructions
                  {modifiedInstructions.length > 0 && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                      Modified
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recipe.steps && recipe.steps.length > 0 && modifiedInstructions.length === 0 ? (
                  // Enhanced steps with images (only show if not modified)
                  <div className="space-y-6">
                    {recipe.steps.map((step, index) => (
                      <div key={index} className="flex flex-col gap-4">
                        <div className="flex gap-4">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                            {step.stepNumber}
                          </span>
                          <p className="text-gray-300 pt-1">{step.text}</p>
                        </div>

                        {step.imageUrl && (
                          <div className="ml-12">
                            <img
                              src={step.imageUrl}
                              alt={step.caption || `Step ${step.stepNumber}`}
                              className="rounded-lg border border-white/10 w-full max-w-md object-cover"
                            />
                            {step.caption && (
                              <p className="text-sm text-gray-400 mt-2 italic">{step.caption}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Fallback to plain instructions or modified instructions
                  <ol className="space-y-4">
                    {displayInstructions.map((instruction, index) => (
                      <li key={index} className="flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                          {index + 1}
                        </span>
                        <p className="text-gray-300 pt-1">{instruction}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            {/* Nutrition */}
            {recipe.nutrition && (
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Nutrition Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recipe.nutrition.calories && (
                      <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-2xl font-bold text-white">
                          {recipe.nutrition.calories}
                        </p>
                        <p className="text-sm text-gray-400">Calories</p>
                      </div>
                    )}
                    {recipe.nutrition.protein && (
                      <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-2xl font-bold text-white">
                          {recipe.nutrition.protein}
                        </p>
                        <p className="text-sm text-gray-400">Protein</p>
                      </div>
                    )}
                    {recipe.nutrition.carbs && (
                      <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-2xl font-bold text-white">
                          {recipe.nutrition.carbs}
                        </p>
                        <p className="text-sm text-gray-400">Carbs</p>
                      </div>
                    )}
                    {recipe.nutrition.fat && (
                      <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-2xl font-bold text-white">
                          {recipe.nutrition.fat}
                        </p>
                        <p className="text-sm text-gray-400">Fat</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Substitution Dialog */}
      {recipe && (
        <SubstitutionDialog
          open={substitutionDialogOpen}
          onOpenChange={setSubstitutionDialogOpen}
          recipe={recipe}
          ingredient={selectedIngredient}
          onApplySubstitution={handleApplySubstitution}
        />
      )}
    </div>
  );
}

function RecipeDetailLoading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="animate-pulse">
        <div className="h-96 bg-white/10" />
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
          <div className="h-12 bg-white/10 rounded w-3/4" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 bg-white/10 rounded" />
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 bg-white/10 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
