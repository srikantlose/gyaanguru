import { NextResponse } from "next/server"
import type { Content } from "@google/genai"
import { createClient } from "@/lib/supabase/server"
import { AI_BUSY_MESSAGE, AIUnavailableError, generateText } from "@/lib/gemini"
import { describeLearner, loadLearner } from "@/lib/learner"

const MAX_TURNS = 20

/** AI mentor chat, grounded in the learner's real profile, roadmaps and progress. */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messages } = await req.json()
    const contents: Content[] = (Array.isArray(messages) ? messages : [])
      .filter((m: { role?: string; content?: string }) => typeof m?.content === "string" && m.content.trim())
      .slice(-MAX_TURNS)
      .map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content.slice(0, 4000) }],
      }))
    if (contents.length === 0 || contents[contents.length - 1].role !== "user") {
      return NextResponse.json({ error: "Send a message first." }, { status: 400 })
    }

    const learner = await loadLearner(supabase, user.id)
    const systemInstruction = `You are GyaanGuru's AI mentor: a warm, practical study coach for learners in India.
Use the learner's real data below. Refer to their actual roadmaps, next lessons, progress and goals by name.
When asked for a plan, give a concrete, numbered plan sized to their weekly hours. Keep answers short (under 180 words),
use simple English, and end with one clear next action. If they have no roadmap yet, suggest creating one on the Generate page.

LEARNER DATA
${describeLearner(learner)}`

    const reply = await generateText(contents, { systemInstruction, temperature: 0.7 })
    if (!reply) {
      return NextResponse.json({ error: "The mentor didn't reply. Please try again." }, { status: 502 })
    }
    return NextResponse.json({ reply })
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 503 })
    }
    console.error("Mentor chat error:", error)
    return NextResponse.json({ error: "The mentor couldn't reply. Please try again." }, { status: 500 })
  }
}
