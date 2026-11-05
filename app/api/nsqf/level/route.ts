import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { clampNsqfLevel } from "@/lib/nsqf"

export async function POST(request: Request) {
  try {
    const { level } = (await request.json()) as { level: number }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch current onboarding_data
    const { data: profile, error: fetchErr } = await supabase
      .from("profiles")
      .select("onboarding_data")
      .eq("id", user.id)
      .single()

    if (fetchErr) {
      console.error("[v0] Fetch profile failed:", fetchErr)
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 })
    }

    const safeLevel = clampNsqfLevel(Number(level) || 0)

    const current = (profile?.onboarding_data as Record<string, any>) || {}
    const updated = { ...current, current_nsqf_level: safeLevel }

    const { error: updateErr } = await supabase.from("profiles").update({ onboarding_data: updated }).eq("id", user.id)

    if (updateErr) {
      console.error("[v0] Update profile failed:", updateErr)
      return NextResponse.json({ error: "Failed to update level" }, { status: 500 })
    }

    return NextResponse.json({ success: true, level: safeLevel })
  } catch (e) {
    console.error("[v0] Failed to update current NSQF level:", e)
    return NextResponse.json({ error: "Failed to update level" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("onboarding_data")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("[v0] Fetch profile failed:", error)
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 })
    }

    const current = (profile?.onboarding_data as Record<string, any>) || {}
    const level = typeof current.current_nsqf_level === "number" ? current.current_nsqf_level : null

    return NextResponse.json({ level })
  } catch (e) {
    console.error("[v0] Failed to fetch current NSQF level:", e)
    return NextResponse.json({ error: "Failed to fetch level" }, { status: 500 })
  }
}
