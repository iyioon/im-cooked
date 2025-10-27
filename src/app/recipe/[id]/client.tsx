"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeDetail } from "@/types/recipe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  ChefHat,
  Users,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

interface RecipeDetailClientProps {
  recipeId: string;
}

export function RecipeDetailClient({ recipeId }: RecipeDetailClientProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        console.error("Error fetching recipe:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    }

    fetchRecipe();
  }, [recipeId]);

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
                <CardTitle className="text-white">Ingredients</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-300">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Instructions & Nutrition */}
          <div className="md:col-span-2 space-y-8">
            {/* Instructions */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <p className="text-gray-300 pt-1">{instruction}</p>
                    </li>
                  ))}
                </ol>
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

            {/* Source Link */}
            <div className="flex justify-center">
              <Button
                onClick={() => window.open(recipe.sourceUrl, "_blank")}
                variant="outline"
                className="border-white/20 hover:bg-white/10 text-white"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Original Recipe on {recipe.sourceName}
              </Button>
            </div>
          </div>
        </div>
      </div>
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
