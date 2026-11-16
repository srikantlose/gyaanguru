"use client"

import useSWR from "swr"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type VideoItem = {
  id: string
  title: string
  channelTitle: string
  publishedAt: string
  thumbnail: string
  url: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/** `queries`: short searches, most specific first (see lib/video-query.ts); the server stops at the first that finds enough. */
export function YouTubeLectures({ queries, maxResults = 6 }: { queries: string[]; maxResults?: number }) {
  const qs = queries.map((q) => q.trim()).filter(Boolean)
  const key = qs.length ? `/api/youtube?${qs.map((q) => `q=${encodeURIComponent(q)}`).join("&")}&maxResults=${maxResults}` : null
  const { data, error, isLoading } = useSWR(key, fetcher, { revalidateOnFocus: false })

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load videos</AlertTitle>
        <AlertDescription>Something went wrong while fetching video lectures.</AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: maxResults }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border">
            <div className="h-40 w-full rounded-t-lg bg-muted" />
            <div className="p-3">
              <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (data?.error) {
    return (
      <Alert>
        <AlertTitle>Video lectures unavailable</AlertTitle>
        <AlertDescription>{data.error}</AlertDescription>
      </Alert>
    )
  }

  const videos: VideoItem[] = data?.videos || []
  if (videos.length === 0) {
    return (
      <Alert>
        <AlertTitle>No videos found</AlertTitle>
        <AlertDescription>
          <span>
            Nothing matched this lesson closely enough.{" "}
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(qs[qs.length - 1] ?? "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline underline-offset-2"
            >
              Search YouTube yourself
            </a>
            .
          </span>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <a
          key={v.id}
          href={v.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "group overflow-hidden rounded-lg border transition-colors hover:bg-muted/50 focus:outline-none",
          )}
        >
          {/* Using img for simplicity in Next.js; alt text included for accessibility */}
          <img
            src={v.thumbnail || "/placeholder.svg"}
            alt={v.title}
            className="h-40 w-full object-cover"
            crossOrigin="anonymous"
          />
          <div className="p-3">
            <h4 className="line-clamp-2 text-sm font-semibold">{v.title}</h4>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{v.channelTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(v.publishedAt).toLocaleDateString()}</p>
          </div>
        </a>
      ))}
    </div>
  )
}
