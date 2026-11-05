import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: roadmap, error } = await supabase
      .from("roadmaps")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 })
    }

    return NextResponse.json({ roadmap })
  } catch (error) {
    console.error("Error fetching roadmap:", error)
    return NextResponse.json({ error: "Failed to fetch roadmap" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase.from("roadmaps").delete().eq("id", id).eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: "Failed to delete roadmap" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting roadmap:", error)
    return NextResponse.json({ error: "Failed to delete roadmap" }, { status: 500 })
  }
}
