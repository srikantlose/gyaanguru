import { RoadmapGenerator } from "@/components/roadmap-generator"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function GeneratePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-background to-purple-50/30 py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="mb-4 font-serif text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent sm:text-5xl">
              Generate Your Learning Roadmap
            </h1>
            <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
              Answer a few questions and let AI create your personalized learning path
            </p>
          </div>
          <RoadmapGenerator />
        </div>
      </div>
    </main>
  )
}
