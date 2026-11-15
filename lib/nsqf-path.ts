import { NSQF_MAX_LEVEL, clampNsqfLevel } from "@/lib/nsqf"
import { getTrack, guessTrack, isCurrent, ladder, listTracks, rankQualifications, type Qualification, type Track } from "@/lib/qualifications"

/**
 * A rough starting level from the learner's highest education, using the official NSQF entry
 * rules (the "minimum education" column of the NCVET level table): Grade 10 → 3, Grade 12 → 4,
 * a 3-year diploma or 1st year of UG → 4.5, a UG degree → 5.5, a 4-year UG or PG → 6.
 * Returned as the app's band (half levels round up). Always shown as "estimated", never tested.
 */
export function estimateLevelFromEducation(education: string | null | undefined): number | null {
  const e = ` ${(education ?? "").toLowerCase()} `
  if (!e.trim()) return null
  if (/ph\.?\s?d|doctor|post ?grad|master|\bm\.?\s?(tech|sc|com|a|e)\b|\bmba\b|\bmca\b|\bpg\b/.test(e)) return 6
  if (/diploma|polytechnic/.test(e)) return 5
  if (/\bb\.?\s?tech\b|\bb\.?\s?e\.?\s|4[- ]?year|engineering/.test(e)) return 6
  if (/graduat|bachelor|degree|\bb\.?\s?(sc|com|a)\b|\bbca\b|\bbba\b|\bug\b|college/.test(e)) return 6
  if (/\biti\b|\b(11|12)(th)?\b|hsc|higher secondary|senior secondary|intermediate|\bpuc\b|plus two/.test(e)) return 4
  if (/\b10(th)?\b|\bssc\b|matric|secondary|high school/.test(e)) return 3
  return null
}

export type PathNode = {
  /** The app's band (3-6) for this step. */
  nsqfLevel: number
  qualificationId: string
  title: string
  /** The qualification's exact NSQF level, e.g. 4.5. */
  level: number
  code: string
  awardingBody: string
  occupation: string | null
  url: string
  alternatives: { id: string; title: string; level: number }[]
}

export type PathInput = {
  education?: string | null
  skills?: string[] | string | null
  goal?: string | null
  /** A track id; guessed from goal and skills when missing. */
  track?: string | null
  /** The learner's level (tested or estimated); estimated from education when missing. */
  level?: number | null
  /** Today's date key (YYYY-MM-DD), to leave out qualifications whose approval has lapsed. */
  today: string
}

const asText = (v: string[] | string | null | undefined) => (Array.isArray(v) ? v.join(", ") : (v ?? ""))

function toNode(band: number, q: Qualification, rest: Qualification[]): PathNode {
  return {
    nsqfLevel: band,
    qualificationId: q.id,
    title: q.title,
    level: q.level,
    code: q.code,
    awardingBody: q.awardingBody,
    occupation: q.occupation,
    url: q.url,
    alternatives: rest.map((a) => ({ id: a.id, title: a.title, level: a.level })),
  }
}

/**
 * Rule-based NSQF path from the learner's level up to level 6 in one track, one real
 * qualification per band (best match for the goal first, the rest as alternatives).
 */
export function buildPath(input: PathInput): { track: Track; startLevel: number; estimated: boolean; path: PathNode[] } {
  const goal = asText(input.goal)
  const track = getTrack(input.track) ?? guessTrack(`${goal} ${asText(input.skills)}`) ?? listTracks()[0]
  const given = typeof input.level === "number" && Number.isFinite(input.level) ? input.level : null
  const start = clampNsqfLevel(given ?? estimateLevelFromEducation(input.education) ?? 4)
  const steps = ladder(track.id)
  const path: PathNode[] = []
  for (let band = start; band <= NSQF_MAX_LEVEL; band++) {
    const list = rankQualifications((steps.get(band) ?? []).filter((q) => isCurrent(q, input.today)), goal)
    if (list.length) path.push(toNode(band, list[0], list.slice(1)))
  }
  return { track, startLevel: start, estimated: given === null, path }
}
