import { NSQF_MAX_LEVEL, clampNsqfLevel } from "@/lib/nsqf"

type RefRow = {
  level: number
  qualificationRequirement: string
  exampleJobRoles: string[]
  courses: string[]
}

export type LearnerInput = {
  education: string
  skills: string[] | string
  goal: string
}

function toArray(val: string[] | string | undefined | null): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map((s) => s.trim()).filter(Boolean)
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function chooseStartLevel({ education, skills }: LearnerInput): number {
  const s = toArray(skills).map((x) => x.toLowerCase())
  const edu = (education || "").toLowerCase()
  if (edu.includes("class 12") && (s.includes("basic it") || s.includes("excel"))) return 4
  if (edu.includes("class 10")) return 3
  if (edu.includes("diploma")) return 5
  if (edu.includes("graduate") || edu.includes("bachelor") || edu.includes("degree")) return 6
  // default MVP floor
  return 4
}

function pickPreferred(items: string[], goal: string): string {
  if (!items?.length) return ""
  const g = goal.toLowerCase()
  return items.find((v) => v.toLowerCase().includes("marketing")) || items[0]
}

async function loadDataset(): Promise<RefRow[]> {
  // dynamic imports work in Next route handlers and avoid TS JSON config concerns
  const base = (await import("@/data/nsqf-reference.json")).default as RefRow[]
  let marketing: RefRow[] = []
  try {
    marketing = (await import("@/data/nsqf-reference-marketing.json")).default as RefRow[]
  } catch {
    marketing = []
  }
  // merge by level, marketing overrides/adds alternatives
  const map = new Map<number, RefRow>()
  base.forEach((r) => map.set(r.level, r))
  marketing.forEach((m) => map.set(m.level, m))
  return Array.from(map.values()).sort((a, b) => a.level - b.level)
}

/** Rule-based 3-step NSQF pathway (L4→L6) from education, skills and goal, using data/*.json. */
export async function buildRoadmap(input: LearnerInput) {
  const dataset = await loadDataset()
  const byLevel = new Map<number, RefRow>(dataset.map((r) => [r.level, r]))
  const start = chooseStartLevel(input)
  const startClamped = clampNsqfLevel(start)
  // We produce a 3-level path, typically L4 -> L5 -> L6 (or from start to the top level)
  const first = Math.max(4, startClamped)
  const levels = [first, Math.min(NSQF_MAX_LEVEL, first + 1), NSQF_MAX_LEVEL].filter(
    (lvl, idx, arr) => idx === 0 || lvl > arr[idx - 1],
  )

  const path = levels.map((lvl) => {
    const ref = byLevel.get(lvl)
    const course = pickPreferred(ref?.courses || [], input.goal)
    const job = pickPreferred(ref?.exampleJobRoles || [], input.goal)
    return {
      nsqfLevel: lvl,
      course,
      jobRole: job,
      qualification: ref?.qualificationRequirement || "",
      alternatives: {
        courses: (ref?.courses || []).filter((c) => c !== course),
        jobRoles: (ref?.exampleJobRoles || []).filter((j) => j !== job),
      },
    }
  })

  return {
    learner: {
      education: input.education,
      skills: toArray(input.skills),
      goal: input.goal,
      startLevel: start,
    },
    path,
  }
}
