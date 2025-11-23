import { NextRequest, NextResponse } from "next/server";
import {
  SubstitutionRequest,
  SubstitutionResponse,
  RecipeDetail,
  IngredientSubstitution,
} from "@/types/recipe";
import { parseIngredient } from "@/lib/ingredient-parser";
import { getSubstitutionSuggestions } from "@/services/ai";
import { validateSubstitutions, formatAllergenWarning } from "@/lib/allergen-validator";

export async function POST(request: NextRequest) {
  try {
    const body: SubstitutionRequest & {
      recipe: RecipeDetail;
      preferences?: import("@/types/recipe").UserPreferences;
    } = await request.json();
    const { recipeTitle, originalIngredient, userInput, dietaryRestrictions, recipe, preferences } =
      body;

    if (!recipeTitle || !originalIngredient || !recipe) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
    const location = preferences?.location?.country
      ? {
          country: preferences.location.country,
          region: preferences.location.region,
        }
      : undefined;

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

    // Allergen validation and filtering
    if (allAllergies && allAllergies.length > 0 && substitutionResponse.suggestions.length > 0) {
      console.log(
        `[Allergen Validation] Checking ${substitutionResponse.suggestions.length} substitutions for allergens: ${allAllergies.join(", ")}`
      );

      const totalSuggestions = substitutionResponse.suggestions.length;

      // Validate all substitution suggestions
      const { safe, blocked, validationResults } = await validateSubstitutions(
        substitutionResponse.suggestions,
        allAllergies
      );

      console.log(`[Allergen Validation] ${safe.length} safe, ${blocked.length} blocked`);

      // Add allergen validation metadata to safe suggestions
      const enrichedSuggestions: IngredientSubstitution[] = safe.map((suggestion) => {
        const validation = validationResults.get(suggestion.substitute.ingredient);
        return {
          ...suggestion,
          allergenValidation: {
            safe: true,
            warnings: validation ? [formatAllergenWarning(validation)] : [],
            confidence: validation?.confidence || 1.0,
          },
        };
      });

      // Prepare blocked reasons
      const blockedReasons = blocked.map((suggestion) => {
        const validation = validationResults.get(suggestion.substitute.ingredient);
        const allergens =
          validation?.matches
            .filter((m) => m.severity === "direct" || m.severity === "hierarchy")
            .map((m) => m.userAllergen) || [];
        return `${suggestion.substitute.ingredient} contains: ${[...new Set(allergens)].join(", ")}`;
      });

      // Update response with filtered suggestions
      const finalResponse: SubstitutionResponse = {
        ...substitutionResponse,
        suggestions: enrichedSuggestions,
        allergenFiltering: {
          totalSuggestions,
          safeSuggestions: safe.length,
          blockedSuggestions: blocked.length,
          blockedReasons,
        },
      };

      if (safe.length === 0 && blocked.length > 0) {
        console.warn(`[Allergen Validation] All substitutions blocked due to allergens`);
      }

      return NextResponse.json(finalResponse);
    }

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
