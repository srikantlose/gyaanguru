import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { RoadmapVisualization } from "@/components/roadmap-visualization"

export default async function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: roadmap, error } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !roadmap) {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {typeof roadmap.nsqf_level === "number" && (
            <div className="mb-6 rounded-lg border bg-background p-4">
              <div className="mb-1 text-sm font-medium text-muted-foreground">NSQF Alignment</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-sm">
                  NSQF Level {roadmap.nsqf_level}
                </span>
                {roadmap.content?.nsqf?.mapping?.exampleJobRoles?.length ? (
                  <span className="text-sm text-muted-foreground">
                    Roles: {roadmap.content.nsqf.mapping.exampleJobRoles.slice(0, 3).join(", ")}
                  </span>
                ) : null}
              </div>
              {roadmap.nsqf_description && (
                <p className="mt-2 text-sm text-muted-foreground">{roadmap.nsqf_description}</p>
              )}
            </div>
          )}
          <RoadmapVisualization roadmap={roadmap.content} roadmapId={roadmap.id} />
        </div>
      </div>
    </main>
  )
}
