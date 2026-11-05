"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, BookOpen, Flag, GraduationCap, Users, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getNsqfMapping } from "@/lib/nsqf"
import { cn } from "@/lib/utils"

const LEVELS = [1, 2, 3, 4, 5, 6] as const

const stepStyle: Record<number, { bg: string; text: string; soft: string; ink: string }> = {
  1: { bg: "bg-lagoon", text: "text-ink", soft: "bg-lagoon-soft", ink: "text-lagoon-ink" },
  2: { bg: "bg-leaf", text: "text-ink", soft: "bg-leaf-soft", ink: "text-leaf-ink" },
  3: { bg: "bg-brand", text: "text-ink", soft: "bg-brand-soft", ink: "text-brand-ink" },
  4: { bg: "bg-marigold", text: "text-ink", soft: "bg-marigold-soft", ink: "text-marigold-ink" },
  5: { bg: "bg-coral", text: "text-ink", soft: "bg-coral-soft", ink: "text-coral-ink" },
  6: { bg: "bg-ink", text: "text-white", soft: "bg-muted", ink: "text-ink" },
}

/** Interactive staircase: pick an NSQF level to see what it means, example roles and courses. */
export function NsqfExplorer() {
  const [level, setLevel] = useState(4)
  const [hovered, setHovered] = useState<number | null>(null)
  const shown = hovered ?? level
  const m = getNsqfMapping(shown)
  const s = stepStyle[shown]

  const descriptors = [
    { icon: BookOpen, label: "Knowledge", text: m.descriptors.knowledge },
    { icon: Wrench, label: "Skills", text: m.descriptors.skills },
    { icon: Users, label: "Responsibility", text: m.descriptors.responsibility },
  ]

  return (
    <section className="container mx-auto px-4 py-16 sm:py-24" aria-labelledby="nsqf-explorer-title">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="eyebrow rotate-1 bg-marigold text-ink">Try it</span>
          <h2 id="nsqf-explorer-title" className="mt-5 text-4xl uppercase leading-[0.95] text-ink [font-stretch:120%] sm:text-6xl">
            Where are you on the <span className="marker">NSQF ladder?</span>
          </h2>
          <p className="mt-5 max-w-md text-lg text-ink/75">
            India&apos;s National Skills Qualifications Framework rates skills from Level 1 to 10. Tap a step to see
            what each level expects.
          </p>

          {/* staircase */}
          <div
            role="radiogroup"
            aria-label="NSQF level"
            className="mt-8 flex h-56 items-end gap-2 sm:gap-3"
            onMouseLeave={() => setHovered(null)}
          >
            {LEVELS.map((l) => {
              const st = stepStyle[l]
              const selected = l === level
              return (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`Level ${l}`}
                  onClick={() => setLevel(l)}
                  onMouseEnter={() => setHovered(l)}
                  onFocus={() => setHovered(l)}
                  onBlur={() => setHovered(null)}
                  className={cn(
                    "group relative flex flex-1 flex-col items-center justify-start rounded-t-2xl rounded-b-md border-2 border-ink pt-3 font-display text-lg font-black shadow-soft transition-all duration-200",
                    "outline-none focus-visible:ring-4 focus-visible:ring-ring/40 hover:-translate-y-1.5 motion-reduce:transform-none",
                    st.bg,
                    st.text,
                    selected ? "-translate-y-2 shadow-lift" : "hover:shadow-brut",
                  )}
                  style={{ height: `${28 + l * 12}%` }}
                >
                  L{l}
                  {selected && (
                    <Flag className="absolute -top-8 h-6 w-6 text-ink" aria-hidden />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* details */}
        <div className="rounded-3xl border-2 border-ink bg-card p-6 shadow-lift sm:p-8" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-ink font-display text-xl font-black shadow-soft", s.bg, s.text)}>
                L{shown}
              </span>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">NSQF</p>
                <p className="font-display text-2xl font-extrabold text-ink">Level {shown}</p>
              </div>
            </div>
            <span className={cn("eyebrow", s.soft, s.ink)}>
              <GraduationCap className="h-3.5 w-3.5" />
              {m.requiredQualifications[0]}
            </span>
          </div>

          <dl className="mt-6 space-y-3">
            {descriptors.map(({ icon: Icon, label, text }) => (
              <div key={label} className="flex gap-3 rounded-2xl border-2 border-ink bg-paper p-3.5">
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.ink)} />
                <div>
                  <dt className="text-sm font-bold text-ink">{label}</dt>
                  <dd className="text-sm text-muted-foreground">{text}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Example roles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {m.exampleJobRoles.map((r) => (
                  <span key={r} className={cn("rounded-full border-2 border-ink px-3 py-0.5 text-sm font-bold", s.soft, "text-ink")}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Courses to look at</p>
              <ul className="mt-2 space-y-1.5 text-sm text-ink">
                {m.exampleCourses.map((c) => (
                  <li key={c} className="flex items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full", s.bg)} />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Button asChild className="group mt-7 w-full sm:w-auto">
            <Link href="/generate">
              Plan a roadmap for Level {level}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
