import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { SCHEMA_MISSING_MESSAGE, isSchemaMissing, rewardErrorResponse } from "@/lib/rewards"

const ProgressSchema = z.object({
  roadmapId: z.uuid(),
  moduleIndex: z.number().int().min(0),
  topicIndex: z.number().int().min(0),
  completed: z.boolean(),
})

type ProgressResult = { points: number; topic_award: number; bonus_award: number; finished: boolean }

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parsed = ProgressSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid progress update" }, { status: 400 })
    }
    const { roadmapId, moduleIndex, topicIndex, completed } = parsed.data

    // Ticking and points happen together in SQL (scripts/schema.sql): a lesson pays +5 once ever,
    // and finishing every lesson pays the roadmap bonus once. Unticking never changes points.
    const { data, error } = await supabase.rpc(completed ? "complete_topic" : "uncomplete_topic", {
      p_roadmap_id: roadmapId,
      p_module_index: moduleIndex,
      p_topic_index: topicIndex,
    })

    if (error) {
      if (isSchemaMissing(error)) {
        return NextResponse.json({ error: SCHEMA_MISSING_MESSAGE, code: "SchemaNotMigrated" }, { status: 412 })
      }
      const mapped = rewardErrorResponse(error.message)
      if (mapped.status === 500) console.error("Error updating progress:", error)
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }

    const result = data as ProgressResult
    return NextResponse.json({
      success: true,
      points: result.points,
      awarded: { topic: result.topic_award, bonus: result.bonus_award },
      finished: result.finished,
    })
  } catch (error) {
    console.error("Error updating progress:", error)
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roadmapId = searchParams.get("roadmapId")

    if (!roadmapId) {
      return NextResponse.json({ error: "Roadmap ID required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: progress, error } = await supabase
      .from("progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("roadmap_id", roadmapId)

    if (error) {
      console.error("Error fetching progress:", error)
      return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 })
    }

    return NextResponse.json({ progress })
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 })
  }
}
