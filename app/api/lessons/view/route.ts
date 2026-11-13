import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadLesson } from "@/lib/quiz"
import { QUIZ_UNLOCK_MINUTES } from "@/lib/rewards"

const ViewSchema = z.object({
  roadmapId: z.uuid(),
  moduleIndex: z.number().int().min(0),
  topicIndex: z.number().int().min(0),
})

/** Records when a lesson was first opened; its quiz unlocks QUIZ_UNLOCK_MINUTES later. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parsed = ViewSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid lesson" }, { status: 400 })
    }
    const { roadmapId, moduleIndex, topicIndex } = parsed.data

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ openedAt: null, unlockAt: null })

    if (!(await loadLesson(supabase, user.id, roadmapId, moduleIndex, topicIndex))) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    const key = { user_id: user.id, roadmap_id: roadmapId, module_index: moduleIndex, topic_index: topicIndex }
    await admin.from("lesson_views").upsert(key, { onConflict: "user_id,roadmap_id,module_index,topic_index", ignoreDuplicates: true })
    const { data } = await admin.from("lesson_views").select("first_opened_at").match(key).maybeSingle()
    const openedAt = data?.first_opened_at ?? null

    return NextResponse.json({
      openedAt,
      unlockAt: openedAt ? new Date(new Date(openedAt).getTime() + QUIZ_UNLOCK_MINUTES * 60_000).toISOString() : null,
    })
  } catch (error) {
    console.error("Error recording lesson view:", error)
    return NextResponse.json({ error: "Failed to record lesson view" }, { status: 500 })
  }
}
