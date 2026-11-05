"use client"

import { useState } from "react"
import { Clock, Loader2, Scale, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Range = { min: number; max: number }
type Outcome = {
  course: string
  typicalRoles: string[]
  entrySalaryLPA: Range
  fiveYearSalaryLPA: Range
  demand: "low" | "medium" | "high"
  monthsToJobReady: number
  nsqfLevel: number
  keySkills: string[]
}
type Result = { a: Outcome; b: Outcome; recommendation: string }

const demandTone = { low: "bg-coral-soft", medium: "bg-marigold-soft", high: "bg-leaf-soft" } as const
const lpa = (r: Range) => `₹${r.min}–${r.max} LPA`

/** Compare two courses / career paths for the Indian job market (Gemini estimates). */
export function CareerPathSimulator() {
  const [courseA, setCourseA] = useState("")
  const [courseB, setCourseB] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const onCompare = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/career-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseA, courseB }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Couldn't compare these paths.")
      setResult(data.result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't compare these paths.")
    } finally {
      setLoading(false)
    }
  }

  // Shared scale so the salary bars are comparable across both paths.
  const maxSalary = result ? Math.max(result.a.fiveYearSalaryLPA.max, result.b.fiveYearSalaryLPA.max, 1) : 1

  return (
    <div className="space-y-5">
      <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="course-a">Path A</Label>
          <Input id="course-a" placeholder="e.g. Data Analytics with Excel & SQL" value={courseA} onChange={(e) => setCourseA(e.target.value)} />
        </div>
        <span className="hidden pb-2 font-display text-lg font-black text-ink/60 md:block">vs</span>
        <div className="space-y-2">
          <Label htmlFor="course-b">Path B</Label>
          <Input id="course-b" placeholder="e.g. Digital Marketing" value={courseB} onChange={(e) => setCourseB(e.target.value)} />
        </div>
        <Button onClick={onCompare} disabled={loading || !courseA.trim() || !courseB.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
          {loading ? "Comparing…" : "Compare"}
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border-2 border-ink bg-coral-soft px-4 py-3 text-sm font-semibold text-coral-ink">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {[result.a, result.b].map((o, i) => (
              <div key={i} className="space-y-3 rounded-2xl border-2 border-ink bg-card p-5 shadow-brut">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Path {i === 0 ? "A" : "B"}</p>
                    <p className="font-display text-lg font-extrabold text-ink">{o.course}</p>
                  </div>
                  <span className="shrink-0 rounded-full border-2 border-ink bg-marigold px-2.5 py-0.5 text-xs font-black text-ink">
                    NSQF L{o.nsqfLevel}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {o.typicalRoles.map((r) => (
                    <span key={r} className="rounded-full border-2 border-ink bg-lagoon-soft px-2.5 py-0.5 text-xs font-semibold text-ink">
                      {r}
                    </span>
                  ))}
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Starting salary", r: o.entrySalaryLPA, bar: "bg-brand" },
                    { label: "After ~5 years", r: o.fiveYearSalaryLPA, bar: "bg-leaf" },
                  ].map(({ label, r, bar }) => (
                    <div key={label}>
                      <div className="flex justify-between font-semibold text-ink">
                        <span>{label}</span>
                        <span>{lpa(r)}</span>
                      </div>
                      <div className="mt-1 h-3 overflow-hidden rounded-full border-2 border-ink bg-card">
                        <div className={cn("h-full", bar)} style={{ width: `${Math.min(100, (r.max / maxSalary) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold text-ink">
                  <span className={cn("flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5", demandTone[o.demand])}>
                    <TrendingUp className="h-3.5 w-3.5" /> {o.demand} demand
                  </span>
                  <span className="flex items-center gap-1 rounded-full border-2 border-ink bg-card px-2.5 py-0.5">
                    <Clock className="h-3.5 w-3.5" /> ~{o.monthsToJobReady} months to job-ready
                  </span>
                </div>
                {o.keySkills.length > 0 && (
                  <p className="text-sm text-ink/75">
                    <span className="font-semibold text-ink">Key skills:</span> {o.keySkills.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border-2 border-ink bg-marigold-soft p-4 text-sm text-ink">
            <p className="font-display font-extrabold">Our take</p>
            <p className="mt-1">{result.recommendation}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            AI estimates for the Indian market, not guarantees. Salaries vary by city, employer and skills.
          </p>
        </div>
      )}
    </div>
  )
}
