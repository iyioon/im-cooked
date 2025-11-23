import { NextRequest, NextResponse } from "next/server";
import { detectIntent } from "@/services/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body as { query: string };

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    // Detect the user's intent
    const intentResult = await detectIntent(query);

    return NextResponse.json(intentResult);
  } catch (error) {
    console.error("Error in intent detection API:", error);

    return NextResponse.json(
      { error: "Failed to detect intent. Please try again." },
      { status: 500 }
    );
  }
}
