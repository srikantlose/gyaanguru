import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowDown, ExternalLink, Landmark } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { RoadmapVisualization } from "@/components/roadmap-visualization"
import { CertificationHandoff } from "@/components/certification-handoff"
import { coreUnits, formatLevel, getQualification, type QualificationRef } from "@/lib/qualifications"

type Topic = { estimatedHours?: number | string }
type Module = { topics?: Topic[] }

export default async function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const [{ data: roadmap, error }, { data: verifiedIds }] = await Promise.all([
    supabase.from("roadmaps").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.rpc("verified_roadmaps"),
  ])

  if (error || !roadmap) {
    redirect("/dashboard")
  }

  const snapshot = (roadmap.content?.qualification ?? null) as QualificationRef | null
  // Display catalogue data by id; the roadmap's own copy is user-writable.
  const qualification = getQualification(snapshot?.id)
  const modules: Module[] = Array.isArray(roadmap.content?.modules) ? roadmap.content.modules : []
  const hours = modules.reduce((acc, m) => acc + (m.topics ?? []).reduce((h, t) => h + (Number(t.estimatedHours) || 0), 0), 0)
  const verified = Array.isArray(verifiedIds) && (verifiedIds as string[]).includes(roadmap.id)

  return (
    <main className="py-10 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl space-y-6">
          {qualification ? (
            <section
              aria-label="NSQF qualification"
              className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-leaf-soft p-5 shadow-brut sm:flex-row sm:items-center"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-leaf font-display text-xl font-black text-ink shadow-soft">
                L{formatLevel(qualification.level)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-leaf-ink">Prepares you for a real NSQF qualification</p>
                <p className="font-display text-lg font-bold text-ink">{qualification.title}</p>
                <p className="mt-1 text-sm text-ink/70">
                  NSQF level {formatLevel(qualification.level)} · NQR code <span className="font-mono text-xs">{qualification.code}</span> ·
                  awarded by {qualification.awardingBody}. Each module below covers one of its {coreUnits(qualification).length} official units.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                <a
                  href="#get-certified"
                  className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-card px-3 py-1 text-sm font-bold text-ink shadow-soft"
                >
                  How to get certified <ArrowDown className="h-3.5 w-3.5" />
                </a>
                <a
                  href={qualification.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-card px-3 py-1 text-sm font-bold text-ink shadow-soft"
                >
                  On nqr.gov.in <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </section>
          ) : snapshot ? (
            <section aria-label="NSQF qualification" className="rounded-2xl border-2 border-ink bg-marigold-soft p-5 shadow-brut">
              <p className="text-xs font-bold uppercase tracking-wider text-marigold-ink">Built on an NSQF qualification</p>
              <p className="font-display text-lg font-bold text-ink">{snapshot.title}</p>
              <p className="mt-1 text-sm text-ink/70">
                This qualification is no longer in GyaanGuru&apos;s list, so it may have been replaced by a newer version. Search for it
                on{" "}
                <a href="https://www.nqr.gov.in/" target="_blank" rel="noreferrer" className="font-bold text-primary underline-offset-2 hover:underline">
                  nqr.gov.in
                </a>{" "}
                before you plan an assessment.
              </p>
            </section>
          ) : typeof roadmap.nsqf_level === "number" ? (
            <section
              aria-label="Estimated NSQF level"
              className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-marigold-soft p-5 shadow-brut sm:flex-row sm:items-center"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-marigold font-display text-2xl font-black text-ink shadow-soft">
                ≈{roadmap.nsqf_level}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-marigold-ink">Estimated NSQF level</p>
                <p className="font-display text-lg font-bold text-ink">About level {roadmap.nsqf_level}</p>
                <p className="mt-1 text-sm text-ink/70">
                  An estimate from your experience and goal. This roadmap isn&apos;t linked to an official qualification.
                </p>
              </div>
              <Link
                href="/generate"
                className="inline-flex items-center gap-1.5 self-start rounded-full border-2 border-ink bg-card px-3 py-1 text-sm font-bold text-ink shadow-soft sm:self-center"
              >
                <Landmark className="h-3.5 w-3.5" /> Build one on a real qualification
              </Link>
            </section>
          ) : null}
          <RoadmapVisualization roadmap={roadmap.content} roadmapId={roadmap.id} />
          {qualification && <CertificationHandoff qualification={qualification} roadmapHours={hours} verified={verified} />}
        </div>
      </div>
    </main>
  )
}
