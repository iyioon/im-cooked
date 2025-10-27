import { NextRequest, NextResponse } from "next/server";
import { detectRecipeIntent } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    const intent = await detectRecipeIntent(message);

    return NextResponse.json(intent);
  } catch (error) {
    console.error("Error in intent detection API:", error);
    return NextResponse.json(
      { error: "Failed to detect intent" },
      { status: 500 }
    );
  }
}
