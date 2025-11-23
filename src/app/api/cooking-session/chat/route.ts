import { NextRequest, NextResponse } from "next/server";
import { RecipeStep } from "@/types/recipe";
import { getCookingAssistance, detectCookingSessionIntent } from "@/services/ai";
import { isObviouslyOffTopic, generateRejectionMessage } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipeTitle, currentStep, currentStepNumber, allSteps, ingredients, userMessage } =
      body as {
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

    // Layer 1: Fast pre-filter for obviously off-topic queries
    if (isObviouslyOffTopic(userMessage)) {
      return NextResponse.json({
        message: generateRejectionMessage(recipeTitle),
        stepNumber: currentStepNumber,
        intent: "REJECT",
        isRejection: true,
      });
    }

    // Layer 2: LLM-based intent detection
    const totalSteps = allSteps?.length || 0;
    const intentResult = await detectCookingSessionIntent({
      userMessage,
      recipeTitle,
      currentStep: currentStepNumber,
      totalSteps,
    });

    // Handle REJECT intent
    if (intentResult.intent === "REJECT") {
      return NextResponse.json({
        message: generateRejectionMessage(recipeTitle),
        stepNumber: currentStepNumber,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        reason: intentResult.reason,
        isRejection: true,
      });
    }

    // For all other intents (COOKING_QUESTION, SUBSTITUTION_REQUEST, GENERAL_COOKING),
    // proceed with the cooking assistant
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
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      isRejection: false,
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
