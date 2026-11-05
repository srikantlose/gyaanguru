import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface Topic {
  id: string
  title: string
  description: string
  estimatedHours: number
  notes?: string | string[]
  inDepthContent?: string | string[]
}

interface Module {
  id: string
  title: string
  notes?: string | string[]
  inDepthContent?: string | string[]
  topics: Topic[]
}

interface CourseRoadmapData {
  title: string
  description: string
  modules: Module[]
}

export async function POST(request: Request) {
  try {
    const { roadmap, meta, nsqfLevel } = await request.json()

    if (!roadmap?.title || !Array.isArray(roadmap?.modules)) {
      return NextResponse.json({ error: "Invalid roadmap payload" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const education: string = meta?.education || "N/A"
    const skills: string[] = Array.isArray(meta?.skills) ? meta.skills : []
    const goal: string = meta?.goal || "NSQF Pathway"

    const content: CourseRoadmapData = roadmap
    const nsqf_level = typeof nsqfLevel === "number" ? nsqfLevel : null
    const nsqf_description = nsqf_level ? `NSQF pathway up to Level ${nsqf_level} for goal "${goal}".` : null

    const { data: saved, error: insertError } = await supabase
      .from("roadmaps")
      .insert({
        user_id: user.id,
        title: content.title,
        topic: goal || "NSQF Course",
        experience_level: education || "N/A",
        goal,
        time_commitment: "N/A",
        additional_info: skills.join(", "),
        content,
        nsqf_level,
        nsqf_description,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error saving NSQF course:", insertError)
      return NextResponse.json({ error: "Failed to save roadmap" }, { status: 500 })
    }

    return NextResponse.json({ id: saved.id, roadmap: saved.content })
  } catch (err) {
    console.error("[v0] NSQF save-roadmap error:", err)
    return NextResponse.json({ error: "Failed to save roadmap" }, { status: 500 })
  }
}
