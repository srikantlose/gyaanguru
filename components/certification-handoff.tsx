import type { ReactNode } from "react"
import { BadgeCheck, ExternalLink, FileText, MapPin, ScrollText, UserCheck } from "lucide-react"
import {
  QUALIFICATIONS_CHECKED_ON,
  SKILL_INDIA_CENTRES_URL,
  SKILL_INDIA_COURSES_URL,
  coreUnits,
  formatLevel,
  type Qualification,
  type QualificationUnit,
} from "@/lib/qualifications"

// Plain names for the units a roadmap doesn't teach.
function skippedName(u: QualificationUnit) {
  if (/employab/i.test(u.title)) return "employability skills"
  if (/\bOJT\b|on[- ]the[- ]job|project/i.test(u.title)) return "on-the-job training"
  if (/^intro/i.test(u.title)) return "an introduction"
  return u.title.replace(/\s*\(.*\)$/, "").toLowerCase()
}

type Props = {
  qualification: Qualification
  /** Study hours in the learner's roadmap, for the honest comparison with the official course. */
  roadmapHours: number
  /** Roadmap verified (every quiz passed and the recap approved). */
  verified: boolean
}

const longDate = (key: string) =>
  new Date(`${key}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })

const shortBody = (name: string) => name.replace(/\s*\(.*\)\s*$/, "")

function Step({ n, icon: Icon, title, children }: { n: number; icon: typeof FileText; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-marigold font-display font-black text-ink shadow-soft">
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="flex items-center gap-1.5 font-bold text-ink">
          <Icon className="h-4 w-4 shrink-0" />
          {title}
        </p>
        <div className="mt-1 text-sm text-ink/75">{children}</div>
      </div>
    </li>
  )
}

const linkClass = "inline-flex items-center gap-1 font-bold text-primary underline-offset-2 hover:underline"

/** How to go from a GyaanGuru roadmap to the real NSQF certificate. GyaanGuru never certifies anyone. */
export function CertificationHandoff({ qualification: q, roadmapHours, verified }: Props) {
  const body = shortBody(q.awardingBody)
  const units = coreUnits(q)
  const skipped = [...new Set(q.units.filter((u) => !u.core).map(skippedName))]
  return (
    <section id="get-certified" aria-labelledby="get-certified-title" className="scroll-mt-24 rounded-3xl border-2 border-ink bg-card p-5 shadow-brut sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-leaf-ink">After this roadmap</p>
          <h2 id="get-certified-title" className="mt-1 text-2xl text-ink">
            Get the official certificate
          </h2>
          <p className="mt-1 max-w-2xl text-ink/75">
            GyaanGuru can&apos;t give you an NSQF qualification. Only <strong className="text-ink">{body}</strong> can, by
            assessing you for <strong className="text-ink">{q.title}</strong> (NSQF level {formatLevel(q.level)}). Here&apos;s how.
          </p>
        </div>
        <span className="rounded-full border-2 border-ink bg-leaf-soft px-3 py-1 text-sm font-bold text-ink">
          NQR code <span className="font-mono text-xs">{q.code}</span>
        </span>
      </div>

      {!verified && (
        <p className="mt-4 rounded-xl border-2 border-ink bg-marigold-soft px-4 py-2.5 text-sm font-semibold text-ink">
          First, finish and verify this roadmap: pass every lesson quiz, then get your recap approved in the bonus checklist.
        </p>
      )}

      <ol className="mt-5 space-y-4">
        <Step n={1} icon={UserCheck} title="Check you can enrol">
          {q.eligibility.length ? (
            <>
              <p>The register lists these entry routes (any one is enough):</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {q.eligibility.map((e, i) => (
                  <li key={i}>
                    {e.criteria}
                    {e.experience && !/^no experience$/i.test(e.experience) ? `, plus ${e.experience.toLowerCase()} of experience` : ""}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>The register doesn&apos;t list entry routes for this one; check the qualification file.</p>
          )}
        </Step>
        <Step n={2} icon={FileText} title="Read what the assessment covers">
          <p>
            The qualification file sets out every unit and how it&apos;s assessed.{" "}
            {q.fileUrl ? (
              <a href={q.fileUrl} target="_blank" rel="noreferrer" className={linkClass}>
                Open the qualification file (PDF) <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <a href={q.url} target="_blank" rel="noreferrer" className={linkClass}>
                Open it on the register <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </p>
        </Step>
        <Step n={3} icon={MapPin} title="Find a training centre or assessment">
          <p>
            On Skill India Digital Hub, look for &ldquo;{q.title}&rdquo; in the course catalogue, then find a training centre near you that
            runs it and its assessment.
          </p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <a href={SKILL_INDIA_COURSES_URL} target="_blank" rel="noreferrer" className={linkClass}>
              Skill courses <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a href={SKILL_INDIA_CENTRES_URL} target="_blank" rel="noreferrer" className={linkClass}>
              Training centres <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
        </Step>
        <Step n={4} icon={BadgeCheck} title="Take the assessment">
          <p>
            {body} assesses you and, if you pass, issues the certificate ({q.certifyingBody === q.awardingBody ? "they certify it too" : `certified by ${shortBody(q.certifyingBody)}`}). Results and certificates
            appear on Skill India Digital Hub.
          </p>
        </Step>
      </ol>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border-2 border-ink bg-paper p-4 text-sm">
          <p className="flex items-center gap-1.5 font-bold text-ink">
            <ScrollText className="h-4 w-4" /> Your roadmap vs the official course
          </p>
          <p className="mt-1 text-ink/75">
            Your roadmap covers the {units.length} job units in about {Math.round(roadmapHours)} hours of study.
            {q.notionalHours ? ` The official course is ${q.notionalHours} hours` : " The official course is longer"}
            {skipped.length ? `, and also includes ${skipped.join(", ")}` : ""}
            , with hands-on practicals. Treat this roadmap as preparation, not a replacement.
          </p>
        </div>
        <div className="rounded-2xl border-2 border-ink bg-paper p-4 text-sm">
          <p className="font-bold text-ink">Where this comes from</p>
          <p className="mt-1 text-ink/75">
            Copied from the National Qualifications Register on {longDate(QUALIFICATIONS_CHECKED_ON)}. Approved until{" "}
            {longDate(q.validTill)}. Always confirm the details there before you enrol.
          </p>
          <a href={q.url} target="_blank" rel="noreferrer" className={`${linkClass} mt-1`}>
            {q.title} on nqr.gov.in <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  )
}
