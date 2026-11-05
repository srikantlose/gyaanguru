import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-purple-50 via-white to-purple-100 py-16 dark:from-purple-950/20 dark:via-background dark:to-purple-900/20 sm:py-24">
      {/* Decorative dots */}
      <span aria-hidden className="decor-dot left-6 top-6 bg-purple-400" />
      <span aria-hidden className="decor-dot right-8 top-10 bg-purple-500" />
      <span aria-hidden className="decor-dot bottom-10 left-10 bg-purple-600" />

      <div className="container mx-auto px-4">
        <div className="hero-card mx-auto max-w-3xl text-center">
          <div>
            <div className="mb-4">
              <span className="eyebrow bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                AI-Powered Learning Paths
              </span>
            </div>

            <h1 className="mb-5 bg-gradient-to-r from-purple-600 to-purple-900 bg-clip-text text-pretty text-5xl font-extrabold tracking-tight text-transparent dark:from-purple-400 dark:to-purple-600 sm:text-6xl">
              Your Personalized Learning Journey Starts Here
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Generate custom learning roadmaps tailored to your goals and time. Aesthetic, simple, and focused—just
              like great learning should be.
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="rounded-full bg-purple-600 hover:bg-purple-700">
                <Link href="/generate">Generate Your Roadmap</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-purple-300 bg-transparent hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-950/50"
              >
                <Link href="#how-it-works">See How It Works</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
