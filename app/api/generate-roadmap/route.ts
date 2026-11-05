import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { AI_BUSY_MESSAGE, AIUnavailableError, generateJson } from "@/lib/gemini"
import { clampNsqfLevel, getNsqfMapping } from "@/lib/nsqf"

// The dashboard, RoadmapVisualization and VisualRoadmap all read this shape from roadmaps.content.
const RoadmapSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().default(""),
    modules: z
      .array(
        z
          .object({
            id: z.string().min(1),
            title: z.string().min(1),
            topics: z
              .array(
                z
                  .object({
                    id: z.string().min(1),
                    title: z.string().min(1),
                    description: z.string().default(""),
                    estimatedHours: z.coerce.number().nonnegative().default(1),
                  })
                  .passthrough(),
              )
              .min(1),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough()

// Function to compute NSQF rating and description
function computeNsqf(params: { topic: string; experience: string; goal: string }) {
  const { topic, experience, goal } = params

  // Base level by experience (simple MVP mapping)
  let base = experience === "advanced" ? 6 : experience === "intermediate" ? 5 : 4 // beginner -> 4 (entry)
  // Adjust by goal
  if (goal === "certification") base += 1
  if (goal === "hobby") base -= 1
  const level = clampNsqfLevel(base)

  const description = `Assigned NSQF Level ${level} based on a ${experience} learner targeting ${goal} in ${topic}. This level indicates the expected complexity, autonomy, and responsibility for the learning outcomes in this roadmap.`

  return { level, description }
}

export async function POST(request: Request) {
  try {
    const { topic, experience, goal, hoursPerWeek, additionalInfo } = await request.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Generating roadmap for topic:", topic)
    const prompt = `You are an expert educational advisor. Create a detailed, personalized learning roadmap based on the following information:

Topic: ${topic}
Experience Level: ${experience}
Goal: ${goal}
Available Time: ${hoursPerWeek} hours per week
Additional Info: ${additionalInfo || "None"}

Generate a comprehensive learning roadmap in JSON format with the following structure:
{
  "title": "A descriptive title for the roadmap",
  "description": "A brief overview of what the learner will achieve",
  "modules": [
    {
      "id": "module-1",
      "title": "Module title",
      "topics": [
        {
          "id": "topic-1",
          "title": "Topic title",
          "description": "What the learner will learn in this topic",
          "estimatedHours": 5
        }
      ]
    }
  ]
}

Guidelines:
- Create 4-6 modules that progress from fundamentals to advanced concepts
- Each module should have 3-5 topics
- Adjust complexity based on experience level (${experience})
- Tailor content to the goal (${goal})
- Estimate realistic hours based on available time (${hoursPerWeek})
- Make it specific to ${topic}
- Include practical, actionable topics
- Ensure logical progression of concepts

Return ONLY valid JSON, no additional text.`

    const parsed = RoadmapSchema.safeParse(await generateJson(prompt))
    if (!parsed.success) {
      console.error("[v0] Roadmap output did not match schema:", parsed.error.message)
      return NextResponse.json({ error: "Failed to generate roadmap" }, { status: 502 })
    }
    const roadmapData = parsed.data

    // Compute NSQF rating and description for this roadmap
    const nsqf = computeNsqf({ topic, experience, goal })
    const mapping = getNsqfMapping(nsqf.level)
    const contentWithNsqf = {
      ...roadmapData,
      nsqf: {
        level: nsqf.level,
        description: nsqf.description,
        mapping,
      },
    }

    const { data: savedRoadmap, error: saveError } = await supabase
      .from("roadmaps")
      .insert({
        user_id: user.id,
        title: roadmapData.title,
        topic,
        experience_level: experience,
        goal,
        time_commitment: hoursPerWeek,
        additional_info: additionalInfo,
        content: contentWithNsqf, // enriched content
        // Persist NSQF rating
        nsqf_level: nsqf.level,
        nsqf_description: nsqf.description,
      })
      .select()
      .single()

    if (saveError) {
      console.error("[v0] Error saving roadmap:", saveError)
      return NextResponse.json({ error: "Failed to save roadmap" }, { status: 500 })
    }

    console.log("[v0] Successfully generated and saved roadmap")
    return NextResponse.json({ roadmap: roadmapData, roadmapId: savedRoadmap.id })
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 503 })
    }
    console.error("Error generating roadmap:", error)
    return NextResponse.json({ error: "Failed to generate roadmap" }, { status: 500 })
  }
}
