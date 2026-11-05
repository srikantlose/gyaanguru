import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { onboardingData, finalize } = body || {}
    const data = onboardingData ?? body

    const updates: Record<string, any> = {
      onboarding_data: data,
    }
    if (finalize) {
      updates.onboarded = true
      updates.onboarded_at = new Date().toISOString()
    }

    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)

    if (error) {
      // Surface schema-missing in a clear way so the client can guide the user
      const needsMigration =
        error.code === "PGRST204" ||
        (typeof error.message === "string" && error.message.toLowerCase().includes("schema"))

      if (needsMigration) {
        return NextResponse.json(
          {
            error: "SchemaNotMigrated",
            message:
              "Required columns are missing (profiles.onboarding_data/onboarded). Please run the migration scripts.",
          },
          { status: 412 },
        )
      }

      return NextResponse.json({ error: "Failed to save onboarding data" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[v0] Onboarding error:", e)
    return NextResponse.json({ error: "Failed to save onboarding data" }, { status: 500 })
  }
}
