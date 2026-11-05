"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Node = {
  nsqfLevel: number
  course: string
  jobRole: string
  qualification?: string
  alternatives?: {
    courses: string[]
    jobRoles: string[]
  }
  optionalCourses?: string[] // support AI response shape
}

export function NsqfRoadmap({ initialNodes, learner }: { initialNodes: Node[]; learner?: any }) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes || [])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [currentLevel, setCurrentLevel] = useState<number>(learner?.startLevel ?? nodes[0]?.nsqfLevel ?? 4)
  const [saving, setSaving] = useState(false)

  // Reset local state when the parent passes a new roadmap (e.g. the AI roadmap is regenerated).
  // Adjusting state during render avoids the extra render pass a syncing effect would cause.
  const startLevel = learner?.startLevel
  const [synced, setSynced] = useState({ initialNodes, startLevel })
  if (synced.initialNodes !== initialNodes || synced.startLevel !== startLevel) {
    setSynced({ initialNodes, startLevel })
    setNodes(initialNodes || [])
    setCurrentLevel(startLevel ?? initialNodes?.[0]?.nsqfLevel ?? 4)
  }

  const onDragStart = (index: number) => setDragIndex(index)
  const onDragOver = (e: React.DragEvent, overIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === overIndex) return
    const updated = [...nodes]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(overIndex, 0, moved)
    setNodes(updated)
    setDragIndex(overIndex)
  }
  const onDragEnd = () => setDragIndex(null)

  const handleCompleteCurrent = async () => {
    const idx = nodes.findIndex((n) => n.nsqfLevel === currentLevel)
    const next = nodes[Math.min(idx + 1, nodes.length - 1)]
    const nextLevel = next ? next.nsqfLevel : currentLevel
    setSaving(true)
    try {
      await fetch("/api/nsqf/level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: nextLevel }),
      })
      setCurrentLevel(nextLevel)
    } catch (e) {
      console.error("[v0] Failed to update NSQF level:", e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Start Level: L{currentLevel}</Badge>
        <Button size="sm" onClick={handleCompleteCurrent} disabled={saving} className="ml-auto">
          {saving ? "Updating..." : "Complete current course → advance"}
        </Button>
      </div>

      <div className="grid gap-3">
        {nodes.map((node, i) => {
          const active = node.nsqfLevel === currentLevel
          return (
            <div
              key={`${node.nsqfLevel}-${node.course}-${i}`}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={onDragEnd}
              className={cn(
                "rounded-lg border bg-background p-3 transition-colors",
                active ? "border-primary/60 bg-primary/5" : "hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="shrink-0">L{node.nsqfLevel}</Badge>
                  <div className="font-semibold">{node.course}</div>
                </div>
                <div className="text-sm text-muted-foreground">{node.jobRole}</div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Qualification: {node.qualification || "—"}</div>
              {node.alternatives && (node.alternatives.courses.length > 0 || node.alternatives.jobRoles.length > 0) && (
                <div className="mt-2 grid gap-1">
                  {node.alternatives.courses.length > 0 && (
                    <div className="text-xs">
                      Alternatives (Courses):{" "}
                      {node.alternatives.courses.map((c, idx) => (
                        <Badge key={idx} variant="outline" className="mr-1">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {node.alternatives.jobRoles.length > 0 && (
                    <div className="text-xs">
                      Alternatives (Jobs):{" "}
                      {node.alternatives.jobRoles.map((r, idx) => (
                        <Badge key={idx} variant="outline" className="mr-1">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {node.optionalCourses && node.optionalCourses.length > 0 && (
                <div className="mt-2 text-xs">
                  Optional Courses:{" "}
                  {node.optionalCourses.map((c, idx) => (
                    <Badge key={idx} variant="outline" className="mr-1">
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
              <Card className="mt-3">
                <CardContent className="p-3 text-xs text-muted-foreground">
                  Drag to reorder path. Completing current course updates your NSQF level and unlocks the next step.
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
