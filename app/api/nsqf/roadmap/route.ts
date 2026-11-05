import { NextResponse } from "next/server"
import { buildRoadmap, type LearnerInput } from "@/lib/nsqf-path"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const education = url.searchParams.get("education") || ""
    // Accept both ?skills=a&skills=b and ?skills=a,b
    const skills = url.searchParams.getAll("skills").flatMap((s) => s.split(","))
    const goal = url.searchParams.get("goal") || ""
    const data = await buildRoadmap({ education, skills, goal })
    return NextResponse.json(data)
  } catch (e) {
    console.error("[v0] NSQF GET failed:", e)
    return NextResponse.json({ error: "Failed to generate NSQF roadmap" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { education, skills, goal } = (await request.json()) as LearnerInput
    const data = await buildRoadmap({ education, skills, goal })
    return NextResponse.json(data)
  } catch (e) {
    console.error("[v0] NSQF POST failed:", e)
    return NextResponse.json({ error: "Failed to generate NSQF roadmap" }, { status: 500 })
  }
}
