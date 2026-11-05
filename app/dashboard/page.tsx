import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, BookOpen, CheckCircle2, Clock, Layers, Map as MapIcon, Plus, Sparkle, Star, UserRound } from "lucide-react"
import { DeleteRoadmapButton } from "@/components/delete-roadmap-button"
import { PageHeader } from "@/components/page-header"
import { SpotlightCard } from "@/components/spotlight-card"
import { GrowthIllustration, MapIllustration } from "@/components/illustrations"
import { cn } from "@/lib/utils"

// Cycled per roadmap card so the grid reads as distinct, colorful items.
const CARD_TONES = [
  { tone: "brand", bar: "bg-brand", soft: "bg-brand-soft text-brand-ink" },
  { tone: "coral", bar: "bg-coral", soft: "bg-coral-soft text-coral-ink" },
  { tone: "lagoon", bar: "bg-lagoon", soft: "bg-lagoon-soft text-lagoon-ink" },
  { tone: "marigold", bar: "bg-marigold", soft: "bg-marigold-soft text-marigold-ink" },
  { tone: "leaf", bar: "bg-leaf", soft: "bg-leaf-soft text-leaf-ink" },
] as const

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: roadmaps } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // One progress query for all roadmaps instead of one per roadmap.
  const roadmapIds = (roadmaps || []).map((roadmap) => roadmap.id)
  const { data: progressRows } =
    roadmapIds.length > 0
      ? await supabase.from("progress").select("roadmap_id").eq("user_id", user.id).in("roadmap_id", roadmapIds)
      : { data: [] as { roadmap_id: string }[] }

  const completedByRoadmap = new Map<string, number>()
  for (const row of progressRows || []) {
    completedByRoadmap.set(row.roadmap_id, (completedByRoadmap.get(row.roadmap_id) ?? 0) + 1)
  }

  const roadmapsWithProgress = (roadmaps || []).map((roadmap) => {
    const totalTopics = (roadmap.content?.modules ?? []).reduce(
      (acc: number, module: { topics?: unknown[] }) => acc + (module.topics?.length ?? 0),
      0,
    )
    const completedTopics = completedByRoadmap.get(roadmap.id) ?? 0
    const progressPercentage = totalTopics > 0 ? Math.min(100, Math.round((completedTopics / totalTopics) * 100)) : 0

    return {
      ...roadmap,
      totalTopics,
      completedTopics,
      progressPercentage,
    }
  })

  const points = typeof profile?.points === "number" ? profile.points : 0
  const topicsDone = roadmapsWithProgress.reduce((acc, r) => acc + r.completedTopics, 0)
  const savedLevel = profile?.onboarding_data?.current_nsqf_level
  const currentLevel =
    typeof savedLevel === "number"
      ? savedLevel
      : roadmapsWithProgress.reduce<number | null>(
          (max, r) => (typeof r.nsqf_level === "number" && (max === null || r.nsqf_level > max) ? r.nsqf_level : max),
          null,
        )

  const stats = [
    { label: "Points", value: points, icon: Star, tile: "bg-marigold-soft", iconBg: "bg-marigold text-ink border-2 border-ink" },
    { label: "Roadmaps", value: roadmapsWithProgress.length, icon: MapIcon, tile: "bg-brand-soft", iconBg: "bg-brand text-ink border-2 border-ink" },
    { label: "Topics done", value: topicsDone, icon: CheckCircle2, tile: "bg-leaf-soft", iconBg: "bg-leaf text-ink border-2 border-ink" },
    {
      label: "NSQF level",
      value: currentLevel ? `L${currentLevel}` : "–",
      icon: Layers,
      tile: "bg-lagoon-soft",
      iconBg: "bg-lagoon text-ink border-2 border-ink",
    },
  ]

  return (
    <main className="container mx-auto px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Dashboard"
          title={`Welcome back${profile?.full_name ? `, ${profile.full_name}` : ""}`}
          description="Pick up where you left off, or start something new."
          actions={
            <>
              <Button asChild size="lg">
                <Link href="/generate">
                  <Plus className="h-5 w-5" />
                  New Roadmap
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/profile">
                  <UserRound className="h-5 w-5 text-lagoon" />
                  Profile
                </Link>
              </Button>
            </>
          }
          art={<GrowthIllustration />}
        />

        {/* stats */}
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tile, iconBg }) => (
            <div
              key={label}
              className={cn(
                "brut brut-interactive flex items-center gap-3 rounded-2xl p-4 sm:p-5",
                tile,
              )}
            >
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconBg)}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <dt className="text-sm font-semibold text-ink/70">{label}</dt>
                <dd className="font-display text-2xl font-extrabold text-ink" data-stat={label}>
                  {value}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        {!profile?.onboarded && (
          <div className="brut mt-6 flex flex-col gap-4 rounded-2xl bg-marigold-soft p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkle className="mt-0.5 h-5 w-5 shrink-0 text-marigold-ink" />
              <div>
                <p className="font-bold text-ink">Tell us a bit about yourself</p>
                <p className="text-sm text-ink/70">A short onboarding helps match roadmaps and jobs to your background.</p>
              </div>
            </div>
            <Button asChild variant="pop">
              <Link href="/onboarding">
                Onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        <div className="mb-5 mt-10 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold text-ink">Your roadmaps</h2>
          {roadmapsWithProgress.length > 0 && (
            <span className="text-sm font-medium text-muted-foreground">{roadmapsWithProgress.length} total</span>
          )}
        </div>

        {roadmapsWithProgress.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-ink bg-card px-6 py-14 text-center">
            <MapIllustration className="w-56" />
            <h3 className="mt-6 text-xl font-bold text-ink">No roadmaps yet</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Create your first personalized learning roadmap to get started
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/generate">
                <Plus className="h-5 w-5" />
                Generate Your First Roadmap
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {roadmapsWithProgress.map((roadmap, i) => {
              const t = CARD_TONES[i % CARD_TONES.length]
              return (
                <SpotlightCard key={roadmap.id} tone={t.tone} className="flex h-full flex-col">
                  <div className={cn("h-3 w-full rounded-t-[14px] border-b-2 border-ink", t.bar)} />
                  <div className="flex h-full flex-col p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-bold capitalize", t.soft)}>
                          {roadmap.experience_level}
                        </span>
                        {typeof roadmap.nsqf_level === "number" && (
                          <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-0.5 text-xs font-bold text-white">
                            NSQF L{roadmap.nsqf_level}
                          </span>
                        )}
                      </div>
                      <DeleteRoadmapButton roadmapId={roadmap.id} />
                    </div>
                    <h3 className="text-lg font-bold leading-snug text-ink">{roadmap.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{roadmap.content.description}</p>

                    <div className="mt-auto space-y-2 pt-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-ink">{roadmap.progressPercentage}%</span>
                        <span className="text-muted-foreground">
                          {roadmap.completedTopics} / {roadmap.totalTopics} topics
                        </span>
                      </div>
                      <div className="h-3.5 overflow-hidden rounded-full border-2 border-ink bg-card">
                        <div
                          className={cn("h-full rounded-full transition-all", t.bar)}
                          style={{ width: `${roadmap.progressPercentage}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {roadmap.content.modules.length} modules
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {roadmap.time_commitment} hrs/week
                        </span>
                      </div>
                    </div>
                    <Button asChild variant="outline" className="group/btn mt-4 w-full">
                      <Link href={`/roadmap/${roadmap.id}`}>
                        {roadmap.progressPercentage > 0 ? "Continue Learning" : "Start Learning"}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </SpotlightCard>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
