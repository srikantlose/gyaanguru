import type React from "react"
import { Check } from "lucide-react"
import { Parallax } from "@/components/parallax"
import { StudyIllustration } from "@/components/illustrations"
import { HandNote, Sticker, Tape } from "@/components/doodles"

const perks = [
  "A roadmap sized to your weekly hours",
  "Lessons, quizzes and an instructor for each topic",
  "NSQF level, points and progress in one place",
]

/** Split layout for sign-in / sign-up: notebook brand panel with illustration + form column. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className="container mx-auto px-4 py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[1.75rem] border-2 border-ink bg-card shadow-[8px_8px_0_0_var(--color-ink)] lg:grid-cols-2">
        <Parallax className="relative hidden flex-col justify-between border-r-2 border-ink bg-brand p-10 text-ink lg:flex">
          <div className="ruled pointer-events-none absolute inset-0 opacity-25" aria-hidden />
          <div className="relative">
            <p className="font-display text-4xl font-black uppercase leading-[0.95] [font-stretch:120%]">
              Learn with a plan.
              <br />
              <span className="marker">Grow</span> every step.
            </p>
            <ul className="mt-7 space-y-3">
              {perks.map((p) => (
                <li key={p} className="flex items-start gap-3 font-semibold">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-card">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-10">
            <div className="relative -rotate-2 rounded-2xl border-2 border-ink bg-card p-4 shadow-brut">
              <Tape tone="marigold" className="-top-3 left-8 -rotate-6" />
              <Tape tone="coral" className="-top-3 right-8 rotate-6" />
              <StudyIllustration />
            </div>
            <div className="absolute -right-3 -top-6">
              <Sticker tone="bubblegum" rotate={8} draggable>
                ज्ञान +1
              </Sticker>
            </div>
            <HandNote className="mt-4 block -rotate-1 text-ink/80">your desk, but organised :)</HandNote>
          </div>
        </Parallax>

        <div className="flex flex-col justify-center p-6 sm:p-10 rise-in">
          <h1 className="text-4xl uppercase leading-none text-ink [font-stretch:118%]">{title}</h1>
          <p className="mt-3 text-ink/70">{description}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-ink/70">{footer}</div>}
        </div>
      </div>
    </main>
  )
}

/** Inline error message for auth forms. */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-xl border-2 border-ink bg-coral-soft px-4 py-3 text-sm font-semibold text-coral-ink shadow-soft">
      {children}
    </div>
  )
}
