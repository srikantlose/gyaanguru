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
    <main className="py-10 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {typeof roadmap.nsqf_level === "number" && (
            <section
              aria-label="NSQF alignment"
              className="mb-6 flex flex-col gap-4 rounded-2xl border-2 border-ink bg-marigold-soft p-5 shadow-brut sm:flex-row sm:items-center"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-marigold font-display text-2xl font-black text-ink shadow-soft">
                L{roadmap.nsqf_level}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-marigold-ink">NSQF Alignment</p>
                <p className="font-display text-lg font-bold text-ink">NSQF Level {roadmap.nsqf_level}</p>
                {roadmap.nsqf_description && <p className="mt-1 text-sm text-ink/70">{roadmap.nsqf_description}</p>}
              </div>
              {roadmap.content?.nsqf?.mapping?.exampleJobRoles?.length ? (
                <div className="flex flex-wrap gap-2 sm:max-w-xs sm:justify-end">
                  {roadmap.content.nsqf.mapping.exampleJobRoles.slice(0, 3).map((role: string) => (
                    <span key={role} className="rounded-full border-2 border-ink bg-card px-3 py-0.5 text-sm font-bold text-ink shadow-soft">
                      {role}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>
          )}
          <RoadmapVisualization roadmap={roadmap.content} roadmapId={roadmap.id} />
        </div>
      </div>
    </main>
  )
}
