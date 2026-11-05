"use client"

import { useMemo } from "react"
import {
  ReactFlow,
  type Node,
  type Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle2, Circle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

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

interface VisualRoadmapProps {
  roadmap: RoadmapData
  completedTopics: Set<string>
  onBack: () => void
  onTopicSelect: (moduleIndex: number, topicIndex: number) => void
}

// Custom node component
function TopicNode({ data }: { data: any }) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-background p-4 shadow-lg transition-all hover:shadow-xl min-w-[200px] max-w-[250px]",
        data.completed && "border-green-500 bg-green-50 dark:bg-green-950",
        !data.completed && data.isModule && "border-primary bg-primary/5",
        !data.completed && !data.isModule && "border-muted-foreground/30",
      )}
      onClick={data.onClick}
      style={{ cursor: data.isModule ? "default" : "pointer" }}
    >
      {/* Custom nodes need handles for edges to attach; hidden because the map is read-only. */}
      <Handle type="target" id="left" position={Position.Left} isConnectable={false} className="!opacity-0" />
      <Handle type="target" id="top" position={Position.Top} isConnectable={false} className="!opacity-0" />
      <Handle type="source" id="right" position={Position.Right} isConnectable={false} className="!opacity-0" />
      <Handle type="source" id="bottom" position={Position.Bottom} isConnectable={false} className="!opacity-0" />
      <div className="flex items-start gap-3">
        {!data.isModule && (
          <div className="mt-0.5 shrink-0">
            {data.completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {data.isModule && (
            <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {data.moduleNumber}
            </div>
          )}
          <div className={cn("font-semibold leading-tight", data.isModule && "text-lg")}>{data.label}</div>
          {!data.isModule && data.estimatedHours && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{data.estimatedHours}h</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const nodeTypes = {
  topic: TopicNode,
}

export function VisualRoadmap({ roadmap, completedTopics, onBack, onTopicSelect }: VisualRoadmapProps) {
  // Generate nodes and edges from roadmap data
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    let yOffset = 0
    const moduleSpacing = 400
    const topicSpacing = 150
    const horizontalSpacing = 350

    roadmap.modules.forEach((module, moduleIndex) => {
      // Add module node
      const moduleNodeId = `module-${moduleIndex}`
      nodes.push({
        id: moduleNodeId,
        type: "topic",
        position: { x: 100, y: yOffset },
        data: {
          label: module.title,
          isModule: true,
          moduleNumber: moduleIndex + 1,
        },
      })

      // Add topic nodes for this module
      module.topics.forEach((topic, topicIndex) => {
        const topicNodeId = `topic-${moduleIndex}-${topicIndex}`
        const isCompleted = completedTopics.has(topic.id)

        nodes.push({
          id: topicNodeId,
          type: "topic",
          position: {
            x: 100 + horizontalSpacing,
            y: yOffset + topicIndex * topicSpacing,
          },
          data: {
            label: topic.title,
            completed: isCompleted,
            estimatedHours: topic.estimatedHours,
            isModule: false,
            onClick: () => onTopicSelect(moduleIndex, topicIndex),
          },
        })

        // Connect module to topic
        edges.push({
          id: `edge-${moduleNodeId}-${topicNodeId}`,
          source: moduleNodeId,
          sourceHandle: "right",
          target: topicNodeId,
          targetHandle: "left",
          type: "smoothstep",
          animated: !isCompleted,
          style: {
            stroke: isCompleted ? "#22c55e" : "#94a3b8",
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isCompleted ? "#22c55e" : "#94a3b8",
          },
        })

        // Connect topics within the same module
        if (topicIndex > 0) {
          const prevTopicNodeId = `topic-${moduleIndex}-${topicIndex - 1}`
          edges.push({
            id: `edge-${prevTopicNodeId}-${topicNodeId}`,
            source: prevTopicNodeId,
            sourceHandle: "bottom",
            target: topicNodeId,
            targetHandle: "top",
            type: "smoothstep",
            animated: !isCompleted,
            style: {
              stroke: isCompleted ? "#22c55e" : "#e2e8f0",
              strokeWidth: 1,
              strokeDasharray: "5,5",
            },
          })
        }
      })

      // Connect to next module
      if (moduleIndex < roadmap.modules.length - 1) {
        const nextModuleNodeId = `module-${moduleIndex + 1}`
        const lastTopicNodeId = `topic-${moduleIndex}-${module.topics.length - 1}`

        edges.push({
          id: `edge-${lastTopicNodeId}-${nextModuleNodeId}`,
          source: lastTopicNodeId,
          sourceHandle: "bottom",
          target: nextModuleNodeId,
          targetHandle: "top",
          type: "smoothstep",
          animated: true,
          style: {
            stroke: "#6366f1",
            strokeWidth: 3,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#6366f1",
          },
        })
      }

      yOffset += Math.max(module.topics.length * topicSpacing, moduleSpacing)
    })

    return { initialNodes: nodes, initialEdges: edges }
  }, [roadmap, completedTopics, onTopicSelect])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const totalTopics = roadmap.modules.reduce((acc, module) => acc + module.topics.length, 0)
  const completedCount = completedTopics.size
  const progress = Math.round((completedCount / totalTopics) * 100)

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List View
          </Button>
          <div>
            <h2 className="font-serif text-xl font-bold">{roadmap.title}</h2>
            <p className="text-sm text-muted-foreground">Visual Roadmap</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold">{progress}%</div>
            <div className="text-xs text-muted-foreground">
              {completedCount} / {totalTopics} completed
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.data.isModule) return "#6366f1"
              return node.data.completed ? "#22c55e" : "#94a3b8"
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      <div className="border-t bg-muted/30 px-6 py-3">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-muted-foreground"></div>
            <span>Not Started</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary"></div>
            <span>Module</span>
          </div>
        </div>
      </div>
    </div>
  )
}
