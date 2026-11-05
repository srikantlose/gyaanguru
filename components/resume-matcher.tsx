"use client"

import { useState } from "react"
import { FileText, Loader2, Sparkle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Result = {
  role: string
  matchScore: number
  summary: string
  strengths: string[]
  missingSkills: string[]
  suggestedCourses: string[]
  nsqfLevel?: number
}

function scoreTone(score: number) {
  if (score >= 70) return "bg-leaf"
  if (score >= 45) return "bg-marigold"
  return "bg-coral"
}

/** Paste or upload a resume; Gemini scores it against a target role with gaps and courses to close them. */
export function ResumeMatcher({ defaultRole = "" }: { defaultRole?: string }) {
  const [resumeText, setResumeText] = useState("")
  const [role, setRole] = useState(defaultRole)
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const onFile = async (file?: File) => {
    if (!file) return
    setFileName(file.name)
    setResumeText((await file.text()).slice(0, 12000))
  }

  const onMatch = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/resume-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, targetRole: role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Couldn't analyse your resume.")
      setResult(data.result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't analyse your resume.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-2">
          <Label htmlFor="target-role">Target role (optional)</Label>
          <Input
            id="target-role"
            placeholder="e.g. Data Analyst, Electrician, SEO Specialist"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Leave empty and we&apos;ll find the role you fit best.</p>
          <Label htmlFor="resume-file" className="pt-2">
            Or upload a text file
          </Label>
          <Input id="resume-file" type="file" accept=".txt,.md" onChange={(e) => onFile(e.target.files?.[0] || undefined)} />
          {fileName && (
            <p className="flex items-center gap-1 text-xs font-semibold text-ink/70">
              <FileText className="h-3.5 w-3.5" /> {fileName}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="resume-text">Your resume</Label>
          <Textarea
            id="resume-text"
            placeholder="Paste your resume / CV text here: education, skills, projects, experience…"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="min-h-[180px]"
          />
        </div>
      </div>

      <Button onClick={onMatch} disabled={loading || resumeText.trim().length < 40}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkle className="h-4 w-4" />}
        {loading ? "Analysing…" : "Analyse my resume"}
      </Button>

      {error && (
        <div role="alert" className="rounded-xl border-2 border-ink bg-coral-soft px-4 py-3 text-sm font-semibold text-coral-ink">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-2xl border-2 border-ink bg-paper p-5 shadow-brut">
          <div className="flex flex-wrap items-center gap-4">
            <div
              className={cn(
                "flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-2 border-ink font-display text-2xl font-black text-ink shadow-soft",
                scoreTone(result.matchScore),
              )}
              aria-label={`Match score ${result.matchScore} percent`}
            >
              {result.matchScore}%
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Match for</p>
              <p className="font-display text-xl font-extrabold text-ink">{result.role}</p>
              <p className="mt-1 text-sm text-ink/75">{result.summary}</p>
            </div>
            {result.nsqfLevel ? (
              <span className="rounded-full border-2 border-ink bg-marigold px-3 py-1 text-sm font-black text-ink shadow-soft">
                Profile ≈ NSQF L{result.nsqfLevel}
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <ChipList title="Strengths" items={result.strengths} tone="bg-leaf-soft" />
            <ChipList title="Skills to add" items={result.missingSkills} tone="bg-coral-soft" />
            <ChipList title="Courses to consider" items={result.suggestedCourses} tone="bg-lagoon-soft" />
          </div>
        </div>
      )}
    </div>
  )
}

function ChipList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      {items.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((s) => (
            <li key={s} className={cn("rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-semibold text-ink", tone)}>
              {s}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">None</p>
      )}
    </div>
  )
}
