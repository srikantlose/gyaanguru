import type { createClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/*
 * Points and rewards. The rules themselves live in SQL (scripts/schema.sql: complete_topic,
 * uncomplete_topic, redeem_reward) so they can't be bypassed from the browser. This file holds
 * the shared types, display copy and the read side.
 */

/** Points for passing a lesson's quiz (paid once per lesson). Mirrors award_lesson_quiz() in scripts/schema.sql. */
export const POINTS_PER_LESSON = 5

/** Bonus for a verified roadmap. Mirrors award_roadmap_bonus() in scripts/schema.sql. */
export function roadmapBonus(lessons: number) {
  return Math.max(60, 8 * Math.min(lessons, 40))
}

// Proof-of-learning rules. The server enforces all of these; the UI only explains them.
/** Fraction of a quiz's questions needed to pass (3 of 4). */
export const QUIZ_PASS_RATIO = 0.75
export const quizPassMark = (total: number) => Math.ceil(total * QUIZ_PASS_RATIO)
/** A lesson's quiz unlocks this long after the lesson was first opened. */
export const QUIZ_UNLOCK_MINUTES = 3
/** A quiz must be submitted within this long of being handed out. */
export const QUIZ_TIME_LIMIT_MINUTES = 60
/** Lessons that can pay points per day (India time). Also hard-coded in award_lesson_quiz(). */
export const DAILY_PAID_LESSONS = 15
export const QUIZ_STARTS_PER_LESSON_PER_HOUR = 5
export const QUIZ_STARTS_PER_DAY = 60
export const RECAP_MIN_CHARS = 80
export const RECAP_MAX_CHARS = 1500
export const RECAP_ATTEMPTS_PER_DAY = 5

export type RewardTone = "brand" | "marigold" | "coral" | "lagoon" | "leaf" | "bubblegum"
export type PerkKind = "streak_freeze" | "certificate" | "sticker_pack"

export type RewardItem = {
  id: string
  name: string
  description: string
  cost: number
  kind: "perk" | "demo"
  perk: PerkKind | null
  category: string
  tone: RewardTone
  featured: boolean
}

export type Redemption = {
  id: string
  rewardId: string
  rewardName: string
  cost: number
  targetId: string | null
  status: "active" | "requested"
  createdAt: string
}

export type PointEvent = {
  id: string
  amount: number
  kind: "topic" | "roadmap_bonus" | "redeem" | "adjust"
  description: string
  createdAt: string
}

export type RewardsData = {
  /** False until scripts/schema.sql has been run with the rewards tables. */
  ready: boolean
  catalog: RewardItem[]
  redemptions: Redemption[]
  events: PointEvent[]
}

const TONES: RewardTone[] = ["brand", "marigold", "coral", "lagoon", "leaf", "bubblegum"]
const PERKS: PerkKind[] = ["streak_freeze", "certificate", "sticker_pack"]

/** Missing table or function: the database hasn't been migrated with scripts/schema.sql yet. */
export function isSchemaMissing(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  return (
    error.code === "42P01" ||
    error.code === "42883" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    /does not exist|could not find the (table|function)/i.test(error.message ?? "")
  )
}

export const SCHEMA_MISSING_MESSAGE =
  "Points and rewards aren't set up in the database yet. Run scripts/schema.sql in the Supabase SQL editor, then reload."

/** Catalog, the caller's redemptions and their latest point events. */
export async function loadRewards(supabase: SupabaseServerClient, userId: string, eventLimit = 50): Promise<RewardsData> {
  const [catalogRes, redemptionsRes, eventsRes] = await Promise.all([
    supabase
      .from("reward_catalog")
      .select("id, name, description, cost, kind, perk, category, tone, featured")
      .eq("active", true)
      .order("sort", { ascending: true }),
    supabase
      .from("reward_redemptions")
      .select("id, reward_id, reward_name, cost, target_id, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("point_events")
      .select("id, amount, kind, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(eventLimit),
  ])

  if (isSchemaMissing(catalogRes.error) || isSchemaMissing(redemptionsRes.error) || isSchemaMissing(eventsRes.error)) {
    return { ready: false, catalog: [], redemptions: [], events: [] }
  }
  const failed = catalogRes.error ?? redemptionsRes.error ?? eventsRes.error
  if (failed) throw new Error(failed.message)

  return {
    ready: true,
    catalog: (catalogRes.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      cost: Number(r.cost),
      kind: r.kind === "perk" ? "perk" : "demo",
      perk: PERKS.includes(r.perk) ? r.perk : null,
      category: r.category ?? "General",
      tone: TONES.includes(r.tone) ? r.tone : "marigold",
      featured: Boolean(r.featured),
    })),
    redemptions: (redemptionsRes.data ?? []).map((r) => ({
      id: r.id,
      rewardId: r.reward_id,
      rewardName: r.reward_name,
      cost: Number(r.cost),
      targetId: r.target_id ?? null,
      status: r.status === "active" ? "active" : "requested",
      createdAt: r.created_at,
    })),
    events: (eventsRes.data ?? []).map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      kind: e.kind,
      description: e.description,
      createdAt: e.created_at,
    })),
  }
}

/** User-facing text for the exceptions raised by the SQL functions. */
export function rewardErrorResponse(message: string | undefined): { status: number; error: string } {
  switch (message) {
    case "insufficient_points":
      return { status: 400, error: "You don't have enough points for this yet." }
    case "already_redeemed":
      return { status: 409, error: "You already have this one." }
    case "roadmap_not_finished":
      return { status: 400, error: "Finish every lesson in that roadmap first." }
    case "roadmap_not_verified":
      return { status: 400, error: "Verify that roadmap first: pass every lesson quiz and get your recap approved." }
    case "quiz_not_passed":
      return { status: 400, error: "Pass this lesson's quiz first." }
    case "target_required":
      return { status: 400, error: "Pick which finished roadmap the certificate is for." }
    case "reward_not_found":
      return { status: 404, error: "That reward isn't available any more." }
    case "roadmap_not_found":
      return { status: 404, error: "Roadmap not found." }
    case "topic_not_found":
      return { status: 400, error: "That lesson doesn't exist in this roadmap." }
    case "not_authenticated":
      return { status: 401, error: "Unauthorized" }
    default:
      return { status: 500, error: "Something went wrong. Please try again." }
  }
}
