import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { loadLearner } from "@/lib/learner"
import { loadRewards, type RewardsData } from "@/lib/rewards"
import { computeAchievements } from "@/lib/achievements"
import { PageHeader } from "@/components/page-header"
import { RewardsIllustration } from "@/components/illustrations"
import { RewardsClient } from "@/components/rewards-client"

export const metadata = {
  title: "Rewards",
  description: "Your points, badges and the rewards you can spend them on.",
}

export default async function RewardsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const learner = await loadLearner(supabase, user.id)
  let rewards: RewardsData | null = null
  try {
    rewards = await loadRewards(supabase, user.id)
  } catch (error) {
    console.error("Error loading rewards:", error)
  }

  const finished = learner.roadmaps
    .filter((r) => r.total > 0 && r.done === r.total)
    .map((r) => ({ id: r.id, title: r.title, certified: learner.certificates.includes(r.id) }))

  return (
    <main className="container mx-auto px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Rewards"
          tone="marigold"
          title="Points, badges & treats"
          note="learn → earn → treat yourself"
          description="Every new lesson you finish pays 5 points, and finishing a whole roadmap pays a bonus. Spend them on perks that help you keep going."
          art={<RewardsIllustration />}
        />
        <RewardsClient
          balance={learner.points}
          earned={learner.pointsEarned}
          spent={learner.pointsSpent}
          roadmapsFinished={learner.roadmapsFinished}
          freezesAvailable={learner.freezesAvailable}
          stickerPack={learner.stickerPack}
          finished={finished}
          rewards={rewards}
          achievements={computeAchievements(learner)}
        />
      </div>
    </main>
  )
}
