"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

export function JobCard({ job, className }: { job: Job; className?: string }) {
  const posted = job.created_at ? formatDistanceToNow(new Date(job.created_at), { addSuffix: true }) : "Recently"

  return (
    <Card className={cn("bg-card border", className)}>
      <CardHeader className="space-y-2">
        <CardTitle className="text-pretty">{job.title}</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">{job.company}</span>
          <span aria-hidden="true">•</span>
          <span>{job.location}</span>
          <span aria-hidden="true">•</span>
          <span>Posted {posted}</span>
        </div>
        <div className="flex items-center gap-2">
          {job.salary ? <Badge variant="secondary">{job.salary}</Badge> : null}
          {job.source ? <Badge variant="outline">Source: {job.source}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {job.description ? <p className="text-sm text-muted-foreground line-clamp-3">{job.description}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <a href={job.url} target="_blank" rel="noreferrer noopener">
              View & Apply
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
