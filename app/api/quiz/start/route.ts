import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ADMIN_MISSING_MESSAGE, createAdminClient } from "@/lib/supabase/admin"
import { AI_BUSY_MESSAGE, AIUnavailableError } from "@/lib/gemini"
import { generateLessonQuiz, loadLesson, startOfIndianDay, type PublicQuestion } from "@/lib/quiz"
import {
  DAILY_PAID_LESSONS,
  QUIZ_STARTS_PER_DAY,
  QUIZ_STARTS_PER_LESSON_PER_HOUR,
  QUIZ_TIME_LIMIT_MINUTES,
  QUIZ_UNLOCK_MINUTES,
  quizPassMark,
} from "@/lib/rewards"

const StartSchema = z.object({
  roadmapId: z.uuid(),
  moduleIndex: z.number().int().min(0),
  topicIndex: z.number().int().min(0),
})

/**
 * Hands out a fresh quiz for a lesson. The questions and answers are stored server-side
 * (lesson_quizzes, unreadable by learners); the browser only gets questions and options.
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
      return NextResponse.json({ error: "Invalid lesson" }, { status: 400 })
    }
    const { roadmapId, moduleIndex, topicIndex } = parsed.data

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: ADMIN_MISSING_MESSAGE, code: "QuizNotConfigured" }, { status: 503 })
    }

    const lesson = await loadLesson(supabase, user.id, roadmapId, moduleIndex, topicIndex)
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    const key = { user_id: user.id, roadmap_id: roadmapId, module_index: moduleIndex, topic_index: topicIndex }

    // Pacing: the quiz unlocks a few minutes after the lesson was first opened.
    await admin.from("lesson_views").upsert(key, { onConflict: "user_id,roadmap_id,module_index,topic_index", ignoreDuplicates: true })
    const { data: view } = await admin.from("lesson_views").select("first_opened_at").match(key).maybeSingle()
    const unlockAt = new Date(new Date(view?.first_opened_at ?? Date.now()).getTime() + QUIZ_UNLOCK_MINUTES * 60_000)
    const waitMs = unlockAt.getTime() - Date.now()
    if (waitMs > 0) {
      const minutes = Math.ceil(waitMs / 60_000)
      return NextResponse.json(
        {
          error: `Spend a little time with the lesson first. Its quiz unlocks in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
          code: "QuizLocked",
          unlockAt: unlockAt.toISOString(),
        },
        { status: 425 },
      )
    }

    // Rate limits protect the Gemini quota and stop brute-forcing fresh quizzes.
    const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString()
    const [{ count: lessonStarts }, { count: dayStarts }] = await Promise.all([
      admin.from("lesson_quizzes").select("id", { count: "exact", head: true }).match(key).gte("created_at", hourAgo),
      admin.from("lesson_quizzes").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfIndianDay()),
    ])
    if ((lessonStarts ?? 0) >= QUIZ_STARTS_PER_LESSON_PER_HOUR) {
      return NextResponse.json(
        { error: `That's ${QUIZ_STARTS_PER_LESSON_PER_HOUR} tries at this quiz in the last hour. Review the lesson and try again later.` },
        { status: 429 },
      )
    }
    if ((dayStarts ?? 0) >= QUIZ_STARTS_PER_DAY) {
      return NextResponse.json({ error: "You've reached today's quiz limit. Come back tomorrow." }, { status: 429 })
    }

    const questions = await generateLessonQuiz(lesson.topic.title ?? "this lesson", lesson.topic.description ?? "")
    const { data: quiz, error: insertError } = await admin
      .from("lesson_quizzes")
      .insert({ ...key, questions })
      .select("id, created_at")
      .single()
    if (insertError || !quiz) {
      throw new Error(insertError?.message ?? "Couldn't save the quiz")
    }

    const ref = `${roadmapId}:${moduleIndex}:${topicIndex}`
    const [{ count: alreadyPaid }, { count: paidToday }] = await Promise.all([
      admin.from("point_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("kind", "topic").eq("ref", ref),
      admin
        .from("point_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("kind", "topic")
        .gte("created_at", startOfIndianDay()),
    ])

    const publicQuestions: PublicQuestion[] = questions.map((q) => ({ question: q.question, options: q.options }))
    return NextResponse.json({
      quizId: quiz.id,
      questions: publicQuestions,
      passMark: quizPassMark(questions.length),
      expiresAt: new Date(new Date(quiz.created_at).getTime() + QUIZ_TIME_LIMIT_MINUTES * 60_000).toISOString(),
      alreadyPaid: (alreadyPaid ?? 0) > 0,
      dailyLimitReached: (paidToday ?? 0) >= DAILY_PAID_LESSONS,
    })
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 503 })
    }
    console.error("Error starting quiz:", error)
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 })
  }
}
