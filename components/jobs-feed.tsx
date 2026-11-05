"use client"

import type React from "react"

import useSWR from "swr"
import { useCallback, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { JobCard } from "./job-card"
import { cn } from "@/lib/utils"
import { Info } from "lucide-react"
import { JobsIllustration } from "@/components/illustrations"

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

type ApiResponse = {
  jobs: Job[]
  total: number
  page: number
  limit: number
  provider: string
  warning?: string
  error?: string
  details?: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function JobsFeed({ className }: { className?: string }) {
  const [q, setQ] = useState("")
  const [location, setLocation] = useState("India")
  const [days, setDays] = useState("7")

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (location) params.set("location", location)
    if (days) params.set("days", days)
    params.set("limit", "20")
    return `/api/jobs/search?${params.toString()}`
  }, [q, location, days])

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(buildUrl, fetcher, {
    refreshInterval: 60_000, // 60s auto-refresh for "real-time" updates
    revalidateOnFocus: true,
  })

  const jobs = data?.jobs ?? []
  const provider = data?.provider
  const warning = data?.warning

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      mutate() // trigger immediate refresh
    },
    [mutate],
  )

  const statusText = useMemo(() => {
    if (isLoading) return "Loading jobs..."
    if (error) return "Failed to load jobs"
    if (!jobs.length) return "No jobs found"
    return `${jobs.length} jobs${provider ? ` • Source: ${provider}` : ""}`
  }, [isLoading, error, jobs.length, provider])

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <form
        onSubmit={handleSearch}
        className="grid grid-cols-1 items-end gap-3 rounded-2xl border-2 border-ink bg-card p-4 shadow-brut md:grid-cols-12 sm:p-5"
        aria-label="Job search"
      >
        <div className="md:col-span-5">
          <Label htmlFor="q">Role or keywords</Label>
          <Input
            id="q"
            placeholder="e.g. Frontend, Data Analyst, Java"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="md:col-span-4">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="India, Bengaluru, Pune, Remote"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="days">Freshness (days)</Label>
          <Input
            id="days"
            type="number"
            min={1}
            max={30}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="md:col-span-1">
          <Button className="w-full" type="submit" aria-label="Search jobs">
            Search
          </Button>
        </div>
      </form>

      {warning ? (
        <div className="flex items-start gap-2.5 rounded-xl border-2 border-ink bg-marigold-soft px-4 py-3 text-sm text-ink/80">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-marigold-ink" />
          <span>
            Showing sample jobs. {warning} Add ADZUNA_APP_ID and ADZUNA_APP_KEY in Project Settings for live data.
          </span>
        </div>
      ) : null}

      <div aria-live="polite" aria-busy={isLoading ? "true" : "false"} className="text-sm font-semibold text-muted-foreground">
        {statusText}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Card className="p-4 text-sm text-destructive">Something went wrong fetching jobs. Please try again.</Card>
      ) : (
        jobs.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border-2 border-dashed bg-card/70 px-6 py-12 text-center">
            <JobsIllustration className="w-48" />
            <p className="mt-4 font-display text-lg font-bold text-ink">No jobs match that search</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a broader keyword or a different city.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {jobs.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} />
            ))}
          </div>
        )
      )}
    </div>
  )
}
