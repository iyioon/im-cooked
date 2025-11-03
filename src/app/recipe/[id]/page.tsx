import { Suspense } from "react";
import { RecipeDetailClient } from "./client";
import { Metadata } from "next";
import { ModifiedRecipeProvider } from "@/contexts/ModifiedRecipeContext";

export const metadata: Metadata = {
  title: "Recipe Details | I'm Cooked",
  description: "View detailed recipe information",
};

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ModifiedRecipeProvider>
      <Suspense fallback={<RecipeDetailLoading />}>
        <RecipeDetailClient recipeId={id} />
      </Suspense>
    </ModifiedRecipeProvider>
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
