import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { AI_BUSY_MESSAGE, AIUnavailableError, generateJson } from "@/lib/gemini"

const QuizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string()).min(2),
        correctAnswer: z.number().int().min(0),
        explanation: z.string().optional().default(""),
      }),
    )
    .min(1),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { topic, description } = await request.json()

    if (!topic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 })
    }

    const prompt = `Generate a quiz with 4 multiple-choice questions about "${topic}".

Context: ${description}

Return ONLY a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Requirements:
- Exactly 4 questions
- Each question must have exactly 4 options
- correctAnswer is the index (0-3) of the correct option
- Questions should test understanding, not just memorization
- Include a brief explanation for each answer`

    const parsed = QuizSchema.safeParse(await generateJson(prompt))
    if (!parsed.success) {
      throw new Error(`Invalid quiz structure: ${parsed.error.message}`)
    }

    // Drop questions whose answer index points outside their options.
    const questions = parsed.data.questions.filter((q) => q.correctAnswer < q.options.length)
    if (questions.length === 0) {
      throw new Error("Invalid quiz structure: no usable questions")
    }

    return NextResponse.json({ quiz: { questions } })
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 503 })
    }
    console.error("Error generating quiz:", error)
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 })
  }
}
