import Link from "next/link"
import { ArrowRight, Briefcase, CheckCircle2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeroIllustration } from "@/components/illustrations"
import { Parallax } from "@/components/parallax"
import { HandNote, ScribbleArrow, ScribbleUnderline, Stamp, Sticker } from "@/components/doodles"

export function Hero() {
  return (
    <Parallax className="relative">
      <section className="container mx-auto grid items-center gap-12 px-4 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-20">
        <div className="rise-in">
          <span className="eyebrow -rotate-2 bg-leaf text-ink">NSQF-aligned · built for Bharat</span>

          <h1 className="mt-6 text-[3.1rem] uppercase leading-[0.92] text-ink [font-stretch:125%] sm:text-7xl lg:text-[5.4rem]">
            Plan it.
            <br />
            Learn it.
            <br />
            <span className="relative inline-block">
              <span className="marker">Level up.</span>
              <ScribbleUnderline tone="coral" className="-bottom-3" />
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/75">
            Tell us your goal and how many hours you have each week. GyaanGuru builds a step-by-step roadmap with
            lessons, quizzes and live jobs, mapped to India&apos;s skills framework.
          </p>

          <div className="relative mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="group text-base">
              <Link href="/generate">
                Build my roadmap
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">See how it works</Link>
            </Button>
            <div className="pointer-events-none absolute -bottom-16 left-40 hidden items-start gap-1 sm:flex">
              <ScribbleArrow tone="coral" className="h-12 w-16 -scale-x-100 rotate-[200deg]" />
              <HandNote className="mt-6 -rotate-3">free, takes a minute!</HandNote>
            </div>
          </div>
        </div>

        {/* notebook page with the illustration and draggable stickers */}
        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div className="ruled relative rotate-1 rounded-2xl border-2 border-ink bg-card px-6 pb-6 pl-12 pt-10 shadow-lift transition-transform duration-500 hover:rotate-0">
            {/* red margin + punched holes */}
            <span aria-hidden className="absolute inset-y-0 left-9 w-[2px] bg-margin" />
            {[18, 50, 82].map((top) => (
              <span
                key={top}
                aria-hidden
                className="absolute left-2.5 h-4 w-4 rounded-full border-2 border-ink bg-paper"
                style={{ top: `${top}%` }}
              />
            ))}
            <HandNote className="absolute left-14 top-3 -rotate-2 text-base text-ink/60">
              my roadmap — week 1
            </HandNote>
            <HeroIllustration title="A learner climbing NSQF level steps toward a flag" />
          </div>

          <div className="absolute -left-3 top-16 sm:-left-8">
            <Sticker tone="marigold" rotate={-8} draggable>
              <Star className="h-4 w-4 fill-ink" /> +5 pts
            </Sticker>
          </div>
          <div className="absolute -right-2 top-1/2 sm:-right-6">
            <Sticker tone="bubblegum" rotate={7} draggable>
              <CheckCircle2 className="h-4 w-4" /> Quiz done
            </Sticker>
          </div>
          <div className="absolute -bottom-5 left-1/3">
            <Sticker tone="lagoon" rotate={-4} draggable>
              <Briefcase className="h-4 w-4" /> 3 jobs match
            </Sticker>
          </div>
          <Stamp className="absolute -right-4 -top-10 hidden h-24 w-24 rotate-12 sm:block" />
          <HandNote className="absolute -bottom-12 right-2 hidden rotate-2 text-base text-ink/60 sm:block">
            psst… drag the stickers ↑
          </HandNote>
        </div>
      </section>
    </Parallax>
  )
}
