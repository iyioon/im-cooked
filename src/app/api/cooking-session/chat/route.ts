import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { RecipeStep } from "@/types/recipe";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash-native-audio-dialog";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      recipeTitle,
      currentStep,
      currentStepNumber,
      ingredients,
      userMessage,
    } = body as {
      recipeTitle: string;
      currentStep?: RecipeStep;
      currentStepNumber: number;
      ingredients: string[];
      userMessage: string;
    };

    if (!recipeTitle || !userMessage) {
      return NextResponse.json(
        { error: "recipeTitle and userMessage are required" },
        { status: 400 }
      );
    }

    // Build context-aware prompt
    const prompt = `You are an expert cooking assistant helping someone prepare "${recipeTitle}".

CURRENT CONTEXT:
- The user is currently on Step ${currentStepNumber}${currentStep ? `: "${currentStep.text}"` : ""}
- Recipe ingredients: ${ingredients.slice(0, 10).join(", ")}${ingredients.length > 10 ? "..." : ""}

USER QUESTION:
"${userMessage}"

INSTRUCTIONS:
- Provide a helpful, concise response related to their current cooking step
- If they ask about timing, technique, or ingredients, answer based on the recipe context
- If they ask for substitutions, suggest common alternatives
- Keep responses under 100 words unless detailed explanation is needed
- Be encouraging and supportive
- If the question is about a different step or general cooking, still answer helpfully

IMPORTANT:
- Focus on practical, actionable advice
- Consider food safety when relevant
- Be conversational and friendly`;

    // Call Gemini AI with correct format
    const result = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const responseText = result.text || "";

    // Clean up response
    const cleanResponse = responseText.trim();

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
