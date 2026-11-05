import { NextResponse } from "next/server"
import type { Content } from "@google/genai"
import { createClient } from "@/lib/supabase/server"
import { AI_BUSY_MESSAGE, AIUnavailableError, generateText } from "@/lib/gemini"
import { describeLearner, loadLearner } from "@/lib/learner"
import { getNsqfMapping } from "@/lib/nsqf"

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

    // Grounding: the learner's real profile/progress plus the app's NSQF reference data.
    let groundingContext = ""
    if (ragEnabled) {
      const learner = await loadLearner(supabase, user.id)
      const nsqfRows = [1, 2, 3, 4, 5, 6]
        .map((lvl) => {
          const m = getNsqfMapping(lvl)
          return `L${lvl}: knowledge "${m.descriptors.knowledge}", skills "${m.descriptors.skills}", responsibility "${m.descriptors.responsibility}"; roles: ${m.exampleJobRoles.join(", ")}; qualifications: ${m.requiredQualifications.join(", ")}; courses: ${m.exampleCourses.join(", ")}`
        })
        .join("\n")
      groundingContext = `

THE USER'S PROFILE AND PROGRESS (from GyaanGuru)
${describeLearner(learner)}

NSQF REFERENCE (from GyaanGuru's dataset)
${nsqfRows}

Use this context: refer to the user's actual goals, level and roadmaps, and cite NSQF levels from the reference when relevant.`
    }

    const systemPrompt = `You are an expert career guidance counselor in India supporting ${personaNormalized}s, helping with:
- Career exploration and planning
- Skills development and training program recommendations
- Educational policy and workforce development strategies

Provide step-by-step, actionable guidance tailored to the user's role. Keep responses concise (2–4 short paragraphs or a short list) with a professional, approachable tone.${groundingContext}`

    const text = await generateText(contents, { systemInstruction: systemPrompt, temperature: 0.7 })

    if (!text) {
      console.warn("[v0] Gemini returned empty content")
      return NextResponse.json({ error: "Empty response" }, { status: 502 })
    }

    return NextResponse.json({ text })
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 503 })
    }
    console.error("[v0] Career guidance API error:", error)
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 })
  }
}
