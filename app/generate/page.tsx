import { RoadmapGenerator } from "@/components/roadmap-generator"
import { PageHeader } from "@/components/page-header"
import { MapIllustration } from "@/components/illustrations"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { dayKey, resolveLevel } from "@/lib/learner"

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ qualification?: string | string[] }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { qualification } = await searchParams
  const [{ data: profile }, { data: placement }] = await Promise.all([
    supabase.from("profiles").select("onboarding_data").eq("id", user.id).maybeSingle(),
    supabase.rpc("placement_result"),
  ])
  const level = resolveLevel(placement, (profile?.onboarding_data as Record<string, unknown>) ?? {}, [])
  // Suggest qualifications at the level to aim for next: the tested target, else the estimate.
  const band = level.target ?? level.value

  return (
    <main className="container mx-auto px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="New roadmap"
          tone="coral"
          title="Build your learning roadmap"
          description="Answer a few quick questions. We'll lay out modules and lessons in order, sized to your week. Target a real NSQF qualification and the modules follow its official units."
          art={<MapIllustration />}
        />
        <RoadmapGenerator initialQualificationId={typeof qualification === "string" ? qualification : null} band={band} today={dayKey(new Date())} />
      </div>
    </main>
  )
}
