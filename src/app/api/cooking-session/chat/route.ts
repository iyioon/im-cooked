import { NextRequest, NextResponse } from "next/server";
import { RecipeStep } from "@/types/recipe";
import { getCookingAssistance } from "@/services/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      recipeTitle,
      currentStep,
      currentStepNumber,
      allSteps,
      ingredients,
      userMessage,
    } = body as {
      recipeTitle: string;
      currentStep?: RecipeStep;
      currentStepNumber: number;
      allSteps: RecipeStep[];
      ingredients: string[];
      userMessage: string;
    };

    if (!recipeTitle || !userMessage) {
      return NextResponse.json(
        { error: "recipeTitle and userMessage are required" },
        { status: 400 }
      );
    }

    // Call AI service for cooking assistance
    const cleanResponse = await getCookingAssistance({
      recipeTitle,
      currentStep,
      currentStepNumber,
      allSteps,
      ingredients,
      userMessage,
    });

    return NextResponse.json({
      message: cleanResponse,
      stepNumber: currentStepNumber,
    });
  } catch (error) {
    console.error("Error in cooking assistant chat:", error);
    return NextResponse.json(
      {
        error: "Failed to get response from cooking assistant",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
