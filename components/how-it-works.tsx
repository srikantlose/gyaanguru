import { MessageSquare, Sparkles, Map, Rocket } from "lucide-react"

const steps = [
  {
    icon: MessageSquare,
    title: "Share Your Goals",
    description: "Tell us what you want to learn, your current experience level, and how much time you can dedicate.",
  },
  {
    icon: Sparkles,
    title: "AI Generates Your Path",
    description:
      "Our advanced AI analyzes your input and creates a personalized learning roadmap tailored to your needs.",
  },
  {
    icon: Map,
    title: "Explore Your Roadmap",
    description:
      "View your custom learning path with topics, subtopics, and resources organized in a clear visual format.",
  },
  {
    icon: Rocket,
    title: "Start Learning",
    description: "Follow your personalized roadmap and track your progress as you master new skills and concepts.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-purple-50/50 py-20 dark:bg-purple-950/10 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 font-serif text-3xl font-bold sm:text-4xl">How It Works</h2>
          <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
            Four simple steps to your personalized learning journey
          </p>
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="outline-card p-6">
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-purple-500 text-sm font-semibold text-purple-600 dark:border-purple-400 dark:text-purple-400">
                    {index + 1}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
                    <step.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
