import { NextResponse } from "next/server"
import type { Content } from "@google/genai"
import { createClient } from "@/lib/supabase/server"
import { generateText } from "@/lib/gemini"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("[v0] Missing GEMINI_API_KEY")
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 })
    }

    const { messages, persona, rag } = await req.json()

    // Build conversation in Gemini "contents" format
    // Gemini expects roles: "user" and "model"
    const contents: Content[] =
      Array.isArray(messages) && messages.length > 0
        ? messages.map((m: { role: string; content: string }) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }))
        : []

    if (contents.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 })
    }

    const personaNormalized =
      typeof persona === "string" && ["learner", "trainer", "policymaker"].includes(persona)
        ? (persona as "learner" | "trainer" | "policymaker")
        : "learner"
    const ragEnabled = typeof rag === "boolean" ? rag : true

    const systemPrompt = `You are an expert career guidance counselor supporting ${personaNormalized}s.
You ${ragEnabled ? "use Retrieval-Augmented Generation (RAG)" : "provide general guidance without retrieval"} to help with:
- Career exploration and planning
- Skills development and training program recommendations
- Educational policy and workforce development strategies

When relevant, cite frameworks like NSQF (National Skills Qualifications Framework) and provide step-by-step, actionable guidance tailored to the user's role. Keep responses concise yet comprehensive (3–5 paragraphs), with a professional and approachable tone.
If RAG is disabled, avoid implying that specific proprietary sources were retrieved and instead rely on broadly accepted best practices.`

    const text = await generateText(contents, { systemInstruction: systemPrompt, temperature: 0.7 })

    if (!text) {
      console.warn("[v0] Gemini returned empty content")
      return NextResponse.json({ error: "Empty response" }, { status: 502 })
    }

    return NextResponse.json({ text })
  } catch (error) {
    console.error("[v0] Career guidance API error:", error)
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 })
  }
}
