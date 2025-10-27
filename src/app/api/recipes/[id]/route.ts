import { NextRequest, NextResponse } from "next/server";
import { getRecipeDetail } from "@/lib/gemini";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    const recipeDetail = await getRecipeDetail(id);

    if (!recipeDetail) {
      return NextResponse.json(
        { error: "Recipe not found or could not be loaded" },
        { status: 404 }
      );
    }

    return NextResponse.json(recipeDetail);
  } catch (error) {
    console.error("Error in recipe detail API:", error);
    return NextResponse.json(
      { error: "Failed to load recipe details. Please try again." },
      { status: 500 }
    );
  }
}
