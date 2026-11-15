import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ADMIN_MISSING_MESSAGE, createAdminClient } from "@/lib/supabase/admin"
import { PLACEMENT_TIME_LIMIT_MINUTES, scorePlacement, type PlacementQuestion } from "@/lib/placement"

const SubmitSchema = z.object({
  testId: z.uuid(),
  answers: z.array(z.number().int().min(-1).max(20)).min(1).max(40),
})

/** Marks a placement test on the server and records the tested level. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parsed = SubmitSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid answers" }, { status: 400 })
    }
    const { testId, answers } = parsed.data

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: ADMIN_MISSING_MESSAGE, code: "QuizNotConfigured" }, { status: 503 })
    }

    const { data: test } = await admin
      .from("placement_tests")
      .select("id, track, questions, created_at, submitted_at")
      .eq("id", testId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!test) {
      return NextResponse.json({ error: "Placement test not found" }, { status: 404 })
    }
    if (test.submitted_at) {
      return NextResponse.json({ error: "This test was already submitted. Start a new one to try again." }, { status: 409 })
    }
    if (Date.now() - new Date(test.created_at).getTime() > PLACEMENT_TIME_LIMIT_MINUTES * 60_000) {
      return NextResponse.json({ error: "This test has expired. Start a new one." }, { status: 410 })
    }

    const questions = test.questions as PlacementQuestion[]
    if (answers.length !== questions.length) {
      return NextResponse.json({ error: "Answer every question before submitting." }, { status: 400 })
    }
    const outcome = scorePlacement(questions, answers)

    // Only the first submit counts: the update matches nothing once submitted_at is set.
    const { data: updated, error: updateError } = await admin
      .from("placement_tests")
      .update({
        answers,
        band_scores: outcome.bandScores,
        placed_level: outcome.placed,
        target_level: outcome.target,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", testId)
      .is("submitted_at", null)
      .select("id")
    if (updateError) throw new Error(updateError.message)
    if (!updated?.length) {
      return NextResponse.json({ error: "This test was already submitted. Start a new one to try again." }, { status: 409 })
    }

    return NextResponse.json({
      track: test.track,
      ...outcome,
      results: questions.map((q) => ({ band: q.band, unit: q.unit, correctAnswer: q.correctAnswer, explanation: q.explanation })),
    })
  } catch (error) {
    console.error("[v0] Placement submit error:", error)
    return NextResponse.json({ error: "Failed to mark the placement test" }, { status: 500 })
  }
}
