"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Route, Target } from "lucide-react"
import { RoadmapVisualization } from "@/components/roadmap-visualization"
import { useRouter } from "next/navigation"

interface RoadmapData {
  title: string
  description: string
  modules: Array<{
    id: string
    title: string
    topics: Array<{
      id: string
      title: string
      description: string
      estimatedHours: number
    }>
  }>
}

export function RoadmapGenerator() {
  const [formData, setFormData] = useState({
    topic: "",
    experience: "",
    goal: "",
    hoursPerWeek: "",
    additionalInfo: "",
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [roadmapId, setRoadmapId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.status === 401) {
        router.push("/auth/login")
        return
      }

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.roadmap || !data.roadmapId) {
        throw new Error(data?.error || "Couldn't generate your roadmap. Please try again.")
      }
      setRoadmap(data.roadmap)
      setRoadmapId(data.roadmapId)
    } catch (error) {
      console.error("Error generating roadmap:", error)
      setError(error instanceof Error ? error.message : "Couldn't generate your roadmap. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  if (roadmap && roadmapId) {
    return (
      <RoadmapVisualization
        roadmap={roadmap}
        roadmapId={roadmapId}
        onReset={() => {
          setRoadmap(null)
          setRoadmapId(null)
        }}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral-soft text-coral-ink">
            <Target className="h-5 w-5" />
          </span>
          Tell Us About Your Learning Goals
        </CardTitle>
        <CardDescription>
          Provide details about what you want to learn and we&apos;ll create a personalized roadmap
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="topic">What do you want to learn?</Label>
            <Input
              id="topic"
              placeholder="e.g., Web Development, Machine Learning, Data Science"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="experience">Current Experience Level</Label>
            <Select
              value={formData.experience}
              onValueChange={(value) => setFormData({ ...formData, experience: value })}
              required
            >
              <SelectTrigger id="experience" className="w-full">
                <SelectValue placeholder="Select your experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner - Just starting out</SelectItem>
                <SelectItem value="intermediate">Intermediate - Some experience</SelectItem>
                <SelectItem value="advanced">Advanced - Experienced learner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">What is your goal?</Label>
            <Select value={formData.goal} onValueChange={(value) => setFormData({ ...formData, goal: value })} required>
              <SelectTrigger id="goal" className="w-full">
                <SelectValue placeholder="Select your learning goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="career-change">Career Change</SelectItem>
                <SelectItem value="skill-upgrade">Upgrade Current Skills</SelectItem>
                <SelectItem value="hobby">Personal Interest/Hobby</SelectItem>
                <SelectItem value="certification">Get Certified</SelectItem>
                <SelectItem value="project">Build a Specific Project</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Hours per week you can commit</Label>
            <Select
              value={formData.hoursPerWeek}
              onValueChange={(value) => setFormData({ ...formData, hoursPerWeek: value })}
              required
            >
              <SelectTrigger id="hours" className="w-full">
                <SelectValue placeholder="Select hours per week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-5">1-5 hours</SelectItem>
                <SelectItem value="5-10">5-10 hours</SelectItem>
                <SelectItem value="10-20">10-20 hours</SelectItem>
                <SelectItem value="20+">20+ hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional">Additional Information (Optional)</Label>
            <Textarea
              id="additional"
              placeholder="Any specific topics you want to focus on, technologies you want to learn, or constraints we should know about..."
              value={formData.additionalInfo}
              onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
              rows={4}
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl border-2 border-ink bg-coral-soft px-4 py-3 text-sm font-semibold text-coral-ink shadow-soft">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating Your Roadmap...
              </>
            ) : (
              <>
                <Route className="h-5 w-5" />
                Generate My Roadmap
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
