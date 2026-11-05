import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    const query = url.searchParams.get("query") || ""
    const maxResults = Number(url.searchParams.get("maxResults") || 6)

    if (!query.trim()) {
      return NextResponse.json({ videos: [] })
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      // No key configured: respond gracefully so UI can show an alert
      return NextResponse.json(
        { error: "YouTube API key not configured. Add YOUTUBE_API_KEY in Project Settings." },
        { status: 501 },
      )
    }

    const params = new URLSearchParams({
      key: apiKey,
      part: "snippet",
      q: query,
      type: "video",
      maxResults: String(Math.min(Math.max(maxResults, 1), 12)),
      safeSearch: "strict",
      videoEmbeddable: "true",
      relevanceLanguage: "en",
    })

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
      method: "GET",
      // No caching to keep results fresh
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `YouTube API error: ${text}` }, { status: 502 })
    }

    const data = await res.json()
    const videos = (data.items || []).map((item: any) => ({
      id: item.id?.videoId,
      title: item.snippet?.title,
      channelTitle: item.snippet?.channelTitle,
      publishedAt: item.snippet?.publishedAt,
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
      url: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : "#",
    }))

    return NextResponse.json({ videos })
  } catch (err) {
    console.error("YouTube search error:", err)
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 })
  }
}
