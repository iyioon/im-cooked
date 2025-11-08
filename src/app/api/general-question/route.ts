import { NextRequest, NextResponse } from "next/server";
import { getGenAI, getModelName } from "@/services/ai";

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

    const genAI = getGenAI();
    const modelName = getModelName();

    // Build a prompt for answering general food/cooking questions
    const prompt = `You are a helpful and knowledgeable cooking assistant. Answer the user's question about food or cooking in a clear, concise, and friendly manner.

USER QUESTION: "${query}"

GUIDELINES:
- Provide accurate, helpful information about food and cooking
- Be concise but thorough (2-4 sentences is ideal)
- Use simple, easy-to-understand language
- If relevant, provide practical tips or examples
- If the question is about food safety, be especially careful and accurate
- Stay focused on food and cooking topics

Provide a helpful, conversational answer:`;

    const result = await genAI.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const answer = result.text || "";

    return NextResponse.json({ answer: answer.trim() });
  } catch (error) {
    console.error("Error in general question API:", error);
    
    return NextResponse.json(
      { error: "Failed to answer question. Please try again." },
      { status: 500 }
    );
  }
}
