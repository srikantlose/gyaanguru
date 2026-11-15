import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { AI_BUSY_MESSAGE, AIUnavailableError, ModelOutputError, generateJson } from "@/lib/gemini"
import { dayKey } from "@/lib/learner"
import { clampNsqfLevel, describeNsqfLevel } from "@/lib/nsqf"
import { coreUnits, formatLevel, getQualification, isCurrent, levelBand, toRef, type Qualification } from "@/lib/qualifications"

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

const BodySchema = z.object({
  topic: z.string().trim().min(1).max(200),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  goal: z.enum(["career-change", "skill-upgrade", "hobby", "certification", "project"]),
  hoursPerWeek: z.enum(["1-5", "5-10", "10-20", "20+"]),
  additionalInfo: z.string().max(2000).optional().default(""),
  qualificationId: z.string().max(40).optional().nullable(),
})

// A rough level for a free-topic roadmap. Stored and shown as an estimate, never as a fact.
function estimateNsqf({ topic, experience, goal }: { topic: string; experience: string; goal: string }) {
  let base = experience === "advanced" ? 6 : experience === "intermediate" ? 5 : 4
  if (goal === "certification") base += 1
  if (goal === "hobby") base -= 1
  const level = clampNsqfLevel(base)
  const description = `Estimated NSQF level ${level}, from a ${experience} learner aiming for ${goal.replace("-", " ")} in ${topic}. This roadmap isn't linked to an official qualification.`
  return { level, description }
}

const JSON_SHAPE = `{
  "title": "A descriptive title for the roadmap",
  "description": "A brief overview of what the learner will achieve",
  "modules": [
    {
      "id": "module-1",
      "title": "Module title",
      "topics": [
        { "id": "topic-1", "title": "Topic title", "description": "What the learner will learn in this topic", "estimatedHours": 5 }
      ]
    }
  ]
}`

function freePrompt(b: z.infer<typeof BodySchema>) {
  return `You are an expert educational advisor. Create a detailed, personalized learning roadmap based on the following information:

Topic: ${b.topic}
Experience Level: ${b.experience}
Goal: ${b.goal}
Available Time: ${b.hoursPerWeek} hours per week
Additional Info: ${b.additionalInfo || "None"}

Generate a comprehensive learning roadmap in JSON format with the following structure:
${JSON_SHAPE}

Guidelines:
- Create 4-6 modules that progress from fundamentals to advanced concepts
- Each module should have 3-5 topics
- Adjust complexity based on experience level (${b.experience})
- Tailor content to the goal (${b.goal})
- Estimate realistic hours based on available time (${b.hoursPerWeek})
- Make it specific to ${b.topic}
- Include practical, actionable topics
- Ensure logical progression of concepts

Return ONLY valid JSON, no additional text.`
}

function qualificationPrompt(b: z.infer<typeof BodySchema>, q: Qualification) {
  const units = coreUnits(q)
  const perModule = units.length > 6 ? "2-3" : "2-4"
  return `You are an expert educational advisor. Create a learning roadmap that prepares the learner for the official Indian NSQF qualification below. It is a real qualification from the National Qualifications Register; the learner will later take its official assessment.

Qualification: "${q.title}" (NSQF level ${formatLevel(q.level)}, NQR code ${q.code}, awarded by ${q.awardingBody})
${describeNsqfLevel(q.level)}

Its units (National Occupational Standards), in order:
${units.map((u, i) => `${i + 1}. ${u.code}: ${u.title}${u.mandatory ? "" : " (optional unit)"}`).join("\n")}

About the learner:
Topic they asked for: ${b.topic}
Experience level: ${b.experience}
Goal: ${b.goal}
Available time: ${b.hoursPerWeek} hours per week
Additional info: ${b.additionalInfo || "None"}

Generate the roadmap in JSON format with this structure:
${JSON_SHAPE}

Rules:
- Exactly ${units.length} modules: module N covers unit N above, in the same order. Title each module after what its unit teaches.
- Each module has ${perModule} topics that build the skills and knowledge that unit assesses, pitched at NSQF level ${formatLevel(q.level)}.
- Use the learner's topic and experience to choose examples and tools, but stay within the units.
- Estimate realistic hours per topic for ${b.hoursPerWeek} hours a week.

Return ONLY valid JSON, no additional text.`
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = BodySchema.safeParse(await request.json().catch(() => null))
    if (!body.success) {
      return NextResponse.json({ error: "Please fill in the topic and pick an option for each question." }, { status: 400 })
    }
    const b = body.data

    let qualification: Qualification | null = null
    if (b.qualificationId) {
      qualification = getQualification(b.qualificationId)
      if (!qualification || !isCurrent(qualification, dayKey(new Date()))) {
        return NextResponse.json({ error: "That qualification isn't available any more. Pick another one." }, { status: 400 })
      }
    }

    console.log("[v0] Generating roadmap for topic:", b.topic, qualification ? `(qualification ${qualification.id})` : "")
    const parsed = RoadmapSchema.safeParse(await generateJson(qualification ? qualificationPrompt(b, qualification) : freePrompt(b)))
    if (!parsed.success) {
      console.error("[v0] Roadmap output did not match schema:", parsed.error.message)
      return NextResponse.json({ error: "Failed to generate roadmap. Please try again." }, { status: 502 })
    }
    const roadmapData = parsed.data

    let content: Record<string, unknown>
    let nsqfLevel: number
    let nsqfDescription: string
    if (qualification) {
      const units = coreUnits(qualification)
      if (roadmapData.modules.length !== units.length) {
        console.error(`[v0] Roadmap had ${roadmapData.modules.length} modules for ${units.length} units`)
        return NextResponse.json({ error: "The AI's roadmap didn't cover every unit of the qualification. Please try again." }, { status: 502 })
      }
      nsqfLevel = levelBand(qualification.level)
      nsqfDescription = `Built on the ${units.length} units of "${qualification.title}" (NSQF level ${formatLevel(qualification.level)}, NQR code ${qualification.code}), awarded by ${qualification.awardingBody}.`
      content = {
        ...roadmapData,
        // The unit codes come from the catalogue, not from the model.
        modules: roadmapData.modules.map((m, i) => ({ ...m, unit: units[i].code })),
        qualification: toRef(qualification),
        nsqf: { level: nsqfLevel, description: nsqfDescription, source: "qualification" },
      }
    } else {
      const estimate = estimateNsqf(b)
      nsqfLevel = estimate.level
      nsqfDescription = estimate.description
      content = { ...roadmapData, nsqf: { level: nsqfLevel, description: nsqfDescription, source: "estimate" } }
    }

    const { data: savedRoadmap, error: saveError } = await supabase
      .from("roadmaps")
      .insert({
        user_id: user.id,
        title: roadmapData.title,
        topic: b.topic,
        experience_level: b.experience,
        goal: b.goal,
        time_commitment: b.hoursPerWeek,
        additional_info: b.additionalInfo,
        content,
        nsqf_level: nsqfLevel,
        nsqf_description: nsqfDescription,
      })
      .select("id")
      .single()

    if (saveError) {
      console.error("[v0] Error saving roadmap:", saveError)
      return NextResponse.json({ error: "Failed to save roadmap" }, { status: 500 })
    }

    return NextResponse.json({ roadmap: content, roadmapId: savedRoadmap.id })
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 503 })
    }
    if (error instanceof ModelOutputError) {
      return NextResponse.json({ error: "Failed to generate roadmap. Please try again." }, { status: 502 })
    }
    console.error("Error generating roadmap:", error)
    return NextResponse.json({ error: "Failed to generate roadmap" }, { status: 500 })
  }
}
