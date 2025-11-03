"use client";

import { Recipe } from "@/types/recipe";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ChefHat, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeCardProps {
  recipe: Recipe;
  onViewRecipe?: (recipe: Recipe) => void;
  onSelectRecipe?: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, onViewRecipe, onSelectRecipe }: RecipeCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 h-[400px] flex flex-col",
        "bg-white/5 border-white/10 hover:border-blue-500/50",
        "hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20",
        "backdrop-blur-sm"
      )}
    >
      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Source Badge */}
        <Badge
          variant="secondary"
          className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white border-white/20"
        >
          {recipe.sourceName}
        </Badge>
      </div>

      {/* Content */}
      <CardContent className="flex-1 p-5 space-y-3">
        <h3 className="text-xl font-bold text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
          {recipe.title}
        </h3>
        
        <p className="text-sm text-gray-400 line-clamp-3">
          {recipe.description}
        </p>
      </CardContent>

      {/* Footer with Metadata */}
      <CardFooter className="p-5 pt-0 flex items-center justify-between gap-2 flex-wrap mb-3">
        {recipe.prepTime && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{recipe.prepTime}</span>
          </div>
        )}

        {recipe.cookTime && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <ChefHat className="h-3.5 w-3.5" />
            <span>{recipe.cookTime}</span>
          </div>
        )}

        {recipe.servings && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Users className="h-3.5 w-3.5" />
            <span>{recipe.servings}</span>
          </div>
        )}

        {recipe.difficulty && (
          <Badge
            variant="outline"
            className={cn(
              "text-xs border",
              recipe.difficulty === "Easy" && "border-green-500/50 text-green-400",
              recipe.difficulty === "Medium" && "border-yellow-500/50 text-yellow-400",
              recipe.difficulty === "Hard" && "border-red-500/50 text-red-400"
            )}
          >
            {recipe.difficulty}
          </Badge>
        )}
      </CardFooter>

      {/* Action Buttons */}
      <CardFooter className="p-5 pt-0 flex gap-2 mt-auto">
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewRecipe?.(recipe);
          }}
          className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20"
        >
          View
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onSelectRecipe?.(recipe);
          }}
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Select
        </Button>
      </CardFooter>
    </Card>
  );
}
