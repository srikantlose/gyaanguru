import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { loadLearner } from "@/lib/learner"
import { computeAchievements } from "@/lib/achievements"
import { MentorClient } from "@/components/mentor-client"

export default async function AIMentorPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const learner = await loadLearner(supabase, user.id)
  return <MentorClient learner={learner} achievements={computeAchievements(learner)} />
}
