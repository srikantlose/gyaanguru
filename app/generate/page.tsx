import { RoadmapGenerator } from "@/components/roadmap-generator"
import { PageHeader } from "@/components/page-header"
import { MapIllustration } from "@/components/illustrations"
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
    <main className="container mx-auto px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="New roadmap"
          tone="coral"
          title="Build your learning roadmap"
          description="Answer four quick questions. We'll lay out modules and topics in order, sized to your week and rated on the NSQF scale."
          art={<MapIllustration />}
        />
        <RoadmapGenerator />
      </div>
    </main>
  )
}
