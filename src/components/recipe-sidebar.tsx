'use client';

import React, { useState } from 'react';
import { RecipeDetailWithContext } from '@/types/recipe';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChefHat,
  Clock,
  Users,
  Flame,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
  RotateCcw,
  Replace,
  ChevronLeft,
} from 'lucide-react';
import Image from 'next/image';
import { SubstitutionDialog } from './substitution-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface RecipeSidebarProps {
  recipe: RecipeDetailWithContext | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
  onStartCooking: () => void;
  onIngredientModified: (modifiedRecipe: RecipeDetailWithContext) => void;
}

export function RecipeSidebar({
  recipe,
  isExpanded,
  onToggleExpand,
  onClose,
  onStartCooking,
  onIngredientModified,
}: RecipeSidebarProps) {
  const [expandedSection, setExpandedSection] = useState<
    'ingredients' | 'instructions' | null
  >('ingredients');
  const [substitutionDialogOpen, setSubstitutionDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

  if (!recipe) return null;

  const hasModifications =
    recipe.modifications.substitutions.length > 0 ||
    recipe.modifications.ingredientEdits.length > 0;

  const toggleSection = (section: 'ingredients' | 'instructions') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSubstitutionClick = (ingredient: string) => {
    setSelectedIngredient(ingredient);
    setSubstitutionDialogOpen(true);
  };

  const handleResetRecipe = () => {
    const resetRecipe: RecipeDetailWithContext = {
      ...recipe,
      current: { ...recipe.original },
      modifications: {
        substitutions: [],
        ingredientEdits: [],
        warnings: [],
      },
      metadata: {
        ...recipe.metadata,
        lastModifiedAt: new Date(),
      },
    };
    onIngredientModified(resetRecipe);
  };


  const handleApplySubstitution = (substitutionResponse: any) => {
    // Convert SubstitutionResponse to RecipeDetailWithContext
    const modifiedRecipe: RecipeDetailWithContext = {
      ...recipe,
      current: {
        ...recipe.current,
        ingredients: substitutionResponse.modifiedRecipe?.ingredients || recipe.current.ingredients,
      },
      modifications: {
        ...recipe.modifications,
        warnings: [
          ...recipe.modifications.warnings,
          ...(substitutionResponse.modifiedRecipe?.warnings || []),
        ],
      },
      metadata: {
        ...recipe.metadata,
        lastModifiedAt: new Date(),
      },
    };
    onIngredientModified(modifiedRecipe);
    setSubstitutionDialogOpen(false);
    setSelectedIngredient(null);
  };

  if (!recipe) return null;

  return (
    <>
      {/* Sidebar Container - Split view on right side */}
      <div
        className={cn(
          'relative bg-gradient-to-b from-white/5 to-white/[0.02] border-l border-white/10 overflow-hidden transition-all duration-300 ease-in-out flex flex-col',
          isExpanded ? 'w-96' : 'w-16'
        )}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {/* Recipe Header */}
          <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
            {isExpanded ? (
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">
                      {recipe.current.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      from <span className="text-gray-300">{recipe.current.sourceName}</span>
                    </p>
                    {hasModifications && (
                      <Badge className="mt-2 bg-blue-500/20 text-blue-300 border-blue-500/50 text-xs">
                        Modified
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={onToggleExpand}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Collapse"
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-400 hover:text-white" />
                    </button>
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Close recipe"
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-white" />
                    </button>
                  </div>
                </div>
                <Button
                  onClick={onStartCooking}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold h-9 text-sm"
                >
                  Start Cooking Session
                </Button>
              </div>
            ) : (
              <div className="p-2 flex justify-center">
                <button
                  onClick={onToggleExpand}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Expand"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-400 hover:text-white rotate-180" />
                </button>
              </div>
            )}
          </div>

          {/* Scrollable Content */}
          {isExpanded && (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {/* Recipe Image */}
            {recipe.current.imageUrl && (
              <div className="relative w-full aspect-video bg-white/5">
                <Image
                  src={recipe.current.imageUrl}
                  alt={recipe.current.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Recipe Meta */}
            <div className="p-4 space-y-3 border-b border-white/10">
              {/* Cooking Times and Servings */}
              <div className="grid grid-cols-2 gap-2">
                {recipe.current.prepTime && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span>Prep: {recipe.current.prepTime}</span>
                  </div>
                )}
                {recipe.current.cookTime && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span>Cook: {recipe.current.cookTime}</span>
                  </div>
                )}
                {recipe.current.servings && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Users className="h-4 w-4 text-green-400" />
                    <span>{recipe.current.servings}</span>
                  </div>
                )}
                {recipe.current.difficulty && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-yellow-500/10 text-yellow-200 border-yellow-500/20"
                    >
                      {recipe.current.difficulty}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="text-xs text-gray-400 space-y-1">
                {recipe.current.ingredients && (
                  <p>
                    <span className="text-gray-300 font-medium">
                      {recipe.current.ingredients.length}
                    </span>{' '}
                    ingredients
                  </p>
                )}
                {recipe.current.instructions && (
                  <p>
                    <span className="text-gray-300 font-medium">
                      {recipe.current.instructions.length}
                    </span>{' '}
                    steps
                  </p>
                )}
              </div>

              {/* Source Link */}
              <a
                href={recipe.current.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Original <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Warnings Section */}
            {recipe.modifications.warnings.length > 0 && (
              <div className="p-4 border-b border-white/10 bg-red-500/10 border-l-4 border-l-red-500">
                <p className="text-xs font-semibold text-red-300 mb-2">
                  ⚠️ Warnings
                </p>
                <ul className="text-xs text-red-200 space-y-1">
                  {recipe.modifications.warnings.map((warning, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="shrink-0">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ingredients Section */}
            <div className="border-b border-white/10">
              <button
                onClick={() => toggleSection('ingredients')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold text-white text-sm">Ingredients</span>
                </div>
                {expandedSection === 'ingredients' ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {expandedSection === 'ingredients' && recipe.current.ingredients && (
                <div className="p-4 pb-4 space-y-3 border-t border-white/10 max-h-100 overflow-y-auto no-scrollbar">
                  {recipe.current.ingredients.map((ingredient: string, idx: number) => {
                    const isModified = recipe.modifications.substitutions.some(
                      (sub) =>
                        sub.substitutedWith.toLowerCase() ===
                        ingredient.toLowerCase()
                    );
                    const editedIngredient =
                      recipe.modifications.ingredientEdits.find(
                        (edit) =>
                          edit.originalIngredient ===
                          recipe.original.ingredients[idx]
                      );

                    return (
                      <li key={idx} className="flex items-start gap-2 text-gray-300 group">
                        <Checkbox className="mt-1 border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm break-words">
                            {ingredient}
                          </span>
                          {isModified && (
                            <p className="text-xs text-blue-300 mt-1">
                              Substituted from:{' '}
                              {recipe.original.ingredients[idx]}
                            </p>
                          )}
                          {editedIngredient && (
                            <p className="text-xs text-amber-300 mt-1">
                              Edited from:{' '}
                              {editedIngredient.originalIngredient}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleSubstitutionClick(ingredient)
                          }
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500/20 text-blue-400 shrink-0"
                          title="Substitute ingredient"
                        >
                          <Replace className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Instructions Section */}
            <div className="border-b border-white/10">
              <button
                onClick={() => toggleSection('instructions')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <span className="font-semibold text-white text-sm">Instructions</span>
                </div>
                {expandedSection === 'instructions' ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {expandedSection === 'instructions' && recipe.current.instructions && (
                <div className="p-4 space-y-3 border-t border-white/10 max-h-100 overflow-y-auto no-scrollbar">
                  {recipe.current.instructions.map((instruction: string, idx: number) => (
                    <div key={idx} className="text-xs text-gray-300 leading-relaxed">
                      <span className="text-blue-400 font-semibold">
                        Step {idx + 1}:{' '}
                      </span>
                      {instruction}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nutrition */}
            {recipe.current.nutrition && (
              <div className="p-4 border-b border-white/10">
                <p className="font-semibold text-white text-sm mb-3">Nutrition</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                  {recipe.current.nutrition.calories && (
                    <div>
                      <p className="text-gray-300">{recipe.current.nutrition.calories}</p>
                      <p className="text-gray-500">Calories</p>
                    </div>
                  )}
                  {recipe.current.nutrition.protein && (
                    <div>
                      <p className="text-gray-300">{recipe.current.nutrition.protein}</p>
                      <p className="text-gray-500">Protein</p>
                    </div>
                  )}
                  {recipe.current.nutrition.carbs && (
                    <div>
                      <p className="text-gray-300">{recipe.current.nutrition.carbs}</p>
                      <p className="text-gray-500">Carbs</p>
                    </div>
                  )}
                  {recipe.current.nutrition.fat && (
                    <div>
                      <p className="text-gray-300">{recipe.current.nutrition.fat}</p>
                      <p className="text-gray-500">Fat</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reset Button */}
            {hasModifications && (
              <div className="p-4 border-t border-white/10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetRecipe}
                  className="w-full border-white/20 hover:bg-white/5 text-gray-300 text-xs h-8"
                >
                  <RotateCcw className="h-3 w-3 mr-2" />
                  Reset to Original
                </Button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Substitution Dialog */}
      {selectedIngredient && (
        <SubstitutionDialog
          open={substitutionDialogOpen}
          onOpenChange={setSubstitutionDialogOpen}
          recipe={recipe.current}
          ingredient={selectedIngredient}
          onApplySubstitution={handleApplySubstitution}
        />
      )}
    </>
  );
}
