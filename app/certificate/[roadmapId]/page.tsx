import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/logo"
import { Stamp } from "@/components/doodles"
import { PrintButton } from "@/components/print-button"

export const metadata = {
  title: "Completion certificate",
}

type Topic = { estimatedHours?: number | string }
type Module = { topics?: Topic[] }

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })

export default async function CertificatePage({ params }: { params: Promise<{ roadmapId: string }> }) {
  const { roadmapId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("id, title, nsqf_level, content")
    .eq("id", roadmapId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!roadmap) {
    notFound()
  }

  const [{ data: redemption }, { data: profile }, { data: lastLesson }] = await Promise.all([
    supabase
      .from("reward_redemptions")
      .select("id, created_at")
      .eq("user_id", user.id)
      .eq("reward_id", "completion-certificate")
      .eq("target_id", roadmapId)
      .maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("progress")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("roadmap_id", roadmapId)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!redemption) {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="brut mx-auto flex max-w-lg flex-col items-center rounded-3xl bg-card p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-marigold">
            <Lock className="h-6 w-6 text-ink" />
          </span>
          <h1 className="mt-5 text-2xl text-ink">This certificate isn&apos;t unlocked yet</h1>
          <p className="mt-2 text-ink/70">
            Finish every lesson in <strong className="text-ink">{roadmap.title}</strong>, then redeem a Completion Certificate on
            the rewards page.
          </p>
          <Button asChild className="mt-6">
            <Link href="/rewards">Go to rewards</Link>
          </Button>
        </div>
      </main>
    )
  }

  const modules: Module[] = Array.isArray(roadmap.content?.modules) ? roadmap.content.modules : []
  const lessons = modules.reduce((acc, m) => acc + (m.topics?.length ?? 0), 0)
  const hours = Math.round(modules.reduce((acc, m) => acc + (m.topics ?? []).reduce((h, t) => h + (Number(t.estimatedHours) || 0), 0), 0) * 10) / 10
  const name = profile?.full_name?.trim() || user.email || "GyaanGuru learner"
  const completedOn = longDate(lastLesson?.completed_at ?? redemption.created_at)
  const certificateNo = redemption.id.slice(0, 8).toUpperCase()

  return (
    <main className="container mx-auto px-4 py-8 sm:py-10 print:p-0">
      <div className="mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="outline">
          <Link href="/rewards">
            <ArrowLeft className="h-4 w-4" />
            Back to rewards
          </Link>
        </Button>
        <PrintButton />
      </div>

      <article
        className="relative mx-auto max-w-4xl rounded-3xl border-4 border-ink bg-card p-3 shadow-lift print:max-w-none print:shadow-none"
        aria-label={`Certificate of completion for ${roadmap.title}`}
      >
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-ink/50 px-6 py-10 text-center sm:px-14 sm:py-14">
          <div className="flex items-center justify-center gap-3">
            <LogoMark className="h-12 w-12" />
            <span className="font-display text-2xl font-black text-ink [font-stretch:115%]">GyaanGuru</span>
          </div>

          <p className="mt-8 font-display text-sm font-extrabold uppercase tracking-[0.3em] text-coral-ink">Certificate of completion</p>
          <p className="mt-6 text-ink/70">This is to certify that</p>
          <p className="mt-2 break-words font-display text-3xl font-black text-ink sm:text-5xl">{name}</p>
          <p className="mt-4 text-ink/70">completed every lesson of the GyaanGuru learning roadmap</p>
          <p className="mt-3 text-2xl font-extrabold leading-snug text-ink sm:text-3xl">
            <span className="marker">{roadmap.title}</span>
          </p>

          <dl className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 text-left sm:grid-cols-4">
            {[
              { label: "NSQF level", value: typeof roadmap.nsqf_level === "number" ? `L${roadmap.nsqf_level}` : "–" },
              { label: "Lessons", value: lessons },
              { label: "Study hours", value: hours },
              { label: "Completed", value: completedOn },
            ].map((d) => (
              <div key={d.label} className="rounded-xl border-2 border-ink bg-paper px-3 py-2">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-ink/60">{d.label}</dt>
                <dd className="font-display text-base font-extrabold text-ink">{d.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-end">
            <div className="text-left">
              <p className="hand text-3xl text-ink">GyaanGuru</p>
              <div className="mt-1 w-48 border-t-2 border-ink" />
              <p className="mt-1 text-xs font-semibold text-ink/60">Issued {longDate(redemption.created_at)}</p>
            </div>
            <Stamp text="GYAANGURU • COMPLETED • " center="ज्ञान" tone="coral" className="h-28 w-28 -rotate-12" />
            <div className="text-left sm:text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-ink/60">Certificate no.</p>
              <p className="font-display text-lg font-extrabold text-ink">GG-{certificateNo}</p>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-xl text-xs leading-relaxed text-ink/60">
            Issued by GyaanGuru for learning completed on the platform. The NSQF level is GyaanGuru&apos;s rating of the roadmap; this
            is not an NCVET-approved qualification.
          </p>
        </div>
      </article>
    </main>
  )
}
