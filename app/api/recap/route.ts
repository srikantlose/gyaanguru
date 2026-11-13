import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ADMIN_MISSING_MESSAGE, createAdminClient } from "@/lib/supabase/admin"
import { AI_BUSY_MESSAGE, AIUnavailableError } from "@/lib/gemini"
import { checkRecap } from "@/lib/quiz"
import { RECAP_ATTEMPTS_PER_DAY, RECAP_MAX_CHARS, RECAP_MIN_CHARS } from "@/lib/rewards"

const RecapSchema = z.object({
  roadmapId: z.uuid(),
  recap: z.string().trim().min(RECAP_MIN_CHARS).max(RECAP_MAX_CHARS),
})

type Module = { title?: string; topics?: { title?: string }[] }

/**
 * The last step to verify a roadmap: once every lesson quiz is passed, the learner writes a short
 * recap and Gemini checks it shows real understanding. Approval pays the roadmap bonus.
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

    const parsed = RecapSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Write between ${RECAP_MIN_CHARS} and ${RECAP_MAX_CHARS} characters about what you learned.` },
        { status: 400 },
      )
    }
    const { roadmapId, recap } = parsed.data

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: ADMIN_MISSING_MESSAGE, code: "QuizNotConfigured" }, { status: 503 })
    }

    const { data: roadmap } = await supabase
      .from("roadmaps")
      .select("id, title, content")
      .eq("id", roadmapId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 })
    }
    const modules: Module[] = Array.isArray(roadmap.content?.modules) ? roadmap.content.modules : []
    const lessons = modules.reduce((acc, m) => acc + (m.topics?.length ?? 0), 0)

    const { data: status, error: statusError } = await supabase.rpc("quiz_status", { p_roadmap_id: roadmapId })
    if (statusError) throw new Error(statusError.message)
    const passed = Array.isArray(status?.passed) ? status.passed.length : 0
    if (status?.recap_approved) {
      return NextResponse.json({ error: "Your recap for this roadmap is already approved." }, { status: 409 })
    }
    if (lessons === 0 || passed < lessons) {
      return NextResponse.json({ error: `Pass every lesson quiz first (${passed} of ${lessons} passed).` }, { status: 400 })
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
    const { count: attempts } = await admin
      .from("roadmap_recaps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("roadmap_id", roadmapId)
      .gte("created_at", dayAgo)
    if ((attempts ?? 0) >= RECAP_ATTEMPTS_PER_DAY) {
      return NextResponse.json({ error: "That's enough tries for today. Have another go tomorrow." }, { status: 429 })
    }

    const verdict = await checkRecap({ title: roadmap.title, modules }, recap)
    const { error: insertError } = await admin.from("roadmap_recaps").insert({
      user_id: user.id,
      roadmap_id: roadmapId,
      recap,
      approved: verdict.approved,
      feedback: verdict.feedback,
    })
    if (insertError) throw new Error(insertError.message)

    let bonus = 0
    if (verdict.approved) {
      const { data, error } = await admin.rpc("award_roadmap_bonus", { p_user_id: user.id, p_roadmap_id: roadmapId })
      if (error) console.error("Error paying roadmap bonus:", error)
      else bonus = Number(data) || 0
    }

    return NextResponse.json({ approved: verdict.approved, feedback: verdict.feedback, bonus })
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 503 })
    }
    console.error("Error checking recap:", error)
    return NextResponse.json({ error: "Couldn't check your recap. Please try again." }, { status: 500 })
  }
}
