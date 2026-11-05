"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { GripVertical } from "lucide-react"

const LEVEL_TONE: Record<number, { soft: string; solid: string }> = {
  3: { soft: "bg-brand-soft", solid: "bg-brand text-ink border-2 border-ink" },
  4: { soft: "bg-marigold-soft", solid: "bg-marigold text-ink border-2 border-ink" },
  5: { soft: "bg-coral-soft", solid: "bg-coral text-ink border-2 border-ink" },
  6: { soft: "bg-lagoon-soft", solid: "bg-lagoon text-ink border-2 border-ink" },
}

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
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border-2 border-ink bg-marigold px-3 py-0.5 text-sm font-bold text-ink shadow-soft">
          Start Level: L{currentLevel}
        </span>
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <GripVertical className="h-3.5 w-3.5" /> Drag steps to reorder
        </span>
        <Button size="sm" onClick={handleCompleteCurrent} disabled={saving} className="ml-auto">
          {saving ? "Updating..." : "Complete current course → advance"}
        </Button>
      </div>

      <ol className="relative grid gap-3">
        {nodes.map((node, i) => {
          const active = node.nsqfLevel === currentLevel
          const tone = LEVEL_TONE[node.nsqfLevel] ?? LEVEL_TONE[3]
          return (
            <li
              key={`${node.nsqfLevel}-${node.course}-${i}`}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={onDragEnd}
              className={cn(
                "group flex cursor-grab gap-3 rounded-2xl border-2 border-ink p-4 transition-all active:cursor-grabbing",
                tone.soft,
                active ? "-translate-y-0.5 shadow-lift" : "shadow-soft hover:-translate-y-0.5 hover:shadow-brut",
                dragIndex === i && "opacity-60",
              )}
            >
              <GripVertical className="mt-1 h-5 w-5 shrink-0 text-ink/30 transition-colors group-hover:text-ink/60" aria-hidden />
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink font-display text-base font-black",
                  tone.solid,
                )}
              >
                L{node.nsqfLevel}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div className="font-display text-base font-bold text-ink">
                    {node.course}
                    {active && (
                      <span className="ml-2 rounded-full border-2 border-ink bg-marigold px-2 py-0.5 align-middle text-[11px] font-black text-ink">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-ink/70">{node.jobRole}</div>
                </div>
                {node.qualification && <div className="mt-1 text-xs text-ink/60">Qualification: {node.qualification}</div>}
                {(() => {
                  const extras = [
                    ...(node.optionalCourses ?? []),
                    ...(node.alternatives?.courses ?? []),
                    ...(node.alternatives?.jobRoles ?? []),
                  ]
                  return extras.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {extras.map((c, idx) => (
                        <span key={idx} className="rounded-full bg-card/80 px-2.5 py-0.5 text-xs font-medium text-ink/80">
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : null
                })()}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
