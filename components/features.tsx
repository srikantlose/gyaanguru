import { Brain, Target, Clock, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: Brain,
    title: "AI-Powered Generation",
    description: "Advanced AI analyzes your goals and creates personalized learning paths optimized for your success.",
  },
  {
    icon: Target,
    title: "Goal-Oriented",
    description:
      "Define your learning objectives and get a roadmap that takes you from where you are to where you want to be.",
  },
  {
    icon: Clock,
    title: "Time-Adaptive",
    description:
      "Roadmaps adjust to your available time commitment, ensuring realistic and achievable learning schedules.",
  },
  {
    icon: TrendingUp,
    title: "Progressive Learning",
    description: "Structured paths that build knowledge incrementally, from fundamentals to advanced concepts.",
  },
]

export function Features() {
  return (
    <section className="py-20 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 font-serif text-3xl font-bold sm:text-4xl">Why Choose Our Platform?</h2>
          <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
            Intelligent features designed to accelerate your learning journey
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-2 border-purple-200 transition-all hover:border-purple-400 hover:shadow-lg hover:shadow-purple-100 dark:border-purple-800 dark:hover:border-purple-600 dark:hover:shadow-purple-900/50"
            >
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
                  <feature.icon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
