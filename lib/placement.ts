// NSQF placement test rules and marking. Safe to import from client components.
//
// The test asks PLACEMENT_PER_BAND questions at each band 3-6 of one track. A band is passed
// with PLACEMENT_BAND_PASS right answers. The placed level is the highest band that is passed
// along with every band below it, so a lucky guess at band 6 can't skip a failed band 4.

export const PLACEMENT_BANDS = [3, 4, 5, 6] as const
export const PLACEMENT_PER_BAND = 3
export const PLACEMENT_BAND_PASS = 2
export const PLACEMENT_TIME_LIMIT_MINUTES = 30
export const PLACEMENT_STARTS_PER_DAY = 3

export type PlacementBand = (typeof PLACEMENT_BANDS)[number]

/** A stored question. The answer and explanation never leave the server before submitting. */
export type PlacementQuestion = {
  band: PlacementBand
  /** NOS code the question is built on, or "descriptor" when the band had no qualification. */
  unit: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export type PublicPlacementQuestion = { band: PlacementBand; question: string; options: string[] }

export type BandScores = Record<string, number>

export type PlacementOutcome = {
  bandScores: BandScores
  /** Highest band passed together with every band below it; 3 when none is passed. */
  placed: number
  /** The band to aim for next: one above placed (max 6), or 3 when even band 3 wasn't passed. */
  target: number
  /** False when band 3 itself wasn't passed. */
  passedAny: boolean
}

export function scorePlacement(questions: Pick<PlacementQuestion, "band" | "correctAnswer">[], answers: number[]): PlacementOutcome {
  const bandScores: BandScores = Object.fromEntries(PLACEMENT_BANDS.map((b) => [String(b), 0]))
  questions.forEach((q, i) => {
    if (answers[i] === q.correctAnswer) bandScores[String(q.band)] = (bandScores[String(q.band)] ?? 0) + 1
  })
  let placed: number | null = null
  for (const band of PLACEMENT_BANDS) {
    if ((bandScores[String(band)] ?? 0) >= PLACEMENT_BAND_PASS) placed = band
    else break
  }
  const passedAny = placed !== null
  const top = PLACEMENT_BANDS[PLACEMENT_BANDS.length - 1]
  return {
    bandScores,
    placed: placed ?? PLACEMENT_BANDS[0],
    target: passedAny ? Math.min((placed as number) + 1, top) : PLACEMENT_BANDS[0],
    passedAny,
  }
}

/** The learner's NSQF level and where it came from. Only "tested" comes from the placement test. */
export type LearnerLevel = {
  value: number | null
  source: "tested" | "estimated"
  track?: string
  target?: number
  takenAt?: string
}

/** Short label for a level, e.g. "Tested L4" or "Estimated L4". */
export function levelLabel(level: Pick<LearnerLevel, "value" | "source">): string {
  if (level.value == null) return "Not set"
  return `${level.source === "tested" ? "Tested" : "Estimated"} L${level.value}`
}
