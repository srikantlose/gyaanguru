"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ClipboardList, ExternalLink, Loader2, RotateCcw, Route, TriangleAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuizQuestions } from "@/components/quiz-questions"
import { getNsqfDescriptor } from "@/lib/nsqf"
import {
  PLACEMENT_BANDS,
  PLACEMENT_BAND_PASS,
  PLACEMENT_PER_BAND,
  PLACEMENT_STARTS_PER_DAY,
  PLACEMENT_TIME_LIMIT_MINUTES,
  type BandScores,
  type PublicPlacementQuestion,
} from "@/lib/placement"
import { coreUnits, formatLevel, isCurrent, recommend } from "@/lib/qualifications"
import { cn } from "@/lib/utils"

type TrackInfo = { id: string; name: string; blurb: string }
type LastResult = { placed: number; target: number | null; track: string | null; takenAt: string | null }
type Test = { testId: string; track: string; questions: PublicPlacementQuestion[]; expiresAt: string }
type Result = {
  track: string
  bandScores: BandScores
  placed: number
  target: number
  passedAny: boolean
  results: { band: number; unit: string; correctAnswer: number; explanation: string }[]
}

type Props = {
  tracks: TrackInfo[]
  defaultTrack: string
  last: LastResult | null
  estimate: number | null
  /** False when the server has no SUPABASE_SECRET_KEY, so tests can't be stored or marked. */
  enabled: boolean
  welcome: boolean
  today: string
}

const panel = "rounded-3xl border-2 border-ink bg-card p-5 shadow-brut sm:p-7"
const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })

export function PlacementClient({ tracks, defaultTrack, last, estimate, enabled, welcome, today }: Props) {
  const router = useRouter()
  const [track, setTrack] = useState(defaultTrack)
  const [test, setTest] = useState<Test | null>(null)
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trackName = (id: string | null) => tracks.find((t) => t.id === id)?.name ?? "this track"

  const start = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/placement/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return router.push("/auth/login")
      if (!res.ok || !data.testId) throw new Error(data?.error || "Couldn't start the test. Please try again.")
      setTest(data)
      setSelected({})
      setResult(null)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the test. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const submit = async () => {
    if (!test) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/placement/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId: test.testId, answers: test.questions.map((_, i) => selected[i] ?? -1) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data.placed !== "number") throw new Error(data?.error || "Couldn't mark the test. Please try again.")
      setResult(data)
      router.refresh()
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't mark the test. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const errorBox = error && (
    <p role="alert" className="flex items-start gap-2 rounded-xl border-2 border-ink bg-coral-soft px-4 py-3 text-sm font-semibold text-ink">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
    </p>
  )

  // ---- result
  if (test && result) {
    const placedDesc = getNsqfDescriptor(result.placed)
    const recs = recommend(result.track, result.target).filter((q) => isCurrent(q, today)).slice(0, 3)
    return (
      <div className="space-y-6">
        <section className={cn(panel, "bg-leaf-soft")} aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-wider text-leaf-ink">Your result · {trackName(result.track)}</p>
          <h2 className="mt-1 text-3xl text-ink">{result.passedAny ? `Tested at NSQF level ${result.placed}` : "Start at level 3"}</h2>
          <p className="mt-2 max-w-2xl text-ink/80">
            {result.passedAny
              ? `Your answers matched level-${result.placed} work in ${trackName(result.track)}. The official descriptor for that level: “${placedDesc.outcomes.detail}”`
              : `You didn't pass the level-3 questions this time, so level-3 qualifications are the place to start.`}{" "}
            {result.placed < 6 || !result.passedAny ? `Aim next for a level-${result.target} qualification.` : "That's the top level GyaanGuru covers."}
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-4" aria-label="Score per level">
            {PLACEMENT_BANDS.map((b) => {
              const score = result.bandScores[String(b)] ?? 0
              const passed = score >= PLACEMENT_BAND_PASS
              return (
                <li key={b} className={cn("flex items-center justify-between rounded-xl border-2 border-ink px-3 py-2", passed ? "bg-card" : "bg-coral-soft")}>
                  <span className="font-display font-black text-ink">L{b}</span>
                  <span className="flex items-center gap-1 text-sm font-bold text-ink">
                    {score}/{PLACEMENT_PER_BAND} {passed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-xs text-ink/65">
            This is GyaanGuru&apos;s practice placement test, not an official NSQF assessment. Only an awarding body can certify a level.
          </p>
        </section>

        {recs.length > 0 && (
          <section className={panel}>
            <h2 className="text-xl text-ink">Qualifications to aim for next</h2>
            <p className="mt-1 text-sm text-ink/70">Real qualifications from the National Qualifications Register at level {result.target}.</p>
            <ul className="mt-4 space-y-3">
              {recs.map((q) => (
                <li key={q.id} className="rounded-2xl border-2 border-ink bg-paper p-4">
                  <p className="font-bold text-ink">
                    {q.title} <span className="font-display text-sm font-black">· L{formatLevel(q.level)}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink/65">
                    {coreUnits(q).length} units · {q.awardingBody.replace(/\s*\(.*\)\s*$/, "")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={`/generate?qualification=${q.id}`}>
                        <Route className="h-4 w-4" /> Plan a roadmap for this
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <a href={q.url} target="_blank" rel="noreferrer">
                        On nqr.gov.in <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={panel}>
          <h2 className="text-xl text-ink">Your answers</h2>
          <div className="mt-4 space-y-8">
            <QuizQuestions questions={test.questions} selected={selected} onSelect={() => {}} results={result.results} />
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to the dashboard</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setTest(null)
              setResult(null)
            }}
          >
            <RotateCcw className="h-4 w-4" /> Take it again
          </Button>
        </div>
      </div>
    )
  }

  // ---- the test
  if (test) {
    const answered = Object.keys(selected).length
    return (
      <div className="space-y-6">
        <p className="rounded-xl border-2 border-ink bg-marigold-soft px-4 py-2.5 text-sm font-semibold text-ink">
          {trackName(test.track)} · {test.questions.length} questions · submit by{" "}
          {new Date(test.expiresAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}
        </p>
        {PLACEMENT_BANDS.map((b) => {
          const first = test.questions.findIndex((q) => q.band === b)
          const qs = test.questions.filter((q) => q.band === b)
          if (first < 0) return null
          return (
            <section key={b} className={panel} aria-labelledby={`band-${b}`}>
              <h2 id={`band-${b}`} className="flex items-center gap-2 text-xl text-ink">
                <span className="rounded-lg border-2 border-ink bg-marigold px-2 font-display text-base font-black">L{b}</span>
                Level {b} questions
              </h2>
              <div className="mt-4 space-y-6">
                <QuizQuestions
                  questions={qs}
                  startAt={first}
                  selected={selected}
                  onSelect={(qi, oi) => setSelected((prev) => ({ ...prev, [qi]: oi }))}
                  disabled={loading}
                />
              </div>
            </section>
          )
        })}
        {errorBox}
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-card px-4 py-3 shadow-lift">
          <span className="text-sm font-semibold text-ink">
            {answered}/{test.questions.length} answered
          </span>
          <Button onClick={submit} disabled={loading || answered < test.questions.length}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
            Submit the test
          </Button>
        </div>
      </div>
    )
  }

  // ---- intro
  return (
    <div className="space-y-6">
      {last && (
        <p className="rounded-xl border-2 border-ink bg-leaf-soft px-4 py-3 text-sm font-semibold text-ink">
          Your last result: tested at L{last.placed} in {trackName(last.track)}
          {last.takenAt ? ` on ${longDate(last.takenAt)}` : ""}. Taking it again replaces it.
        </p>
      )}
      {!last && estimate !== null && (
        <p className="rounded-xl border-2 border-ink bg-marigold-soft px-4 py-3 text-sm font-semibold text-ink">
          Right now your level is an estimate (about L{estimate}) from your education. The test replaces it with a tested level.
        </p>
      )}
      <section className={panel}>
        <h2 className="text-xl text-ink">Pick a track</h2>
        <div role="radiogroup" aria-label="Track" className="mt-4 grid gap-3 sm:grid-cols-2">
          {tracks.map((t) => {
            const on = t.id === track
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setTrack(t.id)}
                className={cn("rounded-2xl border-2 border-ink p-4 text-left transition", on ? "bg-lagoon-soft shadow-soft" : "bg-card hover:bg-paper")}
              >
                <span className="flex items-center justify-between gap-2 font-bold text-ink">
                  {t.name}
                  {on && <Check className="h-4 w-4 shrink-0" />}
                </span>
                <span className="mt-1 block text-sm text-ink/70">{t.blurb}</span>
              </button>
            )
          })}
        </div>
        <ul className="mt-5 list-disc space-y-1 pl-5 text-sm text-ink/75">
          <li>
            {PLACEMENT_PER_BAND} questions at each of levels 3, 4, 5 and 6, built from the units of real qualifications in this track.
          </li>
          <li>
            Pass a level with {PLACEMENT_BAND_PASS} of {PLACEMENT_PER_BAND}. Your level is the highest one you pass along with every level below it.
          </li>
          <li>
            {PLACEMENT_TIME_LIMIT_MINUTES} minutes to submit. Up to {PLACEMENT_STARTS_PER_DAY} tests a day.
          </li>
        </ul>
        {!enabled && (
          <p className="mt-4 rounded-xl border-2 border-ink bg-coral-soft px-4 py-3 text-sm font-semibold text-ink">
            Placement tests are off on this server: it needs SUPABASE_SECRET_KEY to store and mark them.
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={start} disabled={loading || !enabled} size="lg">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ClipboardList className="h-5 w-5" />}
            {loading ? "Writing your test..." : last ? "Take the test again" : "Start the test"}
          </Button>
          {welcome && (
            <Link href="/dashboard" className="text-sm font-bold text-ink/70 underline underline-offset-4">
              Skip for now
            </Link>
          )}
        </div>
        {errorBox && <div className="mt-4">{errorBox}</div>}
      </section>
    </div>
  )
}
