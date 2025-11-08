import { NextRequest, NextResponse } from "next/server";
import { searchRecipes } from "@/services/recipe-scraper";
import { UserPreferences } from "@/types/recipe";
import { validateSearchQuery } from "@/services/ai";

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

    const recipes = await Promise.race([searchPromise, timeoutPromise]);

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
