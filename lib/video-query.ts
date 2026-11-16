// Short YouTube search queries for a lesson. Long queries (roadmap title + module + lesson, plus unit
// codes like "(SSC/N8127)") return nothing, so build a few short ones, most specific first; the
// /api/youtube route tries them in order until one finds enough videos.

const FILLER = new Set(
  "nsqf level certification certificate roadmap course complete comprehensive guide beginner beginners beginner's intermediate advanced program programme path learning journey mastery masterclass prep preparation foundations fundamentals introduction to and for the a an of in on with your from".split(
    " ",
  ),
)

/** Removes unit codes, numbering and punctuation, and collapses spaces. */
export function cleanForSearch(text: string | null | undefined): string {
  return (text ?? "")
    // NOS codes like SSC/N8127, NIE/ITS/N14054 or MSME/FSD/01 (with or without brackets), but not words like CI/CD
    .replace(/\(?\b[A-Z]{2,5}(?:\/[A-Z]{2,5})?\/N?\d{2,5}\b\)?/g, " ")
    .replace(/\b(module|unit|lesson|week|part|step)\s*\d+\s*[:.-]?/gi, " ")
    .replace(/\blevel\s*\d+(\.\d)?\b/gi, " ")
    .replace(/[^\p{L}\p{N}+#./&' -]/gu, " ")
    .replace(/\s[-&/]+(?=\s)/g, " ") // stray separators left between words
    .replace(/\s+/g, " ")
    .trim()
}

/** The subject of a roadmap in a few words: "NSQF Level 5 Business Intelligence Analyst Certification Roadmap" → "Business Intelligence Analyst". */
export function subjectWords(title: string | null | undefined, max = 3): string {
  return cleanForSearch(title)
    .split(" ")
    .filter((w) => /[\p{L}\p{N}]/u.test(w) && !FILLER.has(w.toLowerCase()))
    .slice(0, max)
    .join(" ")
}

const limitWords = (s: string, max: number) => s.split(" ").filter(Boolean).slice(0, max).join(" ")

/** Up to three distinct queries, most specific first. */
export function videoQueries({
  lessonTitle,
  moduleTitle,
  roadmapTitle,
  qualificationTitle,
}: {
  lessonTitle: string
  moduleTitle?: string | null
  roadmapTitle?: string | null
  qualificationTitle?: string | null
}): string[] {
  const lesson = limitWords(cleanForSearch(lessonTitle), 8)
  const subject = subjectWords(qualificationTitle || roadmapTitle)
  const mod = limitWords(cleanForSearch(moduleTitle), 8)
  const lessonHasSubject = subject && lesson.toLowerCase().includes(subject.toLowerCase())
  const candidates = [
    lesson && subject && !lessonHasSubject ? `${limitWords(lesson, 6)} ${subject}` : "",
    lesson ? `${lesson} tutorial` : "",
    mod ? `${mod} tutorial` : "",
  ]
  const seen = new Set<string>()
  return candidates.filter((q) => q && !seen.has(q.toLowerCase()) && seen.add(q.toLowerCase())).slice(0, 3)
}
