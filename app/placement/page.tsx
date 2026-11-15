import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { SpotIllustration } from "@/components/illustrations"
import { PlacementClient } from "@/components/placement-client"
import { dayKey, resolveLevel } from "@/lib/learner"
import { guessTrack, listTracks } from "@/lib/qualifications"

export const metadata = { title: "NSQF placement test" }

type Onboarding = {
  aspirations?: { targetJobRole?: string; shortTermGoal?: string; longTermGoal?: string }
  priorSkills?: { skills?: string }
}

export default async function PlacementPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { welcome } = await searchParams
  const [{ data: profile }, { data: placement }] = await Promise.all([
    supabase.from("profiles").select("onboarding_data").eq("id", user.id).maybeSingle(),
    supabase.rpc("placement_result"),
  ])
  const o = ((profile?.onboarding_data as Onboarding | null) ?? {}) as Onboarding
  const level = resolveLevel(placement, o, [])
  const guessed = guessTrack([o.aspirations?.targetJobRole, o.aspirations?.shortTermGoal, o.aspirations?.longTermGoal, o.priorSkills?.skills].filter(Boolean).join(" "))
  const defaultTrack = (level.source === "tested" ? level.track : null) ?? guessed?.id ?? listTracks()[0].id

  return (
    <main className="container mx-auto px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Placement test"
          tone="lagoon"
          title="Find your NSQF level"
          description="Twelve questions built from the units of real NSQF qualifications, three at each of levels 3 to 6. Marked on the server, so the level you get is one you showed, not one you picked."
          note="about 10 minutes"
          art={<SpotIllustration kind="nsqf" />}
        />
        <PlacementClient
          tracks={listTracks().map((t) => ({ id: t.id, name: t.name, blurb: t.blurb }))}
          defaultTrack={defaultTrack}
          last={level.source === "tested" ? { placed: level.value ?? 3, target: level.target ?? null, track: level.track ?? null, takenAt: level.takenAt ?? null } : null}
          estimate={level.source === "estimated" ? level.value : null}
          enabled={Boolean(process.env.SUPABASE_SECRET_KEY?.trim())}
          welcome={welcome === "1"}
          today={dayKey(new Date())}
        />
      </div>
    </main>
  )
}
