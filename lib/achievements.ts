import type { LearnerSnapshot } from "@/lib/learner"

export type Achievement = {
  id: string
  title: string
  description: string
  tone: "brand" | "marigold" | "coral" | "lagoon" | "leaf" | "bubblegum"
  earned: boolean
  /** 0–100 progress toward earning it. */
  progress: number
  hint: string
}

const pct = (value: number, target: number) => Math.max(0, Math.min(100, Math.round((value / target) * 100)))

/** Badges earned from real activity (lessons, roadmaps, points, streaks, NSQF level). Nothing is stored. */
export function computeAchievements(l: LearnerSnapshot): Achievement[] {
  const modulesDone = l.roadmaps.reduce((acc, r) => {
    const byModule = new Map<number, { total: number; done: number }>()
    for (const t of r.topics) {
      const m = byModule.get(t.moduleIndex) ?? { total: 0, done: 0 }
      m.total++
      if (t.done) m.done++
      byModule.set(t.moduleIndex, m)
    }
    return acc + [...byModule.values()].filter((m) => m.total > 0 && m.done === m.total).length
  }, 0)
  // Finished now or ever (a paid roadmap bonus keeps counting), so these badges are never taken away.
  const roadmapsDone = l.roadmapsFinished

  const add = (
    a: Omit<Achievement, "earned" | "progress">,
    value: number,
    target: number,
  ): Achievement => ({ ...a, earned: value >= target, progress: pct(value, target) })

  return [
    add({ id: "planner", title: "Planner", description: "Create your first roadmap", tone: "brand", hint: `${l.roadmaps.length}/1 roadmaps` }, l.roadmaps.length, 1),
    add({ id: "first-step", title: "First Step", description: "Complete your first lesson", tone: "leaf", hint: `${l.topicsDone}/1 lessons` }, l.topicsDone, 1),
    add({ id: "warmed-up", title: "Warmed Up", description: "Complete 5 lessons", tone: "lagoon", hint: `${l.topicsDone}/5 lessons` }, l.topicsDone, 5),
    add({ id: "module-master", title: "Module Master", description: "Finish every lesson in a module", tone: "marigold", hint: `${modulesDone}/1 modules` }, modulesDone, 1),
    add({ id: "on-a-roll", title: "On a Roll", description: "Learn 3 days in a row", tone: "coral", hint: `${l.streak}/3 day streak` }, l.streak, 3),
    add({ id: "point-collector", title: "Point Collector", description: "Earn 100 points", tone: "bubblegum", hint: `${l.pointsEarned}/100 points earned` }, l.pointsEarned, 100),
    add({ id: "finisher", title: "Finisher", description: "Complete a whole roadmap", tone: "leaf", hint: `${roadmapsDone}/1 roadmaps` }, roadmapsDone, 1),
    add({ id: "momentum-builder", title: "Momentum Builder", description: "Finish 5 roadmaps", tone: "lagoon", hint: `${roadmapsDone}/5 roadmaps` }, roadmapsDone, 5),
    add({ id: "learning-champion", title: "Learning Champion", description: "Finish 10 roadmaps", tone: "bubblegum", hint: `${roadmapsDone}/10 roadmaps` }, roadmapsDone, 10),
    add({ id: "level-up", title: "Level Up", description: "Reach NSQF Level 5", tone: "marigold", hint: `L${l.currentLevel ?? "–"} of L5` }, l.currentLevel ?? 0, 5),
  ]
}
