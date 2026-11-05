"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3)
}

const trendingRoles = [
  { title: "Data Analyst", keywords: ["python", "sql", "excel", "analytics", "dashboard"] },
  { title: "Full-Stack Developer", keywords: ["react", "node", "typescript", "api", "testing"] },
  { title: "Growth Marketer", keywords: ["seo", "content", "ads", "analytics", "email"] },
]

export function ResumeMatcher() {
  const [resumeText, setResumeText] = useState("")
  const [score, setScore] = useState<{ role: string; match: number; missing: string[] } | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const onFile = async (file?: File) => {
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    setResumeText(text.slice(0, 20000)) // simple cap
  }

  const onMatch = () => {
    const tokens = new Set(extractKeywords(resumeText))
    let bestRole = ""
    let best = -1
    let missing: string[] = []

    for (const role of trendingRoles) {
      const overlap = role.keywords.filter((k) => tokens.has(k)).length
      if (overlap > best) {
        best = overlap
        bestRole = role.title
        missing = role.keywords.filter((k) => !tokens.has(k))
      }
    }
    const matchPct = Math.round((best / 5) * 100)
    setScore({ role: bestRole, match: matchPct, missing })
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Input type="file" accept=".txt,.md,.mdx,.log" onChange={(e) => onFile(e.target.files?.[0] || undefined)} />
        {fileName ? <div className="text-xs text-muted-foreground">Loaded: {fileName}</div> : null}
        <Textarea
          placeholder="Paste your CV text here..."
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          className="min-h-[120px]"
        />
      </div>
      <Button onClick={onMatch} disabled={!resumeText.trim()}>
        Check Match Against Trending Roles
      </Button>
      {score && (
        <div className="rounded-lg border p-3 text-sm">
          <div className="mb-1">
            Best Match: <Badge>{score.role || "—"}</Badge>
          </div>
          <div className="mb-1">Match Score: {score.match}%</div>
          <div className="text-muted-foreground">
            Missing Keywords: {score.missing.length ? score.missing.join(", ") : "None"}
          </div>
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        This is a local heuristic demo. We can later enhance with AI scoring and live jobs.
      </div>
    </div>
  )
}
