import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { BookOpen, Clock, Plus } from "lucide-react"
import { DeleteRoadmapButton } from "@/components/delete-roadmap-button"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: roadmaps } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // One progress query for all roadmaps instead of one per roadmap.
  const roadmapIds = (roadmaps || []).map((roadmap) => roadmap.id)
  const { data: progressRows } =
    roadmapIds.length > 0
      ? await supabase.from("progress").select("roadmap_id").eq("user_id", user.id).in("roadmap_id", roadmapIds)
      : { data: [] as { roadmap_id: string }[] }

  const completedByRoadmap = new Map<string, number>()
  for (const row of progressRows || []) {
    completedByRoadmap.set(row.roadmap_id, (completedByRoadmap.get(row.roadmap_id) ?? 0) + 1)
  }

  const roadmapsWithProgress = (roadmaps || []).map((roadmap) => {
    const totalTopics = (roadmap.content?.modules ?? []).reduce(
      (acc: number, module: { topics?: unknown[] }) => acc + (module.topics?.length ?? 0),
      0,
    )
    const completedTopics = completedByRoadmap.get(roadmap.id) ?? 0
    const progressPercentage = totalTopics > 0 ? Math.min(100, Math.round((completedTopics / totalTopics) * 100)) : 0

    return {
      ...roadmap,
      totalTopics,
      completedTopics,
      progressPercentage,
    }
  })

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="mb-2 font-serif text-4xl font-bold">
                Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
              </h1>
              <p className="text-lg text-muted-foreground">Track your learning progress and manage your roadmaps</p>
              <div className="mt-3">
                <Badge variant="outline" className="border-purple-500/50 text-purple-700 dark:text-purple-300">
                  Points: {typeof profile?.points === "number" ? profile.points : 0}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!profile?.onboarded && (
                <Link href="/onboarding">
                  <Button
                    variant="outline"
                    size="lg"
                    className="hover:bg-purple-50 dark:hover:bg-purple-950 bg-transparent"
                  >
                    Onboarding
                  </Button>
                </Link>
              )}
              <Link href="/profile">
                <Button
                  variant="outline"
                  size="lg"
                  className="hover:bg-purple-50 dark:hover:bg-purple-950 bg-transparent"
                >
                  Profile
                </Button>
              </Link>
              <Link href="/generate">
                <Button size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  New Roadmap
                </Button>
              </Link>
            </div>
          </div>

          {roadmapsWithProgress.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BookOpen className="mb-4 h-16 w-16 text-purple-500" />
                <h3 className="mb-2 text-xl font-semibold">No roadmaps yet</h3>
                <p className="mb-6 text-center text-muted-foreground">
                  Create your first personalized learning roadmap to get started
                </p>
                <Link href="/generate">
                  <Button size="lg">
                    <Plus className="mr-2 h-5 w-5" />
                    Generate Your First Roadmap
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {roadmapsWithProgress.map((roadmap) => (
                <Card
                  key={roadmap.id}
                  className="group relative flex flex-col transition-all hover:shadow-lg hover:border-purple-500/50"
                >
                  <CardHeader>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                        >
                          {roadmap.experience_level}
                        </Badge>
                        {typeof roadmap.nsqf_level === "number" && (
                          <Badge
                            className="text-xs border-purple-500/50 text-purple-700 dark:text-purple-300"
                            variant="outline"
                          >
                            NSQF L{roadmap.nsqf_level}
                          </Badge>
                        )}
                      </div>
                      <DeleteRoadmapButton roadmapId={roadmap.id} />
                    </div>
                    <CardTitle className="text-balance leading-tight">{roadmap.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{roadmap.content.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">
                          {roadmap.completedTopics} / {roadmap.totalTopics} topics
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${roadmap.progressPercentage}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {roadmap.content.modules.length} modules
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {roadmap.time_commitment}
                        </div>
                      </div>
                    </div>
                    <Link href={`/roadmap/${roadmap.id}`} className="w-full">
                      <Button
                        className="w-full bg-transparent hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950 dark:hover:text-purple-300"
                        variant="outline"
                      >
                        {roadmap.progressPercentage > 0 ? "Continue Learning" : "Start Learning"}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
