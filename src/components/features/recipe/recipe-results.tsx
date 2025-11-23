"use client";

import { useState } from "react";
import { Recipe } from "@/types/recipe";
import { RecipeCard } from "./recipe-card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface RecipeResultsProps {
  recipes: Recipe[];
  query: string;
  onRetry?: () => void;
  onViewRecipe?: (recipe: Recipe) => void;
  onSelectRecipe?: (recipe: Recipe) => void;
}

const RECIPES_PER_PAGE = 3;

export function RecipeResults({
  recipes,
  query,
  onRetry,
  onViewRecipe,
  onSelectRecipe,
}: RecipeResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const totalPages = Math.ceil(recipes.length / RECIPES_PER_PAGE);
  const startIndex = (currentPage - 1) * RECIPES_PER_PAGE;
  const endIndex = startIndex + RECIPES_PER_PAGE;
  const currentRecipes = recipes.slice(startIndex, endIndex);

  // Empty state
  if (recipes.length === 0) {
    return (
      <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-sm text-center">
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <Search className="h-8 w-8 text-yellow-400" />
          </div>
          <h3 className="text-xl font-bold text-white">No recipes found</h3>
          <p className="text-gray-400">
            We couldn't find any recipes for "{query}". Try a different search term or check your
            spelling.
          </p>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="border-white/20 hover:bg-white/10"
            >
              Try Again
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">
            Found {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} for "{query}"
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onViewRecipe={onViewRecipe}
            onSelectRecipe={onSelectRecipe}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer hover:bg-white/10 text-white border-white/20"
                }
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className={
                    currentPage === page
                      ? "bg-blue-600 text-white border-blue-500 cursor-pointer"
                      : "cursor-pointer hover:bg-white/10 text-white border-white/20"
                  }
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer hover:bg-white/10 text-white border-white/20"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

// Loading skeleton component
export function RecipeResultsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 bg-white/10 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-[400px] bg-white/5 border-white/10 animate-pulse">
            <div className="h-48 bg-white/10" />
            <div className="p-5 space-y-3">
              <div className="h-6 bg-white/10 rounded w-3/4" />
              <div className="h-4 bg-white/10 rounded w-full" />
              <div className="h-4 bg-white/10 rounded w-5/6" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Error state component
export function RecipeResultsError({
  error,
  retryAction,
}: {
  error: string;
  retryAction: () => void;
}) {
  return (
    <Card className="p-8 bg-red-500/10 border-red-500/20 backdrop-blur-sm text-center">
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-xl font-bold text-white">Something went wrong</h3>
        <p className="text-gray-400">{error}</p>
        <Button
          onClick={retryAction}
          variant="outline"
          className="border-red-500/50 hover:bg-red-500/10 text-red-400"
        >
          Try Again
        </Button>
      </div>
    </Card>
  );
}
