import { NextRequest, NextResponse } from "next/server";
import { matchIngredientFromMessage } from "@/services/ai";

interface MatchIngredientRequest {
  recipeTitle: string;
  recipeIngredients: string[];
  userMessage: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: MatchIngredientRequest = await request.json();
    const { recipeTitle, recipeIngredients, userMessage } = body;

    if (!recipeTitle || !recipeIngredients || !userMessage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use AI to match the ingredient from the user's message
    const matchResult = await matchIngredientFromMessage({
      recipeTitle,
      recipeIngredients,
      userMessage,
    });

    return NextResponse.json(matchResult);
  } catch (error) {
    console.error("Error in match-ingredient API:", error);
    return NextResponse.json(
      {
        error: "Failed to match ingredient",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
