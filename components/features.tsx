import { SpotlightCard } from "@/components/spotlight-card"
import { SpotIllustration } from "@/components/illustrations"
import { HandNote, ScribbleCircle } from "@/components/doodles"
import { cn } from "@/lib/utils"

type Tone = "brand" | "marigold" | "coral" | "lagoon" | "leaf" | "bubblegum"

const paper: Record<Tone, string> = {
  brand: "bg-brand-soft",
  marigold: "bg-marigold-soft",
  coral: "bg-coral-soft",
  lagoon: "bg-lagoon-soft",
  leaf: "bg-leaf-soft",
  bubblegum: "bg-bubblegum-soft",
}

const notes: {
  title: string
  description: string
  tone: Tone
  tape: Tone
  tilt: number
  art: "roadmap" | "nsqf" | "lessons" | "progress" | "jobs" | "guidance"
  scribble: string
}[] = [
  {
    title: "A roadmap that fits your week",
    description: "Pick a topic, your level and your hours. You get 4–6 modules, basics to advanced, sized to the time you actually have.",
    tone: "marigold",
    tape: "coral",
    tilt: -2,
    art: "roadmap",
    scribble: "plan",
  },
  {
    title: "Mapped to NSQF levels",
    description: "Every roadmap is rated L3–L6, with matching job roles and qualifications.",
    tone: "brand",
    tape: "marigold",
    tilt: 1.5,
    art: "nsqf",
    scribble: "level",
  },
  {
    title: "Lessons, quizzes & a tutor",
    description: "In-depth notes for each topic, a quick quiz to check yourself, and an instructor to ask when stuck.",
    tone: "coral",
    tape: "lagoon",
    tilt: -1,
    art: "lessons",
    scribble: "learn",
  },
  {
    title: "Progress you can see",
    description: "Tick off lessons, earn points and watch each module fill up on your dashboard.",
    tone: "lagoon",
    tape: "leaf",
    tilt: 2,
    art: "progress",
    scribble: "track",
  },
  {
    title: "Live job matches",
    description: "Browse openings across India that match what you're learning right now.",
    tone: "leaf",
    tape: "bubblegum",
    tilt: -1.5,
    art: "jobs",
    scribble: "apply",
  },
  {
    title: "Career guidance on tap",
    description: "Talk through career paths, training plans and skills strategy, grounded in the NSQF.",
    tone: "bubblegum",
    tape: "marigold",
    tilt: 1,
    art: "guidance",
    scribble: "ask",
  },
]

export function Features() {
  return (
    <section className="container mx-auto px-4 py-16 sm:py-24">
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <span className="eyebrow rotate-1 bg-coral text-ink">What&apos;s inside</span>
        <h2 className="mt-5 text-4xl uppercase leading-[0.95] text-ink [font-stretch:120%] sm:text-6xl">
          Your whole learning{" "}
          <span className="relative inline-block px-2">
            notebook
            <ScribbleCircle tone="coral" />
          </span>
        </h2>
        <HandNote className="mt-3 block text-xl">six things, one place, no confusion</HandNote>
      </div>

      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((n) => (
          <SpotlightCard key={n.title} tone={n.tone} tape={n.tape} tilt={n.tilt} className={cn("h-full", paper[n.tone])}>
            <div className="flex h-full flex-col p-6 pt-8">
              <div className="flex items-start justify-between gap-4">
                <span className="hand text-2xl text-ink/70">#{n.scribble}</span>
                <SpotIllustration
                  kind={n.art}
                  className="h-20 w-auto shrink-0 transition-transform duration-500 group-hover/spot:-rotate-3 group-hover/spot:scale-110"
                />
              </div>
              <h3 className="mt-4 text-2xl leading-tight text-ink">{n.title}</h3>
              <p className="mt-2 leading-relaxed text-ink/75">{n.description}</p>
            </div>
          </SpotlightCard>
        ))}
      </div>
    </section>
  )
}
