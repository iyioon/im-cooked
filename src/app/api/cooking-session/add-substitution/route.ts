import { NextRequest, NextResponse } from "next/server";
import { SubstitutionRecord } from "@/types/recipe";
import { addSubstitutionToSession } from "@/lib/cooking-session-manager";

interface AddSubstitutionRequest {
  sessionId: string;
  substitution: SubstitutionRecord;
}

export async function POST(request: NextRequest) {
  try {
    const body: AddSubstitutionRequest = await request.json();
    const { sessionId, substitution } = body;

    if (!sessionId || !substitution) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Add substitution to the session
    const updatedSession = addSubstitutionToSession(sessionId, substitution);

    if (!updatedSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error adding substitution to session:", error);
    return NextResponse.json(
      {
        error: "Failed to add substitution to session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
