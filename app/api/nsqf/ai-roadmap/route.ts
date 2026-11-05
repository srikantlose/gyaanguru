import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { NSQF_MAX_LEVEL, NSQF_MIN_LEVEL, getNsqfMapping } from "@/lib/nsqf"
import { AI_BUSY_MESSAGE, AIUnavailableError, ModelOutputError, generateJson } from "@/lib/gemini"

// Schema for strict, type-safe roadmap output
const nodeSchema = z.object({
  nsqfLevel: z.number().int().min(NSQF_MIN_LEVEL).max(NSQF_MAX_LEVEL),
  course: z.string().min(1),
  jobRole: z.string().min(1),
  optionalCourses: z.array(z.string()).default([]),
})

const roadmapSchema = z.object({
  title: z.string().min(1),
  rationale: z.string().min(1),
  nodes: z.array(nodeSchema).length(3), // enforce 3-level path (e.g., L4 → L5 → L6)
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const learnerProfile = body?.learnerProfile || {
      education: "Class 12",
      skills: ["Basic IT", "Excel"],
      goal: "Digital Marketing",
    }

    // Provide NSQF descriptors (3-6) to the model for grounding
    const d3 = getNsqfMapping(3)
    const d4 = getNsqfMapping(4)
    const d5 = getNsqfMapping(5)
    const d6 = getNsqfMapping(6)

    const nsqfContext = `
NSQF Level 3:
- Knowledge: ${d3.descriptors.knowledge}
- Skills: ${d3.descriptors.skills}
- Responsibility: ${d3.descriptors.responsibility}

NSQF Level 4:
- Knowledge: ${d4.descriptors.knowledge}
- Skills: ${d4.descriptors.skills}
- Responsibility: ${d4.descriptors.responsibility}

NSQF Level 5:
- Knowledge: ${d5.descriptors.knowledge}
- Skills: ${d5.descriptors.skills}
- Responsibility: ${d5.descriptors.responsibility}

NSQF Level 6:
- Knowledge: ${d6.descriptors.knowledge}
- Skills: ${d6.descriptors.skills}
- Responsibility: ${d6.descriptors.responsibility}
`.trim()

    // Compose a focused prompt for AI to produce a 3-step, NSQF-aligned roadmap
    const prompt = `
You are an expert career advisor. Create a 3-level NSQF-aligned career roadmap (exactly 3 nodes) for this learner profile:

Learner Profile:
- Education: ${learnerProfile.education || "Unknown"}
- Skills: ${(learnerProfile.skills || []).join(", ") || "None"}
- Goal: ${learnerProfile.goal || "Unknown"}

Rules:
- The roadmap must align to NSQF levels 3–6.
- Select a continuous path of exactly 3 levels, typically progressing upwards (e.g., 4 → 5 → 6).
- Each node must include: "nsqfLevel" (3|4|5|6), a concrete upskilling "course" (string), a realistic "jobRole" (string), and "optionalCourses" (string[]).
- Prefer "Digital Marketing" focused examples if the goal contains marketing.
- Ensure courses and roles reflect the autonomy/complexity described by each NSQF level.
- Avoid generic placeholders; be specific and India-relevant when possible.

NSQF Descriptors (for grounding and alignment):
${nsqfContext}

Return ONLY valid JSON matching this TypeScript shape:
{
  "title": string,
  "rationale": string,
  "nodes": [
    { "nsqfLevel": 3|4|5|6, "course": string, "jobRole": string, "optionalCourses": string[] },
    { "nsqfLevel": 3|4|5|6, "course": string, "jobRole": string, "optionalCourses": string[] },
    { "nsqfLevel": 3|4|5|6, "course": string, "jobRole": string, "optionalCourses": string[] }
  ]
}
`

    let candidate: unknown
    try {
      candidate = await generateJson(prompt)
    } catch (e) {
      if (e instanceof ModelOutputError) {
        console.error("[v0] NSQF Gemini raw output (first 500 chars):", e.raw.slice(0, 500))
        return NextResponse.json({ error: "Model returned non-JSON output" }, { status: 502 })
      }
      throw e
    }

    const parsed = roadmapSchema.safeParse(candidate)
    if (!parsed.success) {
      console.error("[v0] NSQF Gemini parse/validation failed:", parsed.error?.message)
      return NextResponse.json({ error: "Model output did not match schema" }, { status: 422 })
    }

    return NextResponse.json({ roadmap: parsed.data })
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 503 })
    }
    console.error("[v0] AI NSQF (Gemini) generation error:", err)
    return NextResponse.json({ error: "Failed to generate AI NSQF roadmap" }, { status: 500 })
  }
}
