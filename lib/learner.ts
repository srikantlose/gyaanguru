import type { createClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type Topic = { id?: string; title?: string; description?: string; estimatedHours?: number | string }
type Module = { id?: string; title?: string; topics?: Topic[] }

export type RoadmapSummary = {
  id: string
  title: string
  nsqfLevel: number | null
  total: number
  done: number
  percent: number
  /** Ordered topics with completion flags (for the learning-path view). */
  topics: { moduleIndex: number; topicIndex: number; title: string; moduleTitle: string; hours: number; done: boolean }[]
  next: { moduleIndex: number; topicIndex: number; title: string; moduleTitle: string } | null
}

export type DayActivity = { date: string; label: string; count: number }

export type LearnerSnapshot = {
  name: string | null
  points: number
  onboarded: boolean
  onboarding: Record<string, any>
  currentLevel: number | null
  roadmaps: RoadmapSummary[]
  topicsDone: number
  totalTopics: number
  hoursLearned: number
  streak: number
  activeDays: number
  week: DayActivity[]
  goals: { shortTerm: string; longTerm: string; targetRole: string }
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

/** Loads everything the learner-facing features need, using the caller's RLS-scoped client. */
export async function loadLearner(supabase: SupabaseServerClient, userId: string): Promise<LearnerSnapshot> {
  const [{ data: profile }, { data: roadmapRows }, { data: progressRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, points, onboarded, onboarding_data").eq("id", userId).single(),
    supabase
      .from("roadmaps")
      .select("id, title, nsqf_level, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("progress").select("roadmap_id, module_index, topic_index, completed_at").eq("user_id", userId),
  ])

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
    return {
      id: r.id,
      title: r.title,
      nsqfLevel: typeof r.nsqf_level === "number" ? r.nsqf_level : null,
      total: topics.length,
      done: doneCount,
      percent: topics.length ? Math.round((doneCount / topics.length) * 100) : 0,
      topics,
      next: next && { moduleIndex: next.moduleIndex, topicIndex: next.topicIndex, title: next.title, moduleTitle: next.moduleTitle },
    }
  })

  // Activity: completions per day, streak of consecutive active days ending today or yesterday.
  const perDay = new Map<string, number>()
  for (const p of progress) {
    if (!p.completed_at) continue
    const k = dayKey(new Date(p.completed_at))
    perDay.set(k, (perDay.get(k) ?? 0) + 1)
  }
  const today = new Date()
  const week: DayActivity[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    week.push({ date: dayKey(d), label: d.toLocaleDateString("en-IN", { weekday: "short" }), count: perDay.get(dayKey(d)) ?? 0 })
  }
  let streak = 0
  const cursor = new Date(today)
  if (!perDay.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (perDay.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  const onboarding = (profile?.onboarding_data as Record<string, any>) ?? {}
  const savedLevel = onboarding.current_nsqf_level
  const currentLevel =
    typeof savedLevel === "number"
      ? savedLevel
      : roadmaps.reduce<number | null>((max, r) => (r.nsqfLevel !== null && (max === null || r.nsqfLevel > max) ? r.nsqfLevel : max), null)

  return {
    name: profile?.full_name ?? null,
    points: typeof profile?.points === "number" ? profile.points : 0,
    onboarded: Boolean(profile?.onboarded),
    onboarding,
    currentLevel,
    roadmaps,
    topicsDone: progress.length,
    totalTopics: roadmaps.reduce((acc, r) => acc + r.total, 0),
    hoursLearned: Math.round(hoursLearned * 10) / 10,
    streak,
    activeDays: perDay.size,
    week,
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
    `Current NSQF level: ${l.currentLevel ?? "not set"}`,
    `Education: ${o.academicBackground?.highestQualification || "unknown"}${o.academicBackground?.stream ? ` (${o.academicBackground.stream})` : ""}`,
    `Skills: ${o.priorSkills?.skills || "not given"}`,
    `Location: ${o.socioEconomic?.location || "not given"}; devices: ${o.socioEconomic?.accessToDevices || "not given"}; English: ${o.socioEconomic?.englishProficiency || "not given"}`,
    `Learning preferences: ${[o.learningPreferences?.mode, o.learningPreferences?.pace, o.learningPreferences?.hoursPerWeek && `${o.learningPreferences.hoursPerWeek} h/week`, o.learningPreferences?.preferredLanguage].filter(Boolean).join(", ") || "not given"}`,
    `Goals: short-term "${l.goals.shortTerm || "-"}", long-term "${l.goals.longTerm || "-"}", target role "${l.goals.targetRole || "-"}"`,
    `Progress: ${l.topicsDone}/${l.totalTopics} lessons done, ${l.hoursLearned} h learned, ${l.points} points, ${l.streak}-day streak`,
  ]
  if (l.roadmaps.length) {
    lines.push("Roadmaps:")
    for (const r of l.roadmaps.slice(0, 5)) {
      lines.push(
        `- "${r.title}"${r.nsqfLevel ? ` (NSQF L${r.nsqfLevel})` : ""}: ${r.percent}% done${r.next ? `; next lesson "${r.next.title}" in module "${r.next.moduleTitle}"` : "; completed"}`,
      )
    }
  } else {
    lines.push("Roadmaps: none yet")
  }
  return lines.join("\n")
}
