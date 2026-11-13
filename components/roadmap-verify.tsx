"use client"

import Link from "next/link"
import { useState } from "react"
import { CheckCircle2, Circle, Loader2, PenLine, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { RichText } from "@/components/rich-text"
import { RECAP_MAX_CHARS, RECAP_MIN_CHARS, quizPassMark } from "@/lib/rewards"
import { cn } from "@/lib/utils"

type Lesson = { key: string; title: string; moduleTitle: string; passed: boolean }

/**
 * The checklist for verifying a roadmap: every lesson quiz passed, then a short recap that the
 * server has Gemini check. A verified roadmap pays the bonus and unlocks its certificate.
 */
export function RoadmapVerifyDialog({
  open,
  onOpenChange,
  roadmapId,
  lessons,
  recapApproved,
  bonusPaid,
  bonusAmount,
  onApproved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roadmapId: string
  lessons: Lesson[]
  recapApproved: boolean
  bonusPaid: boolean
  bonusAmount: number
  onApproved: (bonus: number) => void
}) {
  const [recap, setRecap] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ approved: boolean; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const passed = lessons.filter((l) => l.passed).length
  const allPassed = lessons.length > 0 && passed === lessons.length
  const length = recap.trim().length

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    setFeedback(null)
    try {
      const res = await fetch("/api/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roadmapId, recap }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Couldn't check your recap. Please try again.")
      setFeedback({ approved: Boolean(data.approved), text: data.feedback || "" })
      if (data.approved) onApproved(Number(data.bonus) || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't check your recap. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-ink">Verify this roadmap</DialogTitle>
          <DialogDescription className="text-ink/75">
            Prove you learned it to earn the <strong className="text-ink">+{bonusAmount} point</strong> bonus and unlock a Completion
            Certificate.
          </DialogDescription>
        </DialogHeader>

        <section>
          <p className="flex items-center gap-2 font-display font-extrabold text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-marigold text-xs">1</span>
            Pass every lesson quiz ({passed} of {lessons.length})
          </p>
          <p className="mt-1 text-sm text-ink/70">
            Open a lesson and take its quiz. You need {quizPassMark(4)} of 4 right; each new quiz has fresh questions.
          </p>
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-xl border-2 border-ink bg-paper p-2 text-sm">
            {lessons.map((l) => (
              <li key={l.key} className="flex items-start gap-2 px-1 py-0.5">
                {l.passed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf-ink" aria-label="Quiz passed" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink/40" aria-label="Quiz not passed yet" />
                )}
                <span className={cn(l.passed ? "text-ink" : "text-ink/70")}>
                  {l.title}
                  <span className="text-ink/50"> · {l.moduleTitle}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="flex items-center gap-2 font-display font-extrabold text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-marigold text-xs">2</span>
            Write a short recap
          </p>
          {recapApproved ? (
            <p className="mt-2 flex items-center gap-2 rounded-xl border-2 border-ink bg-leaf-soft px-3 py-2 text-sm font-semibold text-ink">
              <CheckCircle2 className="h-4 w-4 text-leaf-ink" /> Recap approved.
            </p>
          ) : !allPassed ? (
            <p className="mt-1 text-sm text-ink/70">Unlocks once every quiz is passed.</p>
          ) : (
            <div className="mt-2 space-y-2">
              <label htmlFor="recap" className="text-sm text-ink/80">
                In your own words: what did you learn, and how would you use it? Mention at least two specific things.
              </label>
              <Textarea
                id="recap"
                value={recap}
                onChange={(e) => setRecap(e.target.value)}
                maxLength={RECAP_MAX_CHARS}
                rows={5}
                placeholder="e.g. I learned how to clean messy data in pandas by…"
                disabled={submitting}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cn("text-xs font-semibold", length < RECAP_MIN_CHARS ? "text-ink/50" : "text-leaf-ink")}>
                  {length < RECAP_MIN_CHARS ? `${RECAP_MIN_CHARS - length} more characters` : `${length} characters`}
                </span>
                <Button onClick={submit} disabled={submitting || length < RECAP_MIN_CHARS}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                  {submitting ? "Checking…" : "Submit recap"}
                </Button>
              </div>
            </div>
          )}
          {feedback && (
            <div
              role="status"
              className={cn("mt-3 rounded-xl border-2 border-ink px-3 py-2 text-sm text-ink", feedback.approved ? "bg-leaf-soft" : "bg-marigold-soft")}
            >
              <p className="font-bold">{feedback.approved ? "Approved!" : "Not quite yet"}</p>
              {feedback.text && <RichText text={feedback.text} />}
            </div>
          )}
          {error && (
            <p role="alert" className="mt-3 rounded-xl border-2 border-ink bg-coral-soft px-3 py-2 text-sm font-semibold text-ink">
              {error}
            </p>
          )}
        </section>

        {bonusPaid && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-marigold-soft px-3 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Star className="h-4 w-4" /> Verified. The bonus is in your points.
            </p>
            <Button asChild size="sm">
              <Link href="/rewards#perks">Get your certificate</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
