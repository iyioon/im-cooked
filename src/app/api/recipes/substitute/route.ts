import { NextRequest, NextResponse } from "next/server";
import {
  SubstitutionRequest,
  SubstitutionResponse,
  RecipeDetail,
} from "@/types/recipe";
import { parseIngredient } from "@/lib/ingredient-parser";
import { getSubstitutionSuggestions } from "@/services/ai";

export async function POST(request: NextRequest) {
  try {
    const body: SubstitutionRequest & { recipe: RecipeDetail; preferences?: import("@/types/recipe").UserPreferences } =
      await request.json();
    const {
      recipeTitle,
      originalIngredient,
      userInput,
      dietaryRestrictions,
      recipe,
      preferences,
    } = body;

    if (!recipeTitle || !originalIngredient || !recipe) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse the original ingredient
    const parsedOriginal = parseIngredient(originalIngredient);

    // Merge dietary restrictions from preferences and explicit request
    const allDietaryRestrictions = [
      ...(dietaryRestrictions || []),
      ...(preferences?.dietaryRestrictions || []),
    ];

    const allAllergies = preferences?.allergies || [];
    const avoidedIngredients = preferences?.avoidedIngredients || [];
    const location = preferences?.location?.country ? {
      country: preferences.location.country,
      region: preferences.location.region,
    } : undefined;

    // Call AI service for substitution suggestions
    const substitutionResponse = await getSubstitutionSuggestions({
      recipeTitle,
      recipe,
      originalIngredient,
      parsedIngredient: parsedOriginal.ingredient,
      userInput,
      dietaryRestrictions: allDietaryRestrictions,
      allergies: allAllergies,
      avoidedIngredients,
      location,
    });

    return NextResponse.json(substitutionResponse);
  } catch (error) {
    console.error("Error in substitution API:", error);
    return NextResponse.json(
      {
        error: "Failed to generate substitution suggestions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
