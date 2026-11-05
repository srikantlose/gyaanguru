import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const POINTS_PER_TOPIC = 5

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// Atomic increment/decrement (clamped at 0) via the adjust_points SQL function in scripts/schema.sql.
async function adjustPoints(supabase: SupabaseClient, delta: number) {
  const { error } = await supabase.rpc("adjust_points", { delta })
  if (error) {
    // Progress is already saved; a failed points update shouldn't fail the request.
    console.error("Error adjusting points:", error)
  }
}

export async function POST(request: Request) {
  try {
    const { roadmapId, moduleIndex, topicIndex, completed } = await request.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (completed) {
      // ignoreDuplicates + select returns only rows that were actually inserted, so repeated or
      // concurrent "complete" clicks award points once.
      const { data: inserted, error } = await supabase
        .from("progress")
        .upsert(
          {
            user_id: user.id,
            roadmap_id: roadmapId,
            module_index: moduleIndex,
            topic_index: topicIndex,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,roadmap_id,module_index,topic_index",
            ignoreDuplicates: true,
          },
        )
        .select("id")

      if (error) {
        console.error("Error saving progress:", error)
        return NextResponse.json({ error: "Failed to save progress" }, { status: 500 })
      }

      if (inserted && inserted.length > 0) {
        await adjustPoints(supabase, POINTS_PER_TOPIC)
      }
    } else {
      // Mark as incomplete (delete the record); deduct only if a row was actually removed.
      const { data: removed, error } = await supabase
        .from("progress")
        .delete()
        .eq("user_id", user.id)
        .eq("roadmap_id", roadmapId)
        .eq("module_index", moduleIndex)
        .eq("topic_index", topicIndex)
        .select("id")

      if (error) {
        console.error("Error removing progress:", error)
        return NextResponse.json({ error: "Failed to remove progress" }, { status: 500 })
      }

      if (removed && removed.length > 0) {
        await adjustPoints(supabase, -POINTS_PER_TOPIC)
      }
    }

    const { data: profileAfter } = await supabase.from("profiles").select("points").eq("id", user.id).single()

    return NextResponse.json({ success: true, points: profileAfter?.points ?? 0 })
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
