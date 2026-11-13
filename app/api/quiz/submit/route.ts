import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ADMIN_MISSING_MESSAGE, createAdminClient } from "@/lib/supabase/admin"
import type { QuizQuestion } from "@/lib/quiz"
import { QUIZ_TIME_LIMIT_MINUTES, quizPassMark } from "@/lib/rewards"

const SubmitSchema = z.object({
  quizId: z.uuid(),
  answers: z.array(z.number().int().min(-1).max(20)).min(1).max(20),
})

type AwardResult = { points: number; topic_award: number; bonus_award: number; reason: "paid" | "already_paid" | "daily_limit" }

/** Marks a quiz on the server. A pass ticks the lesson and pays for it via award_lesson_quiz(). */
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
      return NextResponse.json({ error: "Invalid quiz answers" }, { status: 400 })
    }
    const { quizId, answers } = parsed.data

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: ADMIN_MISSING_MESSAGE, code: "QuizNotConfigured" }, { status: 503 })
    }

    const { data: quiz } = await admin
      .from("lesson_quizzes")
      .select("id, roadmap_id, module_index, topic_index, questions, created_at, submitted_at")
      .eq("id", quizId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }
    if (quiz.submitted_at) {
      return NextResponse.json({ error: "This quiz was already submitted. Start a new one to try again." }, { status: 409 })
    }
    if (Date.now() - new Date(quiz.created_at).getTime() > QUIZ_TIME_LIMIT_MINUTES * 60_000) {
      return NextResponse.json({ error: "This quiz has expired. Start a new one." }, { status: 410 })
    }

    const questions = quiz.questions as QuizQuestion[]
    if (answers.length !== questions.length) {
      return NextResponse.json({ error: "Answer every question before submitting." }, { status: 400 })
    }
    const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correctAnswer ? 1 : 0), 0)
    const passMark = quizPassMark(questions.length)
    const passed = score >= passMark

    // Only the first submission counts; the submitted_at guard makes a double submit a no-op.
    const { data: marked } = await admin
      .from("lesson_quizzes")
      .update({ answers, score, total: questions.length, passed, submitted_at: new Date().toISOString() })
      .eq("id", quizId)
      .is("submitted_at", null)
      .select("id")
    if (!marked || marked.length === 0) {
      return NextResponse.json({ error: "This quiz was already submitted. Start a new one to try again." }, { status: 409 })
    }

    let award: AwardResult | null = null
    if (passed) {
      const { data, error } = await admin.rpc("award_lesson_quiz", {
        p_user_id: user.id,
        p_roadmap_id: quiz.roadmap_id,
        p_module_index: quiz.module_index,
        p_topic_index: quiz.topic_index,
      })
      if (error) console.error("Error paying for quiz:", error)
      else award = data as AwardResult
    }

    return NextResponse.json({
      score,
      total: questions.length,
      passMark,
      passed,
      results: questions.map((q) => ({ correctAnswer: q.correctAnswer, explanation: q.explanation })),
      award: award && { topic: award.topic_award, bonus: award.bonus_award, reason: award.reason, points: award.points },
    })
  } catch (error) {
    console.error("Error submitting quiz:", error)
    return NextResponse.json({ error: "Failed to mark the quiz" }, { status: 500 })
  }
}
