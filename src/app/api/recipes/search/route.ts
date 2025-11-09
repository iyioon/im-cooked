import { NextRequest, NextResponse } from "next/server";
import { searchRecipes, getRecipeDetail } from "@/services/recipe-scraper";
import { UserPreferences, Recipe } from "@/types/recipe";
import { validateSearchQuery } from "@/services/ai";
import { validateRecipe } from "@/lib/allergen-validator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, preferences } = body as { query: string; preferences?: UserPreferences };

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate search query against dietary preferences
    if (preferences) {
      const validation = await validateSearchQuery({
        query,
        dietaryRestrictions: preferences.dietaryRestrictions,
        allergies: preferences.allergies,
      });

      if (validation.hasConflict) {
        console.log(`[Search Validation] Conflict detected: ${validation.reason}`);
        return NextResponse.json({
          recipes: [],
          query,
          conflict: {
            message: validation.reason,
            suggestions: validation.suggestions || [],
          },
        });
      }
    }

    // Set a timeout for the entire operation
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Search timeout")), 30000)
    );

    const searchPromise = searchRecipes(query, preferences);

    let recipes = await Promise.race([searchPromise, timeoutPromise]);

    // Allergen filtering if user has allergen preferences
    if (preferences?.allergies && preferences.allergies.length > 0) {
      console.log(`[Allergen Filtering] Checking ${recipes.length} recipes for allergens: ${preferences.allergies.join(', ')}`);

      const allergenFilteredRecipes: Recipe[] = [];
      let filteredCount = 0;

      // Validate each recipe for allergens
      for (const recipe of recipes) {
        try {
          // Get recipe details to access ingredients
          const recipeDetail = await getRecipeDetail(recipe.id);

          if (!recipeDetail || !recipeDetail.ingredients) {
            // If we can't get ingredients, include the recipe but without allergen info
            allergenFilteredRecipes.push(recipe);
            continue;
          }

          // Validate ingredients against user allergens
          const validation = await validateRecipe(
            recipeDetail.ingredients,
            preferences.allergies
          );

          if (validation.recipeSafe) {
            // Recipe is safe - add allergen info metadata
            allergenFilteredRecipes.push({
              ...recipe,
              allergenInfo: {
                hasAllergens: false,
                allergens: [],
                warnings: [],
                dataSource: 'open-food-facts',
                checkedAt: new Date().toISOString(),
              },
            });
          } else {
            // Recipe contains allergens - filter it out
            filteredCount++;
            console.log(`[Allergen Filtering] Filtered out "${recipe.title}" - contains: ${validation.blockedIngredients.join(', ')}`);
          }
        } catch (error) {
          console.error(`[Allergen Filtering] Error validating recipe "${recipe.title}":`, error);
          // Include the recipe if validation fails
          allergenFilteredRecipes.push(recipe);
        }
      }

      console.log(`[Allergen Filtering] Filtered ${filteredCount} recipes with allergens. ${allergenFilteredRecipes.length} recipes remain.`);
      recipes = allergenFilteredRecipes;
    }

    return NextResponse.json({
      recipes,
      query,
    });
  } catch (error) {
    console.error("Error in recipe search API:", error);

    if (error instanceof Error && error.message === "Search timeout") {
      return NextResponse.json(
        { error: "Search request timed out. Please try again." },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: "Failed to search recipes. Please try again." },
      { status: 500 }
    );
  }
}
