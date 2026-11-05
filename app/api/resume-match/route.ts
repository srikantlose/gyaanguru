import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { AI_BUSY_MESSAGE, AIUnavailableError, ModelOutputError, generateJson } from "@/lib/gemini"

const ResultSchema = z.object({
  role: z.string().min(1),
  matchScore: z.coerce.number().min(0).max(100),
  summary: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  suggestedCourses: z.array(z.string()).default([]),
  nsqfLevel: z.coerce.number().int().min(1).max(10).optional(),
})


/** Scores a pasted resume against a target role (or the best-fitting role) using Gemini. */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { resumeText, targetRole } = await req.json()
    const resume = typeof resumeText === "string" ? resumeText.trim().slice(0, 12000) : ""
    if (resume.length < 40) {
      return NextResponse.json({ error: "Paste a bit more of your resume (at least a few lines)." }, { status: 400 })
    }
    const role = typeof targetRole === "string" ? targetRole.trim().slice(0, 120) : ""

    const prompt = `You are a careful recruiter for the Indian job market. Evaluate this resume${
      role ? ` against the role "${role}"` : " and pick the single best-fitting entry-level role for it"
    }.

RESUME
"""
${resume}
"""

Return ONLY JSON:
{
  "role": "the role you evaluated against",
  "matchScore": 0-100 (how ready they are for this role today; be realistic),
  "summary": "2 sentences on fit",
  "strengths": ["3-5 concrete strengths found in the resume"],
  "missingSkills": ["3-6 specific skills/tools/experience they should add"],
  "suggestedCourses": ["2-4 specific courses or certifications available in India"],
  "nsqfLevel": NSQF level (1-10) that matches their current profile
}`

    let raw: unknown
    try {
      raw = await generateJson(prompt)
    } catch (e) {
      if (e instanceof ModelOutputError) {
        return NextResponse.json({ error: "The AI gave an unreadable answer. Please try again." }, { status: 502 })
      }
      throw e
    }
    const parsed = ResultSchema.safeParse(raw)
    if (!parsed.success) {
      console.error("Resume match schema error:", parsed.error.message)
      return NextResponse.json({ error: "The AI gave an incomplete answer. Please try again." }, { status: 502 })
    }
    return NextResponse.json({ result: { ...parsed.data, matchScore: Math.round(parsed.data.matchScore) } })
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 503 })
    }
    console.error("Resume match error:", error)
    return NextResponse.json({ error: "Couldn't analyse your resume. Please try again." }, { status: 500 })
  }
}
