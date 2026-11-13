import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { loadLearner } from "@/lib/learner"
import { SCHEMA_MISSING_MESSAGE, isSchemaMissing, loadRewards, rewardErrorResponse } from "@/lib/rewards"

/** Balance, totals, catalog, redemptions and recent point history for the signed-in learner. */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [learner, rewards] = await Promise.all([loadLearner(supabase, user.id), loadRewards(supabase, user.id)])
    if (!rewards.ready) {
      return NextResponse.json({ error: SCHEMA_MISSING_MESSAGE, code: "SchemaNotMigrated" }, { status: 412 })
    }

    return NextResponse.json({
      balance: learner.points,
      earned: learner.pointsEarned,
      spent: learner.pointsSpent,
      roadmapsFinished: learner.roadmapsFinished,
      freezesAvailable: learner.freezesAvailable,
      catalog: rewards.catalog,
      redemptions: rewards.redemptions,
      events: rewards.events,
    })
  } catch (error) {
    console.error("Error loading rewards:", error)
    return NextResponse.json({ error: "Couldn't load your rewards. Please try again." }, { status: 500 })
  }
}

const RedeemSchema = z.object({
  rewardId: z.string().trim().min(1).max(100),
  targetId: z.uuid().optional(),
})

/** Spend points on a catalog item. All checks and the balance change happen in redeem_reward(). */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parsed = RedeemSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Pick a reward to redeem." }, { status: 400 })
    }

    const { data, error } = await supabase.rpc("redeem_reward", {
      p_reward_id: parsed.data.rewardId,
      p_target_id: parsed.data.targetId ?? null,
    })

    if (error) {
      if (isSchemaMissing(error)) {
        return NextResponse.json({ error: SCHEMA_MISSING_MESSAGE, code: "SchemaNotMigrated" }, { status: 412 })
      }
      const mapped = rewardErrorResponse(error.message)
      if (mapped.status === 500) console.error("Error redeeming reward:", error)
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }

    const result = data as { points: number; redemption_id: string; reward_name: string; cost: number }
    return NextResponse.json({
      success: true,
      points: result.points,
      redemptionId: result.redemption_id,
      message: `Redeemed ${result.reward_name} for ${result.cost} points.`,
    })
  } catch (error) {
    console.error("Error redeeming reward:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
