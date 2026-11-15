import type { createClient } from "@/lib/supabase/server"
import { clampNsqfLevel } from "@/lib/nsqf"
import { estimateLevelFromEducation } from "@/lib/nsqf-path"
import type { LearnerLevel } from "@/lib/placement"
import { formatLevel, getQualification, getTrack } from "@/lib/qualifications"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type Topic = { id?: string; title?: string; description?: string; estimatedHours?: number | string }
type Module = { id?: string; title?: string; topics?: Topic[] }

export type RoadmapSummary = {
  id: string
  title: string
  nsqfLevel: number | null
  /** The real NSQF qualification this roadmap is built on, if any (from the catalogue, by id). */
  qualification: { id: string; title: string; level: number; code: string } | null
  total: number
  done: number
  percent: number
  /** Ordered topics with completion flags (for the learning-path view). */
  topics: { moduleIndex: number; topicIndex: number; title: string; moduleTitle: string; hours: number; done: boolean }[]
  next: { moduleIndex: number; topicIndex: number; title: string; moduleTitle: string } | null
}

export type DayActivity = { date: string; label: string; count: number; frozen: boolean }

export type LearnerSnapshot = {
  name: string | null
  points: number
  /** Lifetime points earned and spent, from the point_events ledger. */
  pointsEarned: number
  pointsSpent: number
  onboarded: boolean
  onboarding: Record<string, any>
  /** The learner's NSQF level: "tested" only from a submitted placement test, else "estimated". */
  level: LearnerLevel
  /** Same as level.value; kept for callers that only need the number. */
  currentLevel: number | null
  roadmaps: RoadmapSummary[]
  /** Roadmaps finished now, or ever (a paid roadmap bonus still counts after a lesson is unticked or the roadmap deleted). */
  roadmapsFinished: number
  topicsDone: number
  totalTopics: number
  hoursLearned: number
  streak: number
  activeDays: number
  week: DayActivity[]
  /** Streak Freezes bought but not yet used up by a missed day. */
  freezesAvailable: number
  stickerPack: boolean
  /** Roadmap ids that have a Completion Certificate. */
  certificates: string[]
  /** Roadmap ids verified by passing every lesson quiz and an approved recap. */
  verifiedRoadmaps: string[]
  /** Active reward catalog (name and cost), so the mentor can talk about what points buy. */
  rewards: { name: string; cost: number; demo: boolean }[]
  goals: { shortTerm: string; longTerm: string; targetRole: string }
}

// Learners are in India, so a "day" runs midnight to midnight IST, wherever the server is.
const IST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" })
export const dayKey = (d: Date) => IST_DAY.format(d)
const shiftDay = (key: string, days: number) => {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const dayLabel = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })

/**
 * Streak with Streak Freezes. Each freeze, in order of purchase, covers the first missed day on or
 * after the day it was bought (days before the first lesson don't count as missed). A frozen day
 * keeps the streak alive but doesn't add to it. Today only counts once it has a lesson.
 */
export function computeStreak(active: Set<string>, freezeDays: string[], today: string) {
  const frozen = new Set<string>()
  const freezes = [...freezeDays].sort()
  let used = 0
  const first = [...active].sort()[0]
  if (first) {
    const yesterday = shiftDay(today, -1)
    for (let d = first; d <= yesterday; d = shiftDay(d, 1)) {
      if (active.has(d)) continue
      if (used < freezes.length && freezes[used] <= d) {
        frozen.add(d)
        used++
      }
    }
  }
  let streak = 0
  let cursor = active.has(today) ? today : shiftDay(today, -1)
  while (active.has(cursor) || frozen.has(cursor)) {
    if (active.has(cursor)) streak++
    cursor = shiftDay(cursor, -1)
  }
  return { streak, frozen, freezesAvailable: freezes.length - used }
}

type PlacementRow = { track?: string; placed_level?: number; target_level?: number; submitted_at?: string } | null

/**
 * The learner's level. "tested" comes only from placement_result() (server-written, so the
 * learner can't edit it). Otherwise it's "estimated": an old self-set current_nsqf_level, else
 * the official entry level for their education, else the highest level among their roadmaps.
 */
type LevelFields = { current_nsqf_level?: unknown; academicBackground?: { highestQualification?: unknown }; [key: string]: unknown }

export function resolveLevel(placement: unknown, onboarding: LevelFields, roadmaps: { nsqfLevel: number | null }[]): LearnerLevel {
  const p = placement as PlacementRow
  if (p && typeof p.placed_level === "number") {
    return {
      value: clampNsqfLevel(p.placed_level),
      source: "tested",
      track: typeof p.track === "string" ? p.track : undefined,
      target: typeof p.target_level === "number" ? clampNsqfLevel(p.target_level) : undefined,
      takenAt: p.submitted_at,
    }
  }
  const saved = Number(onboarding.current_nsqf_level)
  const fromRoadmaps = roadmaps.reduce<number | null>((max, r) => (r.nsqfLevel !== null && (max === null || r.nsqfLevel > max) ? r.nsqfLevel : max), null)
  const estimate =
    Number.isFinite(saved) && saved > 0
      ? saved
      : (estimateLevelFromEducation(String(onboarding.academicBackground?.highestQualification ?? "")) ?? fromRoadmaps)
  return { value: estimate === null ? null : clampNsqfLevel(estimate), source: "estimated" }
}

/** Loads everything the learner-facing features need, using the caller's RLS-scoped client. */
export async function loadLearner(supabase: SupabaseServerClient, userId: string): Promise<LearnerSnapshot> {
  const [{ data: profile }, { data: roadmapRows }, { data: progressRows }, eventsRes, redemptionsRes, catalogRes, verifiedRes, placementRes] = await Promise.all([
    supabase.from("profiles").select("full_name, points, onboarded, onboarding_data").eq("id", userId).single(),
    supabase
      .from("roadmaps")
      .select("id, title, nsqf_level, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("progress").select("roadmap_id, module_index, topic_index, completed_at").eq("user_id", userId),
    // The next three fail softly (empty) until scripts/schema.sql has added the rewards tables.
    supabase.from("point_events").select("amount, kind, ref, created_at").eq("user_id", userId),
    supabase.from("reward_redemptions").select("reward_id, target_id, created_at").eq("user_id", userId),
    supabase.from("reward_catalog").select("name, cost, kind").eq("active", true).order("sort", { ascending: true }),
    supabase.rpc("verified_roadmaps"),
    // Null until the learner submits a placement test (or until schema.sql adds the function).
    supabase.rpc("placement_result"),
  ])
  const events = eventsRes.data ?? []
  const redemptions = redemptionsRes.data ?? []

  const progress = progressRows ?? []
  const doneByRoadmap = new Map<string, Set<string>>()
  for (const p of progress) {
    const set = doneByRoadmap.get(p.roadmap_id) ?? new Set<string>()
    set.add(`${p.module_index}:${p.topic_index}`)
    doneByRoadmap.set(p.roadmap_id, set)
  }

  let hoursLearned = 0
  const roadmaps: RoadmapSummary[] = (roadmapRows ?? []).map((r) => {
    const modules: Module[] = Array.isArray(r.content?.modules) ? r.content.modules : []
    const done = doneByRoadmap.get(r.id) ?? new Set<string>()
    const topics: RoadmapSummary["topics"] = []
    modules.forEach((m, mi) =>
      (m.topics ?? []).forEach((t, ti) => {
        const hours = Number(t.estimatedHours) || 0
        const isDone = done.has(`${mi}:${ti}`)
        if (isDone) hoursLearned += hours
        topics.push({ moduleIndex: mi, topicIndex: ti, title: t.title ?? "Untitled topic", moduleTitle: m.title ?? "", hours, done: isDone })
      }),
    )
    const doneCount = topics.filter((t) => t.done).length
    const next = topics.find((t) => !t.done) ?? null
    const q = getQualification(r.content?.qualification?.id)
    return {
      id: r.id,
      title: r.title,
      nsqfLevel: typeof r.nsqf_level === "number" ? r.nsqf_level : null,
      qualification: q ? { id: q.id, title: q.title, level: q.level, code: q.code } : null,
      total: topics.length,
      done: doneCount,
      percent: topics.length ? Math.round((doneCount / topics.length) * 100) : 0,
      topics,
      next: next && { moduleIndex: next.moduleIndex, topicIndex: next.topicIndex, title: next.title, moduleTitle: next.moduleTitle },
    }
  })

  // Activity: lessons completed per day. A lesson's first-tick time comes from its ledger row when
  // there is one, so unticking a lesson later doesn't erase the day you learned it.
  const firstTicked = new Map<string, string>()
  for (const e of events) {
    if (e.kind === "topic") firstTicked.set(e.ref, e.created_at)
  }
  for (const p of progress) {
    const ref = `${p.roadmap_id}:${p.module_index}:${p.topic_index}`
    if (!firstTicked.has(ref) && p.completed_at) firstTicked.set(ref, p.completed_at)
  }
  const perDay = new Map<string, number>()
  for (const at of firstTicked.values()) {
    const k = dayKey(new Date(at))
    perDay.set(k, (perDay.get(k) ?? 0) + 1)
  }

  const freezeDays = redemptions.filter((r) => r.reward_id === "streak-freeze").map((r) => dayKey(new Date(r.created_at)))
  const today = dayKey(new Date())
  const { streak, frozen, freezesAvailable } = computeStreak(new Set(perDay.keys()), freezeDays, today)
  const week: DayActivity[] = []
  for (let i = 6; i >= 0; i--) {
    const k = shiftDay(today, -i)
    week.push({ date: k, label: dayLabel(k), count: perDay.get(k) ?? 0, frozen: frozen.has(k) })
  }

  // Points: lifetime totals from the ledger (before the ledger exists, everything is "earned").
  let pointsEarned = 0
  let pointsSpent = 0
  for (const e of events) {
    if (e.amount > 0) pointsEarned += e.amount
    else pointsSpent -= e.amount
  }
  const points = typeof profile?.points === "number" ? profile.points : 0
  if (eventsRes.error) pointsEarned = points

  const finished = new Set(roadmaps.filter((r) => r.total > 0 && r.done === r.total).map((r) => r.id))
  for (const e of events) {
    if (e.kind === "roadmap_bonus") finished.add(e.ref)
  }

  const onboarding = (profile?.onboarding_data as Record<string, any>) ?? {}
  const level = resolveLevel(placementRes.data, onboarding, roadmaps)
  const currentLevel = level.value

  return {
    name: profile?.full_name ?? null,
    points,
    pointsEarned,
    pointsSpent,
    onboarded: Boolean(profile?.onboarded),
    onboarding,
    level,
    currentLevel,
    roadmaps,
    roadmapsFinished: finished.size,
    topicsDone: progress.length,
    totalTopics: roadmaps.reduce((acc, r) => acc + r.total, 0),
    hoursLearned: Math.round(hoursLearned * 10) / 10,
    streak,
    activeDays: perDay.size,
    week,
    freezesAvailable,
    stickerPack: redemptions.some((r) => r.reward_id === "sticker-pack"),
    certificates: redemptions.filter((r) => r.reward_id === "completion-certificate" && r.target_id).map((r) => r.target_id as string),
    verifiedRoadmaps: Array.isArray(verifiedRes.data) ? (verifiedRes.data as string[]) : [],
    rewards: (catalogRes.data ?? []).map((r) => ({ name: r.name, cost: Number(r.cost), demo: r.kind !== "perk" })),
    goals: {
      shortTerm: onboarding.aspirations?.shortTermGoal ?? "",
      longTerm: onboarding.aspirations?.longTermGoal ?? "",
      targetRole: onboarding.aspirations?.targetJobRole ?? "",
    },
  }
}

/** Compact plain-text description of the learner, used to ground model prompts. */
export function describeLearner(l: LearnerSnapshot): string {
  const o = l.onboarding
  const lines = [
    `Name: ${l.name ?? "unknown"}`,
    l.level.value === null
      ? "NSQF level: not known yet (no placement test taken)"
      : l.level.source === "tested"
        ? `NSQF level: ${l.level.value}, tested by GyaanGuru's placement test in "${getTrack(l.level.track)?.name ?? l.level.track}" (a practice test, not an official NSQF assessment)${l.level.target ? `; recommended next: level ${l.level.target} qualifications` : ""}`
        : `NSQF level: about ${l.level.value}, estimated from their education and roadmaps, not tested`,
    `Education: ${o.academicBackground?.highestQualification || "unknown"}${o.academicBackground?.stream ? ` (${o.academicBackground.stream})` : ""}`,
    `Skills: ${o.priorSkills?.skills || "not given"}`,
    `Location: ${o.socioEconomic?.location || "not given"}; devices: ${o.socioEconomic?.accessToDevices || "not given"}; English: ${o.socioEconomic?.englishProficiency || "not given"}`,
    `Learning preferences: ${[o.learningPreferences?.mode, o.learningPreferences?.pace, o.learningPreferences?.hoursPerWeek && `${o.learningPreferences.hoursPerWeek} h/week`, o.learningPreferences?.preferredLanguage].filter(Boolean).join(", ") || "not given"}`,
    `Goals: short-term "${l.goals.shortTerm || "-"}", long-term "${l.goals.longTerm || "-"}", target role "${l.goals.targetRole || "-"}"`,
    `Progress: ${l.topicsDone}/${l.totalTopics} lessons done, ${l.roadmapsFinished} roadmap(s) finished, ${l.hoursLearned} h learned, ${l.streak}-day streak${l.freezesAvailable ? ` (${l.freezesAvailable} Streak Freeze(s) saved)` : ""}`,
    `Points: ${l.points} to spend (${l.pointsEarned} earned, ${l.pointsSpent} spent). Passing a lesson's quiz pays 5 (ticking a lesson pays nothing); a verified roadmap (every quiz passed plus an approved recap) pays a bonus of max(60, 8 x lessons) and unlocks a certificate.`,
  ]
  if (l.rewards.length) {
    lines.push(`Rewards points can buy on the /rewards page: ${l.rewards.map((r) => `${r.name} (${r.cost}${r.demo ? ", demo item, nothing is delivered" : ""})`).join(", ")}`)
  }
  if (l.roadmaps.length) {
    lines.push("Roadmaps:")
    for (const r of l.roadmaps.slice(0, 5)) {
      lines.push(
        `- "${r.title}"${
          r.qualification
            ? ` (prepares for the real NSQF qualification "${r.qualification.title}", level ${formatLevel(r.qualification.level)}, NQR code ${r.qualification.code})`
            : r.nsqfLevel
              ? ` (estimated NSQF level ${r.nsqfLevel})`
              : ""
        }: ${r.percent}% done${r.next ? `; next lesson "${r.next.title}" in module "${r.next.moduleTitle}"` : "; completed"}`,
      )
    }
  } else {
    lines.push("Roadmaps: none yet")
  }
  return lines.join("\n")
}
