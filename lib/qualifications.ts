// Real NSQF qualifications, copied from their pages on the National Qualifications Register
// (data/qualifications.json). Safe to import from client components.
//
// Levels: qualifications carry their exact level (4.5 stays 4.5). For the app's whole-number
// bands (3-6) a half level joins the level above it, which is how the official descriptor table
// groups them ("Level 4.5 to 5").
import { z } from "zod"
import raw from "@/data/qualifications.json"
import { NSQF_MAX_LEVEL, NSQF_MIN_LEVEL } from "@/lib/nsqf"

const UnitSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  hours: z.number().nonnegative().nullable(),
  /** Mandatory or optional in the qualification, as NQR lists it. */
  mandatory: z.boolean(),
  /**
   * False for units GyaanGuru doesn't teach: employability skills, on-the-job training,
   * introduction and generic workplace-safety units. They still count in the official hours.
   */
  core: z.boolean(),
})

const QualificationSchema = z.object({
  id: z.string().regex(/^nqr-\d+$/),
  /** A foundation qualification can sit at the bottom of several tracks. */
  tracks: z.array(z.string().min(1)).min(1),
  title: z.string().min(1),
  code: z.string().min(1),
  level: z.number().min(1).max(8),
  sector: z.string().min(1),
  awardingBody: z.string().min(1),
  certifyingBody: z.string().min(1),
  occupation: z.string().nullable(),
  notionalHours: z.number().nonnegative().nullable(),
  approvedOn: z.string().nullable(),
  validTill: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eligibility: z.array(z.object({ criteria: z.string(), experience: z.string() })),
  units: z.array(UnitSchema).min(1),
  url: z.string().regex(/^https:\/\/www\.nqr\.gov\.in\/qualifications\/\d+$/),
  fileUrl: z.string().url().nullable(),
})

const TrackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  blurb: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
})

const CatalogueSchema = z.object({
  source: z.string(),
  checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tracks: z.array(TrackSchema).min(1),
  qualifications: z.array(QualificationSchema).min(1),
})

export type Qualification = z.infer<typeof QualificationSchema>
export type QualificationUnit = z.infer<typeof UnitSchema>
export type Track = z.infer<typeof TrackSchema>

// Validated once at import, so a bad edit to the JSON fails the build instead of a page.
const catalogue = CatalogueSchema.parse(raw)
for (const q of catalogue.qualifications) {
  for (const t of q.tracks) {
    if (!catalogue.tracks.some((tr) => tr.id === t)) throw new Error(`Qualification ${q.id} names unknown track "${t}"`)
  }
}

export const QUALIFICATIONS_CHECKED_ON = catalogue.checkedOn
export const NQR_URL = "https://www.nqr.gov.in/"
export const SKILL_INDIA_URL = "https://www.skillindiadigital.gov.in/"
// Checked in a browser on 2026-11-15: the course catalogue (filterable) and the training-centre finder.
export const SKILL_INDIA_COURSES_URL = "https://www.skillindiadigital.gov.in/courses"
export const SKILL_INDIA_CENTRES_URL = "https://www.skillindiadigital.gov.in/training-centres"

/** The snapshot a roadmap stores in content.qualification. */
export type QualificationRef = { id: string; code: string; title: string; level: number; checkedOn: string }

export const toRef = (q: Qualification): QualificationRef => ({
  id: q.id,
  code: q.code,
  title: q.title,
  level: q.level,
  checkedOn: QUALIFICATIONS_CHECKED_ON,
})

const byId = new Map(catalogue.qualifications.map((q) => [q.id, q]))

export function getQualification(id: unknown): Qualification | null {
  return typeof id === "string" ? (byId.get(id) ?? null) : null
}

/** A qualification is offered while its NQR approval is valid. `today` is a YYYY-MM-DD key. */
export const isCurrent = (q: Qualification, today: string) => q.validTill >= today

const IST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" })

/** A few current qualifications per band (3-6), lowest level first, for illustrations. Server-side only. */
export function examplesByBand(limit = 4): Record<number, { id: string; title: string; level: number }[]> {
  const today = IST_DAY.format(new Date())
  const out: Record<number, { id: string; title: string; level: number }[]> = {}
  for (let b = NSQF_MIN_LEVEL; b <= NSQF_MAX_LEVEL; b++) {
    out[b] = catalogue.qualifications
      .filter((q) => levelBand(q.level) === b && isCurrent(q, today))
      .sort((x, y) => x.level - y.level || x.title.localeCompare(y.title))
      .slice(0, limit)
      .map((q) => ({ id: q.id, title: q.title, level: q.level }))
  }
  return out
}

export const listTracks = (): Track[] => catalogue.tracks
export const getTrack = (id: unknown): Track | null => catalogue.tracks.find((t) => t.id === id) ?? null
export const TRACK_IDS = catalogue.tracks.map((t) => t.id) as [string, ...string[]]

export const listQualifications = (): Qualification[] => catalogue.qualifications

/** The app's whole-number band for a level: half levels join the level above (4.5 → 5). */
export function levelBand(level: number): number {
  return Math.max(NSQF_MIN_LEVEL, Math.min(NSQF_MAX_LEVEL, Math.ceil(level)))
}

/** "4.5" stays "4.5"; 5 is "5". */
export const formatLevel = (level: number) => (Number.isInteger(level) ? String(level) : level.toFixed(1))

export const coreUnits = (q: Qualification) => q.units.filter((u) => u.core)

/** A track's qualifications grouped by band (3-6), each band sorted by level then title. */
export function ladder(trackId: string): Map<number, Qualification[]> {
  const out = new Map<number, Qualification[]>()
  for (let b = NSQF_MIN_LEVEL; b <= NSQF_MAX_LEVEL; b++) out.set(b, [])
  for (const q of catalogue.qualifications) {
    if (!q.tracks.includes(trackId)) continue
    out.get(levelBand(q.level))?.push(q)
  }
  for (const list of out.values()) list.sort((a, b) => a.level - b.level || a.title.localeCompare(b.title))
  return out
}

/** Qualifications in a track at the first band at or above `band` that has any. */
export function recommend(trackId: string, band: number): Qualification[] {
  const steps = ladder(trackId)
  for (let b = Math.max(NSQF_MIN_LEVEL, band); b <= NSQF_MAX_LEVEL; b++) {
    const list = steps.get(b) ?? []
    if (list.length) return list
  }
  return []
}

const STOPWORDS = new Set(
  "a an and or the of in on for to with by from at as is are be into using use via my i want learn learning become how basic basics course skills skill job role level".split(" "),
)

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ""))
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const keywordRes = new Map<string, RegExp>()
// Whole-word match, so "ai" doesn't match "maintain" and "ads" doesn't match "loads".
function hasKeyword(text: string, keyword: string) {
  let re = keywordRes.get(keyword)
  if (!re) {
    re = new RegExp(`(^|[^a-z0-9])${escapeRe(keyword.toLowerCase())}($|[^a-z0-9])`, "i")
    keywordRes.set(keyword, re)
  }
  return re.test(text)
}

function keywordScore(text: string, keywords: string[]): number {
  return keywords.reduce((acc, k) => (hasKeyword(text, k) ? acc + (k.includes(" ") ? 2 : 1) : acc), 0)
}

/** The track whose keywords best match free text (goals, skills, a topic); null if nothing matches. */
export function guessTrack(text: string): Track | null {
  let best: Track | null = null
  let bestScore = 0
  for (const t of catalogue.tracks) {
    const s = keywordScore(text, t.keywords)
    if (s > bestScore) {
      best = t
      bestScore = s
    }
  }
  return best
}

/** Sorts qualifications by how well their title, occupation and units match free text (stable). */
export function rankQualifications(list: Qualification[], text: string): Qualification[] {
  const terms = words(text)
  if (!terms.length) return list
  const score = (q: Qualification) => {
    const own = new Set(words([q.title, q.occupation ?? "", ...coreUnits(q).map((u) => u.title)].join(" ")))
    return terms.filter((w) => own.has(w)).length
  }
  return list
    .map((q, i) => ({ q, i, s: score(q) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.q)
}

/**
 * Qualifications that fit a topic, best first. Scores the topic against each qualification's
 * title, occupation and unit titles plus its track's keywords, then prefers levels near `band`.
 * Returns nothing when the topic matches no track or qualification at all.
 */
export function suggestQualifications({ topic, band, today, limit = 4 }: { topic: string; band?: number | null; today: string; limit?: number }) {
  const terms = words(topic)
  if (!terms.length) return []
  const scored = catalogue.qualifications
    .filter((q) => isCurrent(q, today))
    .map((q) => {
      const own = new Set(words([q.title, q.occupation ?? "", ...coreUnits(q).map((u) => u.title)].join(" ")))
      const ownHits = terms.filter((w) => own.has(w)).length
      const trackHits = Math.max(0, ...q.tracks.map((id) => keywordScore(topic, getTrack(id)?.keywords ?? [])))
      const relevance = ownHits * 2 + trackHits
      const distance = band ? Math.abs(levelBand(q.level) - band) : 0
      return { q, relevance, score: relevance * 10 - distance * 3 }
    })
    .filter((s) => s.relevance > 0)
    .sort((a, b) => b.score - a.score || a.q.level - b.q.level)
  return scored.slice(0, limit).map((s) => s.q)
}
