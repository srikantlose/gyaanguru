import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { NsqfExplorer } from "@/components/nsqf-explorer"
import { HowItWorks } from "@/components/how-it-works"
import { CTA } from "@/components/cta"
import { Marquee } from "@/components/marquee"

export default function Home() {
  return (
    <main>
      <Hero />
      <Marquee />
      <Features />
      <NsqfExplorer />
      <HowItWorks />
      <CTA />
    </main>
  )
}
