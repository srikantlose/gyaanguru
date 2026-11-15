import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NsqfRoadmap } from "@/components/nsqf-roadmap"
import { PageHeader } from "@/components/page-header"
import { SpotIllustration } from "@/components/illustrations"
import { createClient } from "@/lib/supabase/server"
import { dayKey, resolveLevel } from "@/lib/learner"
import { buildPath } from "@/lib/nsqf-path"
import { NSQF_MAX_LEVEL, NSQF_MIN_LEVEL } from "@/lib/nsqf"
import type { LearnerLevel } from "@/lib/placement"
import { QUALIFICATIONS_CHECKED_ON, getTrack, listTracks } from "@/lib/qualifications"
import { cn } from "@/lib/utils"

export const metadata = { title: "NSQF path planner" }

type Onboarding = {
  aspirations?: { targetJobRole?: string; shortTermGoal?: string }
  priorSkills?: { skills?: string }
  academicBackground?: { highestQualification?: string }
  current_nsqf_level?: number
}

const pill = (active: boolean) =>
  cn(
    "rounded-full border-2 border-ink px-3 py-1 text-sm font-bold text-ink transition",
    active ? "bg-marigold shadow-soft" : "bg-card hover:bg-paper",
  )

// Rule-based, no AI: a ladder of real qualifications from the National Qualifications Register.
export default async function NsqfPathPage({ searchParams }: { searchParams: Promise<{ track?: string; level?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let mine: LearnerLevel = { value: null, source: "estimated" }
  let goal = ""
  if (user) {
    const [{ data: profile }, { data: placement }] = await Promise.all([
      supabase.from("profiles").select("onboarding_data").eq("id", user.id).maybeSingle(),
      supabase.rpc("placement_result"),
    ])
    const o = ((profile?.onboarding_data as Onboarding | null) ?? {}) as Onboarding
    mine = resolveLevel(placement, o, [])
    goal = [o.aspirations?.targetJobRole, o.aspirations?.shortTermGoal, o.priorSkills?.skills].filter(Boolean).join(" ")
  }

  const asked = Number(sp.level)
  const pickedLevel = Number.isInteger(asked) && asked >= NSQF_MIN_LEVEL && asked <= NSQF_MAX_LEVEL ? asked : null
  const level: LearnerLevel = pickedLevel !== null ? { value: pickedLevel, source: "estimated" } : mine
  const path = buildPath({
    goal,
    track: getTrack(sp.track)?.id ?? (mine.source === "tested" ? mine.track : null),
    level: level.value ?? NSQF_MIN_LEVEL,
    today: dayKey(new Date()),
  })
  const href = (track: string, lvl: number | null) => `/nsqf/demo?track=${track}${lvl ? `&level=${lvl}` : ""}`

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10 sm:py-12">
      <PageHeader
        eyebrow="NSQF path"
        tone="marigold"
        title="Plan your qualification path"
        description="Pick a track and where you're starting. You'll see real NSQF qualifications at each level up to 6, each one you can build a roadmap on and then take officially."
        art={<SpotIllustration kind="nsqf" />}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your path</CardTitle>
          <CardDescription>
            Qualifications come from the National Qualifications Register (checked {QUALIFICATIONS_CHECKED_ON}). GyaanGuru prepares you;
            the awarding body assesses and certifies you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-bold text-ink">Track</p>
            <div className="flex flex-wrap gap-2">
              {listTracks().map((t) => (
                <Link key={t.id} href={href(t.id, pickedLevel)} className={pill(t.id === path.track.id)} aria-current={t.id === path.track.id ? "true" : undefined}>
                  {t.name}
                </Link>
              ))}
            </div>
            <p className="text-sm text-ink/65">{path.track.blurb}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-ink">Starting level</p>
            <div className="flex flex-wrap items-center gap-2">
              {[3, 4, 5, 6].map((l) => (
                <Link key={l} href={href(path.track.id, l)} className={pill(path.startLevel === l)} aria-current={path.startLevel === l ? "true" : undefined}>
                  L{l}
                </Link>
              ))}
              <span className="text-sm text-ink/65">
                {user ? (
                  mine.source === "tested" ? (
                    <>Your tested level is L{mine.value}.</>
                  ) : (
                    <>
                      Not sure?{" "}
                      <Link href="/placement" className="font-semibold text-primary underline underline-offset-4">
                        Take the placement test
                      </Link>
                      .
                    </>
                  )
                ) : (
                  <>
                    <Link href="/auth/sign-up" className="font-semibold text-primary underline underline-offset-4">
                      Sign up
                    </Link>{" "}
                    to take a placement test.
                  </>
                )}
              </span>
            </div>
          </div>
          <NsqfRoadmap
            nodes={path.path}
            level={{ ...level, value: path.startLevel }}
            trackName={path.track.name}
            label={pickedLevel !== null || mine.value === null ? `Starting at L${path.startLevel}` : undefined}
          />
        </CardContent>
      </Card>
    </main>
  )
}
