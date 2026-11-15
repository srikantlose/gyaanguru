"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, BookOpen, ClipboardCheck, ExternalLink, Flag, GraduationCap, Users, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NSQF_DESCRIPTORS_SOURCE, NSQF_LEVELS, NSQF_MAX_LEVEL, NSQF_MIN_LEVEL, getNsqfDescriptor } from "@/lib/nsqf"
import { cn } from "@/lib/utils"

const stepStyle: Record<number, { bg: string; text: string; soft: string; ink: string }> = {
  1: { bg: "bg-lagoon", text: "text-ink", soft: "bg-lagoon-soft", ink: "text-lagoon-ink" },
  2: { bg: "bg-leaf", text: "text-ink", soft: "bg-leaf-soft", ink: "text-leaf-ink" },
  3: { bg: "bg-brand", text: "text-ink", soft: "bg-brand-soft", ink: "text-brand-ink" },
  4: { bg: "bg-marigold", text: "text-ink", soft: "bg-marigold-soft", ink: "text-marigold-ink" },
  5: { bg: "bg-coral", text: "text-ink", soft: "bg-coral-soft", ink: "text-coral-ink" },
  6: { bg: "bg-bubblegum", text: "text-ink", soft: "bg-bubblegum-soft", ink: "text-bubblegum-ink" },
  7: { bg: "bg-lagoon", text: "text-ink", soft: "bg-lagoon-soft", ink: "text-lagoon-ink" },
  8: { bg: "bg-ink", text: "text-white", soft: "bg-muted", ink: "text-ink" },
}

type Example = { id: string; title: string; level: number }

const fmt = (l: number) => (Number.isInteger(l) ? String(l) : l.toFixed(1))

/**
 * Interactive staircase of the official NSQF levels (1-8): pick one to see its descriptors and,
 * for the levels GyaanGuru covers (3-6), real qualifications you can build a roadmap on.
 */
export function NsqfExplorer({ examples }: { examples: Record<number, Example[]> }) {
  const [level, setLevel] = useState(4)
  const [hovered, setHovered] = useState<number | null>(null)
  const shown = hovered ?? level
  const d = getNsqfDescriptor(shown)
  const s = stepStyle[shown]
  const covered = shown >= NSQF_MIN_LEVEL && shown <= NSQF_MAX_LEVEL
  const quals = examples[shown] ?? []

  const domains = [
    { icon: BookOpen, label: "Knowledge", domain: d.knowledge },
    { icon: Wrench, label: "Skills", domain: d.skills },
    { icon: ClipboardCheck, label: "Outcomes", domain: d.outcomes },
    { icon: Users, label: "Responsibility", domain: d.responsibility },
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
            India&apos;s National Skills Qualifications Framework has 8 levels (revised in 2023, with half steps like 4.5). Tap a
            step to see what the official descriptors expect.
          </p>

          {/* staircase */}
          <div
            role="radiogroup"
            aria-label="NSQF level"
            className="mt-8 flex h-56 items-end gap-1.5 sm:gap-2.5"
            onMouseLeave={() => setHovered(null)}
          >
            {NSQF_LEVELS.map((l) => {
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
                    "group relative flex min-w-0 flex-1 flex-col items-center justify-start rounded-t-2xl rounded-b-md border-2 border-ink pt-3 font-display text-base font-black shadow-soft transition-all duration-200 sm:text-lg",
                    "outline-none focus-visible:ring-4 focus-visible:ring-ring/40 hover:-translate-y-1.5 motion-reduce:transform-none",
                    st.bg,
                    st.text,
                    selected ? "-translate-y-2 shadow-lift" : "hover:shadow-brut",
                  )}
                  style={{ height: `${20 + l * 10}%` }}
                >
                  L{l}
                  {selected && <Flag className="absolute -top-8 h-6 w-6 text-ink" aria-hidden />}
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
                <p className="text-sm font-semibold text-muted-foreground">NSQF · {d.band}</p>
                <p className="font-display text-2xl font-extrabold text-ink">Level {shown}</p>
              </div>
            </div>
            <span className={cn("eyebrow max-w-full", s.soft, "text-ink")}>
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Entry: {d.entry}</span>
            </span>
          </div>

          <dl className="mt-6 space-y-2.5">
            {domains.map(({ icon: Icon, label, domain }) => (
              <div key={label} className="flex gap-3 rounded-2xl border-2 border-ink bg-paper p-3">
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.ink)} />
                <div className="min-w-0">
                  <dt className="text-sm font-bold text-ink">
                    {label}: <span className="font-semibold">{domain.headline}</span>
                  </dt>
                  <dd className="text-sm text-muted-foreground">{domain.detail}</dd>
                </div>
              </div>
            ))}
          </dl>

          {covered && quals.length > 0 ? (
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Real qualifications around this level</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {quals.map((q) => (
                  <Link
                    key={q.id}
                    href={`/generate?qualification=${q.id}`}
                    className={cn("rounded-full border-2 border-ink px-3 py-0.5 text-sm font-bold text-ink hover:shadow-soft", s.soft)}
                  >
                    {q.title} · L{fmt(q.level)}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink/70">
              GyaanGuru builds roadmaps for levels {NSQF_MIN_LEVEL} to {NSQF_MAX_LEVEL}. Qualifications at every level are listed on the
              National Qualifications Register.
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {covered ? (
              <Button asChild className="group w-full sm:w-auto">
                <Link href="/placement">
                  Find your level: take the placement test
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href="https://www.nqr.gov.in/" target="_blank" rel="noreferrer">
                  Browse nqr.gov.in <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            <a href={NSQF_DESCRIPTORS_SOURCE} target="_blank" rel="noreferrer" className="text-xs font-semibold text-ink/60 underline underline-offset-2">
              Descriptors: NCVET, via nqr.gov.in
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
