import { NextResponse } from "next/server"
import { z } from "zod"
import { dayKey } from "@/lib/learner"
import { buildPath } from "@/lib/nsqf-path"

// Public and rule-based: no AI, no database. Builds a path of real NSQF qualifications.
const InputSchema = z.object({
  education: z.string().max(200).optional().default(""),
  skills: z.union([z.string().max(500), z.array(z.string().max(100)).max(30)]).optional().default(""),
  goal: z.string().max(200).optional().default(""),
  track: z.string().max(40).optional().nullable(),
  level: z.coerce.number().int().min(1).max(8).optional().nullable(),
})

function respond(input: unknown) {
  const parsed = InputSchema.safeParse(input)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  return NextResponse.json(buildPath({ ...parsed.data, today: dayKey(new Date()) }))
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  return respond({
    education: url.searchParams.get("education") ?? undefined,
    // Accept both ?skills=a&skills=b and ?skills=a,b
    skills: url.searchParams.getAll("skills").flatMap((s) => s.split(",")),
    goal: url.searchParams.get("goal") ?? undefined,
    track: url.searchParams.get("track"),
    level: url.searchParams.get("level") || undefined,
  })
}

export async function POST(request: Request) {
  return respond(await request.json().catch(() => null))
}
