import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ADMIN_MISSING_MESSAGE, createAdminClient } from "@/lib/supabase/admin"
import { AI_BUSY_MESSAGE, AIUnavailableError, ModelOutputError } from "@/lib/gemini"
import { dayKey } from "@/lib/learner"
import { generatePlacementTest, startOfIndianDay } from "@/lib/quiz"
import {
  PLACEMENT_BAND_PASS,
  PLACEMENT_PER_BAND,
  PLACEMENT_STARTS_PER_DAY,
  PLACEMENT_TIME_LIMIT_MINUTES,
  type PublicPlacementQuestion,
} from "@/lib/placement"
import { TRACK_IDS } from "@/lib/qualifications"

const StartSchema = z.object({ track: z.enum(TRACK_IDS) })

/**
 * Hands out a placement test for one track. Questions and answers are stored server-side
 * (placement_tests, unreadable by learners); the browser only gets questions and options.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parsed = StartSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Pick a track for the test." }, { status: 400 })
    }
    const { track } = parsed.data

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: ADMIN_MISSING_MESSAGE, code: "QuizNotConfigured" }, { status: 503 })
    }

    const { count } = await admin
      .from("placement_tests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfIndianDay())
    if ((count ?? 0) >= PLACEMENT_STARTS_PER_DAY) {
      return NextResponse.json(
        { error: `You've started ${PLACEMENT_STARTS_PER_DAY} placement tests today. Come back tomorrow for another go.` },
        { status: 429 },
      )
    }

    const questions = await generatePlacementTest(track, dayKey(new Date()))
    const { data: test, error: insertError } = await admin
      .from("placement_tests")
      .insert({ user_id: user.id, track, questions })
      .select("id, created_at")
      .single()
    if (insertError || !test) {
      throw new Error(insertError?.message ?? "Couldn't save the placement test")
    }

    const publicQuestions: PublicPlacementQuestion[] = questions.map((q) => ({ band: q.band, question: q.question, options: q.options }))
    return NextResponse.json({
      testId: test.id,
      track,
      questions: publicQuestions,
      perBand: PLACEMENT_PER_BAND,
      bandPass: PLACEMENT_BAND_PASS,
      expiresAt: new Date(new Date(test.created_at).getTime() + PLACEMENT_TIME_LIMIT_MINUTES * 60_000).toISOString(),
    })
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 503 })
    }
    if (error instanceof ModelOutputError) {
      console.error("[v0] Placement test output rejected:", error.raw.slice(0, 500))
      return NextResponse.json({ error: "The AI wrote a test that didn't follow the rules. Please try again." }, { status: 502 })
    }
    console.error("[v0] Placement start error:", error)
    return NextResponse.json({ error: "Couldn't start the placement test" }, { status: 500 })
  }
}
