import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GrowthIllustration } from "@/components/illustrations"
import { Parallax } from "@/components/parallax"
import { HandNote, Stamp } from "@/components/doodles"

export function CTA() {
  return (
    <section className="container mx-auto px-4 pb-10 pt-6 sm:pt-10">
      <Parallax className="relative rounded-[1.75rem] border-2 border-ink bg-marigold shadow-[8px_8px_0_0_var(--color-ink)]">
        <div className="relative grid items-center gap-8 px-6 py-12 sm:px-12 md:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="text-4xl uppercase leading-[0.95] text-ink [font-stretch:122%] sm:text-6xl">
              Your next level
              <br />
              is one plan away.
            </h2>
            <p className="mt-5 max-w-lg text-lg font-medium text-ink/80">
              Build a free roadmap in under a minute, then learn at your own pace.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button asChild size="lg" variant="pop" className="group">
                <Link href="/generate">
                  Create my roadmap
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/jobs">Browse jobs</Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto w-60 sm:w-72">
            <div className="rotate-3 rounded-2xl border-2 border-ink bg-card p-5 shadow-brut">
              <GrowthIllustration />
            </div>
            <Stamp tone="ink" text="LEARN • GROW • GET HIRED • " center="ज्ञान" className="absolute -right-6 -top-10 h-24 w-24 -rotate-12" />
            <HandNote className="absolute -bottom-9 left-2 -rotate-2 text-ink/70">watch it grow ↑</HandNote>
          </div>
        </div>
      </Parallax>
    </section>
  )
}
