import { NextRequest, NextResponse } from "next/server";
import { detectCookingSessionIntent } from "@/services/ai";
import { isObviouslyOffTopic, generateRejectionMessage } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userMessage, recipeTitle, currentStep, totalSteps } = body as {
      userMessage: string;
      recipeTitle: string;
      currentStep: number;
      totalSteps: number;
    };

    // Validate required fields
    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { error: "userMessage is required and must be a string" },
        { status: 400 }
      );
    }

    if (!recipeTitle || typeof recipeTitle !== "string") {
      return NextResponse.json(
        { error: "recipeTitle is required and must be a string" },
        { status: 400 }
      );
    }

    if (typeof currentStep !== "number" || typeof totalSteps !== "number") {
      return NextResponse.json(
        { error: "currentStep and totalSteps must be numbers" },
        { status: 400 }
      );
    }

    // Layer 1: Fast pre-filter for obviously off-topic queries
    if (isObviouslyOffTopic(userMessage)) {
      return NextResponse.json({
        intent: "REJECT",
        confidence: "high",
        reason: "Pre-filtered: message matches common off-topic patterns",
        rejectionMessage: generateRejectionMessage(recipeTitle),
      });
    }

    // Layer 2: LLM-based intent classification
    const intentResult = await detectCookingSessionIntent({
      userMessage,
      recipeTitle,
      currentStep,
      totalSteps,
    });

    // Add rejection message if intent is REJECT
    if (intentResult.intent === "REJECT") {
      return NextResponse.json({
        ...intentResult,
        rejectionMessage: generateRejectionMessage(recipeTitle),
      });
    }

    return NextResponse.json(intentResult);
  } catch (error) {
    console.error("Error in cooking session intent detection API:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to detect intent. Please try again.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
