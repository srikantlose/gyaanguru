import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container mx-auto px-4">
        {/* Added purple gradient background to CTA card */}
        <div className="outline-card mx-auto max-w-3xl bg-gradient-to-br from-purple-50 to-purple-100 p-8 text-center dark:from-purple-950/30 dark:to-purple-900/20 sm:p-12">
          <h2 className="mb-4 font-serif text-3xl font-bold sm:text-4xl">Ready to Start Your Learning Journey?</h2>
          <p className="mb-8 text-pretty text-lg leading-relaxed text-muted-foreground">
            Join thousands of learners who have transformed their skills with personalized AI-generated roadmaps.
          </p>
          {/* Made CTA button purple */}
          <Button asChild size="lg" className="group bg-purple-600 hover:bg-purple-700">
            <Link href="/generate">
              Create Your Roadmap Now
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
