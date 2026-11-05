"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HandNote, Sticker } from "@/components/doodles"
import { cn } from "@/lib/utils"

const steps = [
  { title: "Share your goal", detail: "What you want to learn, where you're starting from, and your weekly hours." },
  { title: "Get your roadmap", detail: "Modules and topics in a sensible order, sized to your time and rated on the NSQF scale." },
  { title: "Learn and check", detail: "Read in-depth notes, ask the instructor, take a quick quiz after each topic." },
  { title: "Track and apply", detail: "Earn points, watch your progress grow, and browse jobs that match." },
]

/** "How it works" as an interactive to-do list on a notebook page: click to tick each step. */
export function HowItWorks() {
  const [done, setDone] = useState<boolean[]>(() => steps.map(() => false))
  const allDone = done.every(Boolean)
  const toggle = (i: number) => setDone((d) => d.map((v, j) => (j === i ? !v : v)))

  return (
    <section id="how-it-works" className="scroll-mt-24 py-16 sm:py-24">
      <div className="container mx-auto grid items-center gap-10 px-4 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <span className="eyebrow -rotate-2 bg-lagoon text-ink">How it works</span>
          <h2 className="mt-5 text-4xl uppercase leading-[0.95] text-ink [font-stretch:120%] sm:text-6xl">
            Four steps.
            <br />
            <span className="marker">Zero guesswork.</span>
          </h2>
          <HandNote className="mt-4 block text-xl">go on, tick them off →</HandNote>
        </div>

        <div className="ruled relative rounded-2xl border-2 border-ink bg-card py-8 pl-14 pr-6 shadow-lift sm:pl-16">
          <span aria-hidden className="absolute inset-y-0 left-10 w-[2px] bg-margin sm:left-12" />
          <p className="hand mb-4 text-2xl text-coral-ink">To-do: get job-ready</p>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={done[i]}
                  className="group flex w-full items-start gap-4 rounded-xl p-2 text-left transition-colors hover:bg-marigold-soft/70"
                >
                  <span
                    className={cn(
                      "relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-card shadow-soft transition-all",
                      done[i] && "bg-leaf",
                    )}
                  >
                    {done[i] ? (
                      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
                        <path
                          className="draw"
                          pathLength={1}
                          d="M4 13 L10 18 L20 5"
                          fill="none"
                          stroke="var(--color-ink)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span className="font-display text-sm font-black text-ink">{i + 1}</span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "relative inline-block font-display text-xl font-extrabold text-ink transition-colors",
                        done[i] && "text-ink/50",
                      )}
                    >
                      {s.title}
                      {done[i] && (
                        <svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden className="absolute left-0 top-1/2 h-3 w-full -translate-y-1/2">
                          <path className="draw" pathLength={1} d="M2 8 C 50 3, 120 10, 198 5" fill="none" stroke="var(--color-coral)" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                      )}
                    </span>
                    <span className="mt-0.5 block text-ink/70">{s.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className={cn("mt-6 flex flex-wrap items-center gap-4 transition-opacity", allDone ? "opacity-100" : "opacity-0")} aria-hidden={!allDone}>
            <Sticker tone="leaf" rotate={-6}>
              All done!
            </Sticker>
            <Button asChild size="sm" tabIndex={allDone ? 0 : -1}>
              <Link href="/generate">
                Now build yours <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
