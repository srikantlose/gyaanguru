import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

// Queries come most specific first (see lib/video-query.ts). Each search costs YouTube quota, so stop at
// the first query that finds enough videos, and never run more than three.
const QuerySchema = z.object({
  q: z.array(z.string().trim().min(1).max(200)).min(1).max(3),
  maxResults: z.coerce.number().int().min(1).max(12).default(6),
})

type YouTubeItem = {
  id?: { videoId?: string }
  snippet?: { title?: string; channelTitle?: string; publishedAt?: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } } }
}

type Video = { id: string; title: string; channelTitle: string; publishedAt: string; thumbnail: string; url: string }

// The search API returns titles HTML-escaped ("Testing &amp; Deployment").
const decode = (s: string) =>
  s.replace(/&(amp|quot|#39|lt|gt);/g, (_, e: string) => ({ amp: "&", quot: '"', "#39": "'", lt: "<", gt: ">" })[e] ?? _)

const toVideo = (item: YouTubeItem): Video | null => {
  const id = item.id?.videoId
  if (!id) return null
  return {
    id,
    title: decode(item.snippet?.title ?? ""),
    channelTitle: decode(item.snippet?.channelTitle ?? ""),
    publishedAt: item.snippet?.publishedAt ?? "",
    thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
    url: `https://www.youtube.com/watch?v=${id}`,
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    // `query` is the old single-query parameter; `q` may repeat.
    const parsed = QuerySchema.safeParse({
      q: [...url.searchParams.getAll("q"), ...url.searchParams.getAll("query")].filter((s) => s.trim()),
      maxResults: url.searchParams.get("maxResults") ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ videos: [] })
    }
    const { q: queries, maxResults } = parsed.data

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      // No key configured: respond gracefully so UI can show an alert
      return NextResponse.json(
        { error: "YouTube API key not configured. Add YOUTUBE_API_KEY in Project Settings." },
        { status: 501 },
      )
    }

    const enough = Math.min(3, maxResults)
    const videos: Video[] = []
    for (const q of queries) {
      const params = new URLSearchParams({
        key: apiKey,
        part: "snippet",
        q,
        type: "video",
        maxResults: String(maxResults),
        safeSearch: "strict",
        relevanceLanguage: "en",
      })
      // Results for the same lesson rarely change, so cache them for a day to save quota.
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
        next: { revalidate: 60 * 60 * 24 },
      })
      if (!res.ok) {
        const text = await res.text()
        if (videos.length) break
        return NextResponse.json({ error: `YouTube API error: ${text}` }, { status: 502 })
      }
      const data = (await res.json()) as { items?: YouTubeItem[] }
      for (const item of data.items ?? []) {
        const v = toVideo(item)
        if (v && !videos.some((x) => x.id === v.id)) videos.push(v)
      }
      if (videos.length >= enough) break
    }

    return NextResponse.json({ videos: videos.slice(0, maxResults), query: queries[0] })
  } catch (err) {
    console.error("YouTube search error:", err)
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 })
  }
}
