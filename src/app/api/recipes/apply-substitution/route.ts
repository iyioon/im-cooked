import { NextRequest, NextResponse } from "next/server";
import { IngredientSubstitution, RecipeDetail, UserPreferences } from "@/types/recipe";
import { applySubstitutionToRecipe } from "@/services/ai";

interface ApplySubstitutionRequest {
  recipeTitle: string;
  recipe: RecipeDetail;
  selectedSubstitution: IngredientSubstitution;
  preferences?: UserPreferences;
}

export async function POST(request: NextRequest) {
  try {
    const body: ApplySubstitutionRequest = await request.json();
    const { recipeTitle, recipe, selectedSubstitution, preferences } = body;

    if (!recipeTitle || !recipe || !selectedSubstitution) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Merge dietary preferences
    const dietaryRestrictions = preferences?.dietaryRestrictions || [];
    const allergies = preferences?.allergies || [];
    const avoidedIngredients = preferences?.avoidedIngredients || [];

    // Call AI service to regenerate recipe with substitution
    const appliedRecipe = await applySubstitutionToRecipe({
      recipeTitle,
      recipe,
      selectedSubstitution,
      dietaryRestrictions,
      allergies,
      avoidedIngredients,
    });

    return NextResponse.json(appliedRecipe);
  } catch (error) {
    console.error("Error in apply-substitution API:", error);
    return NextResponse.json(
      {
        error: "Failed to apply substitution to recipe",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
