"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NsqfRoadmap } from "@/components/nsqf-roadmap"
import { RoadmapVisualization } from "@/components/roadmap-visualization"

interface CourseRoadmapData {
  title: string
  description: string
  modules: Array<{
    id: string
    title: string
    notes?: string | string[]
    inDepthContent?: string | string[]
    topics: Array<{
      id: string
      title: string
      description: string
      estimatedHours: number
      notes?: string | string[]
      inDepthContent?: string | string[]
    }>
  }>
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function aiNsqfToCourse(ai: {
  title: string
  rationale: string
  nodes: Array<{ nsqfLevel: number; course: string; jobRole: string; optionalCourses?: string[] }>
}): CourseRoadmapData {
  return {
    title: ai.title || "NSQF AI Roadmap",
    description: ai.rationale || "Personalized NSQF-aligned learning plan.",
    modules: ai.nodes.map((node, idx) => {
      const baseTopic = {
        id: `nsqf-${idx + 1}-core`,
        title: `${node.course} – Core Outcomes`,
        description: `Develop skills for the role "${node.jobRole}" at NSQF Level ${node.nsqfLevel}.`,
        estimatedHours: 6,
      }
      const optionalTopics =
        (node.optionalCourses || []).slice(0, 4).map((c, cIdx) => ({
          id: `nsqf-${idx + 1}-opt-${cIdx + 1}`,
          title: `Optional: ${c}`,
          description: `Supplementary upskilling to strengthen readiness for ${node.jobRole}.`,
          estimatedHours: 3,
        })) || []

      return {
        id: `nsqf-${idx + 1}`,
        title: `NSQF Level ${node.nsqfLevel}: ${node.course}`,
        inDepthContent: [
          `Target Job Role: ${node.jobRole}`,
          `This step aligns with autonomy and responsibility at NSQF Level ${node.nsqfLevel}.`,
        ],
        topics: [baseTopic, ...optionalTopics],
      }
    }),
  }
}

export default function NsqfDemoPage() {
  const [education, setEducation] = useState("Class 12")
  const [skills, setSkills] = useState("Basic IT, Excel")
  const [goal, setGoal] = useState("Digital Marketing")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiRoadmap, setAiRoadmap] = useState<{
    title: string
    rationale: string
    nodes: Array<{ nsqfLevel: number; course: string; jobRole: string; optionalCourses?: string[] }>
  } | null>(null)

  const [showCourseView, setShowCourseView] = useState(false)
  const [courseRoadmap, setCourseRoadmap] = useState<CourseRoadmapData | null>(null)
  const [courseRoadmapId, setCourseRoadmapId] = useState<string | null>(null)

  const [savingCourse, setSavingCourse] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function generateWithAI() {
    setAiLoading(true)
    setAiError(null)
    setAiRoadmap(null)
    try {
      const res = await fetch("/api/nsqf/ai-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learnerProfile: {
            education,
            skills: skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            goal,
          },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to generate AI roadmap")
      }
      const json = await res.json()
      setAiRoadmap(json.roadmap)
    } catch (e: any) {
      setAiError(e?.message || "Failed to generate AI roadmap")
    } finally {
      setAiLoading(false)
    }
  }

  if (showCourseView && courseRoadmap && courseRoadmapId) {
    return (
      <RoadmapVisualization
        roadmap={courseRoadmap}
        roadmapId={courseRoadmapId}
        onReset={() => {
          setShowCourseView(false)
          setCourseRoadmap(null)
          setCourseRoadmapId(null)
        }}
      />
    )
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>NSQF Roadmap Generator (AI-Powered)</CardTitle>
          <CardDescription>
            Creates a dynamic 3-level learning path aligned to NSQF levels 3–6. Drag to reorder steps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="education">Education</Label>
              <Input id="education" value={education} onChange={(e) => setEducation(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal">Goal</Label>
              <Input id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={generateWithAI} disabled={aiLoading}>
              {aiLoading ? "Generating..." : "Generate with AI"}
            </Button>
            {aiError && <span className="text-sm text-red-500">{aiError}</span>}
          </div>

          {aiRoadmap && (
            <div className="mt-6 grid gap-3">
              <div>
                <div className="text-sm text-muted-foreground">AI Title</div>
                <div className="font-semibold">{aiRoadmap.title}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Rationale</div>
                <div className="text-sm leading-relaxed">{aiRoadmap.rationale}</div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  disabled={savingCourse}
                  onClick={async () => {
                    if (!aiRoadmap) return
                    setSaveError(null)
                    setSavingCourse(true)
                    try {
                      const cr = aiNsqfToCourse(aiRoadmap)
                      const nsqfLevel = Math.max(...aiRoadmap.nodes.map((n) => n.nsqfLevel))
                      const res = await fetch("/api/nsqf/save-roadmap", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          roadmap: cr,
                          meta: {
                            education,
                            skills: skills
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                            goal,
                          },
                          nsqfLevel,
                        }),
                      })
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}))
                        throw new Error(err?.error || "Failed to save course")
                      }
                      const json = await res.json()
                      setCourseRoadmap(cr)
                      setCourseRoadmapId(json.id)
                      setShowCourseView(true)
                    } catch (e: any) {
                      setSaveError(e?.message || "Failed to save course. Please log in and try again.")
                    } finally {
                      setSavingCourse(false)
                    }
                  }}
                >
                  {savingCourse ? "Saving..." : "View as Course"}
                </Button>
                {saveError && <span className="text-sm text-red-500">{saveError}</span>}
              </div>

              <NsqfRoadmap initialNodes={aiRoadmap.nodes} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
