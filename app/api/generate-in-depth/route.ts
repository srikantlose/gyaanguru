import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ModelOutputError, generateJson } from "@/lib/gemini"

const ResponseSchema = z.object({
  content: z.array(z.string()).min(1),
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { roadmapTitle, moduleTitle, topicTitle, description } = await req.json()

    if (!topicTitle || !moduleTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const prompt = `
You are an expert instructor writing concise, high‑quality lesson notes.

Course: ${roadmapTitle || "N/A"}
Module: ${moduleTitle}
Lesson: ${topicTitle}
Lesson Overview: ${description || "N/A"}

Write in-depth lesson content that:
- Explains core concepts clearly and progressively
- Includes practical tips and mini-examples where useful
- Uses short paragraphs and clear language suitable for self-study
- Avoids markdown headings, code fences, and lists—just paragraphs

Return ONLY valid JSON in the form:
{
  "content": [
    "Paragraph 1...",
    "Paragraph 2...",
    "Paragraph 3..."
  ]
}
`.trim()

    let parsedJson: unknown
    try {
      parsedJson = await generateJson(prompt)
    } catch (e) {
      if (e instanceof ModelOutputError) {
        console.log("[v0] In-depth raw preview (first 400 chars):", e.raw.slice(0, 400))
        return NextResponse.json({ error: "Model returned non-JSON output" }, { status: 502 })
      }
      throw e
    }

    const validated = ResponseSchema.safeParse(parsedJson)
    if (!validated.success) {
      console.log("[v0] In-depth schema error:", validated.error?.message)
      return NextResponse.json({ error: "Model output did not match schema" }, { status: 422 })
    }

    return NextResponse.json(validated.data)
  } catch (err) {
    console.error("[v0] In-depth generation error:", err)
    return NextResponse.json({ error: "Failed to generate in-depth content" }, { status: 500 })
  }
}
