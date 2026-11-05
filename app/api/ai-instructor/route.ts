import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { AI_BUSY_MESSAGE, AIUnavailableError, generateText } from "@/lib/gemini"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { message, topic, context } = await request.json()

    if (!message || !topic) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const prompt = `You are an AI instructor helping a student learn about "${topic}".

Context about the lesson: ${context}

Student's question: ${message}

Provide a helpful, clear, and concise response that:
1. Directly answers the student's question
2. Uses simple language and examples when appropriate
3. Encourages further learning
4. Stays focused on the topic

Keep your response under 200 words.`

    const response = await generateText(prompt)

    return NextResponse.json({ response })
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 503 })
    }
    console.error("Error in AI instructor:", error)
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 })
  }
}
