"use client"

import { ArrowUpRight, Clock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SpotlightCard } from "@/components/spotlight-card"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

type Job = {
  id: string
  title: string
  company: string
  location: string
  created_at: string
  salary?: string
  url: string
  description?: string
  source?: string
}

const TONES = [
  { tone: "lagoon", avatar: "bg-lagoon text-ink border-2 border-ink" },
  { tone: "coral", avatar: "bg-coral text-ink border-2 border-ink" },
  { tone: "leaf", avatar: "bg-leaf text-ink border-2 border-ink" },
  { tone: "marigold", avatar: "bg-marigold text-ink border-2 border-ink" },
  { tone: "brand", avatar: "bg-brand text-ink border-2 border-ink" },
] as const

export function JobCard({ job, index = 0, className }: { job: Job; index?: number; className?: string }) {
  const posted = job.created_at ? formatDistanceToNow(new Date(job.created_at), { addSuffix: true }) : "Recently"
  const t = TONES[index % TONES.length]
  const initials = job.company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")

  return (
    <SpotlightCard tone={t.tone} className={cn("h-full", className)}>
      <article className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-base font-extrabold", t.avatar)}
            aria-hidden
          >
            {initials || "?"}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold leading-snug text-ink">{job.title}</h3>
            <p className="text-sm font-semibold text-ink/70">{job.company}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {job.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Posted {posted}
          </span>
        </div>

        {job.description ? <p className="line-clamp-3 text-sm text-muted-foreground">{job.description}</p> : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {job.salary ? (
              <span className="rounded-full bg-marigold-soft px-3 py-1 text-xs font-bold text-marigold-ink">{job.salary}</span>
            ) : null}
            {job.source ? (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                Source: {job.source}
              </span>
            ) : null}
          </div>
          <Button asChild size="sm" className="group/apply">
            <a href={job.url} target="_blank" rel="noreferrer noopener">
              View & Apply
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover/apply:-translate-y-0.5 group-hover/apply:translate-x-0.5" />
            </a>
          </Button>
        </div>
      </article>
    </SpotlightCard>
  )
}
