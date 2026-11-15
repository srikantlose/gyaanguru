import Link from "next/link"
import { ExternalLink, MapPin, Route } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PathNode } from "@/lib/nsqf-path"
import type { LearnerLevel } from "@/lib/placement"
import { formatLevel } from "@/lib/qualifications"

const LEVEL_TONE: Record<number, { soft: string; solid: string }> = {
  3: { soft: "bg-brand-soft", solid: "bg-brand" },
  4: { soft: "bg-marigold-soft", solid: "bg-marigold" },
  5: { soft: "bg-coral-soft", solid: "bg-coral" },
  6: { soft: "bg-lagoon-soft", solid: "bg-lagoon" },
}

const shortBody = (name: string) => name.replace(/\s*\(.*\)\s*$/, "")

/**
 * A ladder of real NSQF qualifications from the learner's level up to level 6 in one track.
 * "You are here" comes from the tested level when there is one, else the estimate.
 */
export function NsqfRoadmap({
  nodes,
  level,
  trackName,
  label,
}: {
  nodes: PathNode[]
  level: LearnerLevel
  trackName: string
  /** Replaces the tested/estimated badge text, e.g. "Starting at L4" when the visitor picked a level. */
  label?: string
}) {
  if (!nodes.length) {
    return <p className="text-sm text-ink/70">No current qualifications in this track at your level yet.</p>
  }
  const here = level.value ?? nodes[0].nsqfLevel
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border-2 border-ink px-3 py-1 text-sm font-bold text-ink",
            level.source === "tested" ? "bg-leaf-soft" : "bg-marigold-soft",
          )}
        >
          {label ?? (level.value == null ? "Level not known yet" : level.source === "tested" ? `Tested at L${level.value}` : `Estimated L${level.value}`)}
        </span>
        <span className="text-sm text-ink/70">{trackName}</span>
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link href="/placement">{level.source === "tested" ? "Retake the placement test" : "Take the placement test"}</Link>
        </Button>
      </div>

      <ol className="space-y-3">
        {nodes.map((n) => {
          const tone = LEVEL_TONE[n.nsqfLevel] ?? LEVEL_TONE[4]
          const isHere = n.nsqfLevel === here
          return (
            <li key={n.qualificationId} className={cn("rounded-2xl border-2 border-ink p-4 shadow-soft", isHere ? tone.soft : "bg-card")}>
              <div className="flex flex-wrap items-start gap-3">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink font-display text-sm font-black text-ink",
                    tone.solid,
                  )}
                >
                  L{formatLevel(n.level)}
                </span>
                <div className="min-w-0 flex-1">
                  {isHere && (
                    <p className="mb-0.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-ink/70">
                      <MapPin className="h-3.5 w-3.5" /> You are here
                    </p>
                  )}
                  <p className="font-bold leading-snug text-ink">{n.title}</p>
                  <p className="mt-0.5 text-xs text-ink/65">
                    NQR code <span className="font-mono">{n.code}</span> · {shortBody(n.awardingBody)}
                    {n.occupation ? ` · ${n.occupation}` : ""}
                  </p>
                  {n.alternatives.length > 0 && (
                    <p className="mt-1.5 text-xs text-ink/70">
                      Also at this level:{" "}
                      {n.alternatives.map((a, i) => (
                        <span key={a.id}>
                          {i > 0 && ", "}
                          <Link href={`/generate?qualification=${a.id}`} className="font-semibold text-primary underline-offset-2 hover:underline">
                            {a.title}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant={isHere ? "default" : "outline"}>
                  <Link href={`/generate?qualification=${n.qualificationId}`}>
                    <Route className="h-4 w-4" /> Plan a roadmap for this
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <a href={n.url} target="_blank" rel="noreferrer">
                    On nqr.gov.in <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
