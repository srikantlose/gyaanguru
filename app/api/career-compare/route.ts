import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { AI_BUSY_MESSAGE, AIUnavailableError, ModelOutputError, generateJson } from "@/lib/gemini"

const Range = z.object({ min: z.coerce.number().min(0), max: z.coerce.number().min(0) })

const Outcome = z.object({
  course: z.string().min(1),
  typicalRoles: z.array(z.string()).min(1),
  entrySalaryLPA: Range,
  fiveYearSalaryLPA: Range,
  demand: z.enum(["low", "medium", "high"]).catch("medium"),
  monthsToJobReady: z.coerce.number().min(0).max(60),
  nsqfLevel: z.coerce.number().int().min(1).max(10),
  keySkills: z.array(z.string()).default([]),
})

const ResultSchema = z.object({
  a: Outcome,
  b: Outcome,
  recommendation: z.string().min(1),
})


/** Compares two courses / career paths for the Indian job market (AI estimates, not guarantees). */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseA, courseB } = await req.json()
    const a = typeof courseA === "string" ? courseA.trim().slice(0, 120) : ""
    const b = typeof courseB === "string" ? courseB.trim().slice(0, 120) : ""
    if (!a || !b) {
      return NextResponse.json({ error: "Enter two courses or career paths to compare." }, { status: 400 })
    }

    const prompt = `Compare these two learning paths for a learner in India today:
A: "${a}"
B: "${b}"

Give realistic, conservative estimates for the Indian job market (salaries in lakh per annum, LPA).
Return ONLY JSON:
{
  "a": { "course": "${a}", "typicalRoles": [2-4 roles], "entrySalaryLPA": {"min": n, "max": n}, "fiveYearSalaryLPA": {"min": n, "max": n},
         "demand": "low"|"medium"|"high", "monthsToJobReady": n, "nsqfLevel": 1-10, "keySkills": [3-5 skills] },
  "b": { same shape for "${b}" },
  "recommendation": "2-3 sentences: who should pick which, and why"
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
      console.error("Career compare schema error:", parsed.error.message)
      return NextResponse.json({ error: "The AI gave an incomplete answer. Please try again." }, { status: 502 })
    }
    return NextResponse.json({ result: parsed.data })
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 503 })
    }
    console.error("Career compare error:", error)
    return NextResponse.json({ error: "Couldn't compare these paths. Please try again." }, { status: 500 })
  }
}
