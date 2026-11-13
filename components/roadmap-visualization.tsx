"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import useSWR from "swr" // new import for SWR
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  MessageSquare,
  X,
  Send,
  BookOpen,
  Network,
  PartyPopper,
  Star,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { VisualRoadmap } from "./visual-roadmap"
import { YouTubeLectures } from "./youtube-lectures" // new component for videos
import { RichText } from "@/components/rich-text"

interface RoadmapData {
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

interface RoadmapVisualizationProps {
  roadmap: RoadmapData
  roadmapId: string
  onReset?: () => void // Made onReset optional since it's not always needed
}

interface Message {
  role: "user" | "assistant"
  content: string
}

export function RoadmapVisualization({ roadmap, roadmapId, onReset }: RoadmapVisualizationProps) {
  const [completedTopics, setCompletedTopics] = useState<Set<string>>(new Set())
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set([roadmap.modules[0]?.id]))
  const [selectedTopic, setSelectedTopic] = useState<{ moduleIndex: number; topicIndex: number } | null>(null)
  const [showAIChat, setShowAIChat] = useState(false)
  const [isLoadingProgress, setIsLoadingProgress] = useState(true)
  const [showVisualRoadmap, setShowVisualRoadmap] = useState(false)
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizData, setQuizData] = useState<any>(null)
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  // Points feedback: a "+5" pop per new lesson, a card when the roadmap bonus is paid, and save errors.
  const [pointsPop, setPointsPop] = useState<{ id: number; amount: number } | null>(null)
  const [roadmapBonus, setRoadmapBonus] = useState<number | null>(null)
  const [progressError, setProgressError] = useState<string | null>(null)
  const popCounter = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    // Scroll only the message list; scrollIntoView would also scroll the page on load.
    const box = messagesEndRef.current?.closest(".overflow-y-auto")
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const loadProgress = async () => {
      setIsLoadingProgress(true)
      try {
        const response = await fetch(`/api/progress?roadmapId=${roadmapId}`)
        if (response.ok) {
          const { progress } = await response.json()
          const completed = new Set<string>()

          progress.forEach((item: { module_index: number; topic_index: number }) => {
            const topicId = roadmap.modules[item.module_index]?.topics[item.topic_index]?.id
            if (topicId) {
              completed.add(topicId)
            }
          })

          setCompletedTopics(completed)

          if (progress.length > 0 && progress.length < roadmap.modules.reduce((acc, m) => acc + m.topics.length, 0)) {
            let foundIncomplete = false
            for (let moduleIndex = 0; moduleIndex < roadmap.modules.length; moduleIndex++) {
              const mod = roadmap.modules[moduleIndex]
              for (let topicIndex = 0; topicIndex < mod.topics.length; topicIndex++) {
                const topic = mod.topics[topicIndex]
                if (!completed.has(topic.id)) {
                  setSelectedTopic({ moduleIndex, topicIndex })
                  setExpandedModules(new Set([mod.id]))
                  foundIncomplete = true
                  break
                }
              }
              if (foundIncomplete) break
            }
          }
        }
      } catch (error) {
        console.error("Error loading progress:", error)
      } finally {
        setIsLoadingProgress(false)
      }
    }

    loadProgress()
  }, [roadmapId, roadmap.modules])

  const toggleTopic = async (topicId: string, moduleIndex: number, topicIndex: number) => {
    const isCurrentlyCompleted = completedTopics.has(topicId)
    const flip = (done: boolean) =>
      setCompletedTopics((prev) => {
        const next = new Set(prev)
        if (done) next.add(topicId)
        else next.delete(topicId)
        return next
      })

    // Optimistic tick, rolled back if the save fails.
    flip(!isCurrentlyCompleted)
    setProgressError(null)

    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadmapId,
          moduleIndex,
          topicIndex,
          completed: !isCurrentlyCompleted,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Couldn't save your progress.")

      const earned = Number(data?.awarded?.topic) || 0
      const bonus = Number(data?.awarded?.bonus) || 0
      if (earned > 0) {
        const id = ++popCounter.current
        setPointsPop({ id, amount: earned })
        setTimeout(() => setPointsPop((p) => (p?.id === id ? null : p)), 2200)
      }
      if (bonus > 0) setRoadmapBonus(bonus)
    } catch (error) {
      console.error("Error saving progress:", error)
      flip(isCurrentlyCompleted)
      setProgressError(error instanceof Error ? error.message : "Couldn't save your progress.")
    }
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId)
      } else {
        newSet.add(moduleId)
      }
      return newSet
    })
  }

  const totalTopics = roadmap.modules.reduce((acc, module) => acc + module.topics.length, 0)
  const completedCount = completedTopics.size
  const progress = Math.round((completedCount / totalTopics) * 100)

  const handleBack = () => {
    if (onReset) {
      onReset()
    } else {
      router.push("/dashboard")
    }
  }

  const currentTopic = selectedTopic
    ? roadmap.modules[selectedTopic.moduleIndex]?.topics[selectedTopic.topicIndex]
    : null

  // Fetch AI in-depth content for the selected topic via SWR (cached per topic)
  const {
    data: inDepthData,
    error: inDepthError,
    isLoading: isLoadingInDepth,
    mutate: retryInDepth,
  } = useSWR(
    selectedTopic ? ["in-depth", roadmapId, selectedTopic.moduleIndex, selectedTopic.topicIndex] : null,
    async ([, _rid, mIdx, tIdx]) => {
      const mod = roadmap.modules[mIdx as number]
      const topic = mod.topics[tIdx as number]
      const res = await fetch("/api/generate-in-depth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadmapTitle: roadmap.title,
          moduleTitle: mod.title,
          topicTitle: topic.title,
          description: topic.description,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to generate in-depth content")
      }
      return res.json() as Promise<{ content: string[] }>
    },
    { revalidateOnFocus: false },
  )

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentTopic) return

    const userMessage = inputMessage.trim()
    setInputMessage("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsLoadingAI(true)

    try {
      const response = await fetch("/api/ai-instructor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          topic: currentTopic.title,
          context: currentTopic.description,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to get AI response")
      }

      const data = await response.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }])
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error && error.message !== "Failed to get AI response"
              ? error.message
              : "Sorry, I encountered an error. Please try again.",
        },
      ])
    } finally {
      setIsLoadingAI(false)
    }
  }

  const handleSuggestedQuestion = async (question: string) => {
    setMessages((prev) => [...prev, { role: "user", content: question }])
    setIsLoadingAI(true)

    try {
      const response = await fetch("/api/ai-instructor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          topic: currentTopic?.title,
          context: currentTopic?.description,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to get AI response")
      }

      const data = await response.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }])
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error && error.message !== "Failed to get AI response"
              ? error.message
              : "Sorry, I encountered an error. Please try again.",
        },
      ])
    } finally {
      setIsLoadingAI(false)
    }
  }

  const handleGenerateQuiz = async () => {
    if (!currentTopic) return

    setIsLoadingQuiz(true)
    setShowQuiz(true)
    setQuizError(null)

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: currentTopic.title,
          description: currentTopic.description,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to generate quiz")
      }

      const data = await response.json()
      setQuizData(data.quiz)
      setSelectedAnswers({})
      setQuizSubmitted(false)
    } catch (error) {
      console.error("Error generating quiz:", error)
      setQuizError(error instanceof Error ? error.message : "Failed to generate quiz")
    } finally {
      setIsLoadingQuiz(false)
    }
  }

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    if (!quizSubmitted) {
      setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: answerIndex }))
    }
  }

  const handleSubmitQuiz = () => {
    setQuizSubmitted(true)
  }

  const allQuestionsAnswered =
    quizData?.questions?.length > 0 && Object.keys(selectedAnswers).length === quizData.questions.length

  if (showVisualRoadmap) {
    return (
      <VisualRoadmap
        roadmap={roadmap}
        completedTopics={completedTopics}
        onBack={() => setShowVisualRoadmap(false)}
        onTopicSelect={(moduleIndex, topicIndex) => {
          setSelectedTopic({ moduleIndex, topicIndex })
          setShowVisualRoadmap(false)
        }}
      />
    )
  }

  if (isLoadingProgress) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-lg border bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-brut lg:h-[calc(100vh-8rem)] lg:flex-row">
      <div className="flex max-h-80 w-full flex-col border-b bg-muted/30 lg:max-h-none lg:w-80 lg:border-b-0 lg:border-r">
        <div className="border-b bg-background p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mb-3 -ml-2 hover:bg-brand-soft"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Outline
          </Button>
          <h2 className="mb-1 font-serif text-xl font-bold leading-tight">{roadmap.title}</h2>
          <p className="text-sm text-muted-foreground">
            {roadmap.modules.length} modules • {totalTopics} lessons
          </p>
        </div>

        <div className="flex items-center gap-2 border-b bg-background px-4 py-3">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs font-semibold bg-brand-soft text-brand-ink"
          >
            {progress}% Completed
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVisualRoadmap(true)}
            className="ml-auto hover:bg-brand-soft"
          >
            <Network className="mr-2 h-4 w-4" />
            Visual Map
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {roadmap.modules.map((module, moduleIndex) => {
            const isExpanded = expandedModules.has(module.id)
            const moduleCompleted = module.topics.every((topic) => completedTopics.has(topic.id))
            const moduleProgress = module.topics.filter((topic) => completedTopics.has(topic.id)).length

            return (
              <div key={module.id} className="border-b">
                <button
                  onClick={() => toggleModule(module.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-soft/50"
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      moduleCompleted
                        ? "bg-primary text-primary-foreground"
                        : moduleProgress > 0
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {moduleIndex + 1}
                  </div>
                  <span className="flex-1 font-semibold">{module.title}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="bg-background/50">
                    {module.topics.map((topic, topicIndex) => {
                      const isCompleted = completedTopics.has(topic.id)
                      const isSelected =
                        selectedTopic?.moduleIndex === moduleIndex && selectedTopic?.topicIndex === topicIndex

                      return (
                        <button
                          key={topic.id}
                          onClick={() => setSelectedTopic({ moduleIndex, topicIndex })}
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-3 pl-14 text-left transition-colors hover:bg-brand-soft/50",
                            isSelected && "bg-brand-soft",
                          )}
                        >
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <span className={cn("text-sm", isCompleted && "text-muted-foreground")}>{topic.title}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex min-h-[70vh] flex-1 flex-col overflow-hidden lg:min-h-0">
        {selectedTopic && currentTopic ? (
          <>
            <div className="flex items-center justify-between border-b bg-background px-6 py-4">
              <h1 className="font-serif text-2xl font-bold">{currentTopic.title}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm border-brand/50 text-brand-ink">
                  {currentTopic.estimatedHours}h estimated
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAIChat(!showAIChat)}
                  className="hover:bg-brand-soft"
                  aria-label="Ask the AI Instructor"
                  title="Ask the AI Instructor"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-3 text-lg font-semibold">About this lesson</h3>
                  <p className="leading-relaxed text-muted-foreground">{currentTopic.description}</p>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-lg font-semibold">Learning Objectives</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>Understand the core concepts of {currentTopic.title}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>Apply practical skills through hands-on exercises</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>Build confidence in implementing solutions</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">In-Depth Content</h3>
                  </div>

                  {(() => {
                    const mod = roadmap.modules[selectedTopic!.moduleIndex]
                    const topic = currentTopic as any

                    const normalizeToArray = (val: unknown): string[] => {
                      if (!val) return []
                      if (Array.isArray(val)) return (val as string[]).filter(Boolean)
                      if (typeof val === "string")
                        return val
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      return []
                    }

                    const moduleNotes =
                      normalizeToArray((mod as any)?.inDepthContent).length > 0
                        ? normalizeToArray((mod as any)?.inDepthContent)
                        : normalizeToArray((mod as any)?.notes)

                    const topicNotes =
                      normalizeToArray(topic?.inDepthContent).length > 0
                        ? normalizeToArray(topic?.inDepthContent)
                        : normalizeToArray(topic?.notes)

                    const aiBlocks = Array.isArray(inDepthData?.content) ? inDepthData!.content : []
                    const hasAI = aiBlocks.length > 0
                    const fallbackBlocks =
                      moduleNotes.length > 0
                        ? moduleNotes
                        : topicNotes.length > 0
                          ? topicNotes
                          : normalizeToArray(currentTopic.description)

                    const contentBlocks = hasAI ? aiBlocks : fallbackBlocks

                    if (isLoadingInDepth) {
                      return (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">Generating in-depth content...</p>
                          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                        </div>
                      )
                    }

                    return (
                      <div className="prose prose-sm max-w-none">
                        {inDepthError && (
                          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border-2 border-ink bg-marigold-soft px-3 py-2 text-sm text-ink">
                            <span>{inDepthError.message || "Couldn't load AI notes."} Showing the lesson summary for now.</span>
                            <button type="button" onClick={() => retryInDepth()} className="font-bold underline underline-offset-4">
                              Try again
                            </button>
                          </div>
                        )}
                        {contentBlocks.length > 0 ? (
                          <div className="space-y-3">
                            {contentBlocks.map((block, idx) => (
                              <p key={idx} className="leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                {block}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="leading-relaxed text-muted-foreground">
                            No detailed notes available yet for this lesson.
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-lg font-semibold">Video Lectures</h3>
                  <YouTubeLectures
                    query={`${roadmap.title} ${roadmap.modules[selectedTopic.moduleIndex].title} ${currentTopic.title} tutorial`}
                    maxResults={6}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="mb-2 text-lg font-semibold">Test Your Knowledge</h3>
                      <p className="text-sm text-muted-foreground">
                        Take a quiz to reinforce what you&apos;ve learned in this lesson
                      </p>
                    </div>
                    <Button onClick={handleGenerateQuiz} disabled={isLoadingQuiz}>
                      {isLoadingQuiz ? "Generating..." : "Take a Quiz"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-background px-4 py-4 sm:px-6">
              <Button
                variant="outline"
                className="hover:bg-brand-soft bg-transparent"
                onClick={() => {
                  if (selectedTopic.topicIndex > 0) {
                    setSelectedTopic({ ...selectedTopic, topicIndex: selectedTopic.topicIndex - 1 })
                  } else if (selectedTopic.moduleIndex > 0) {
                    const prevModule = roadmap.modules[selectedTopic.moduleIndex - 1]
                    setSelectedTopic({
                      moduleIndex: selectedTopic.moduleIndex - 1,
                      topicIndex: prevModule.topics.length - 1,
                    })
                  }
                }}
                disabled={selectedTopic.moduleIndex === 0 && selectedTopic.topicIndex === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous Lesson
              </Button>

              <Button
                onClick={() => {
                  // "Next Lesson" on a lesson that's already done just moves on; it must not untick it.
                  if (!completedTopics.has(currentTopic.id)) {
                    toggleTopic(currentTopic.id, selectedTopic.moduleIndex, selectedTopic.topicIndex)
                  }
                  const currentModule = roadmap.modules[selectedTopic.moduleIndex]
                  if (selectedTopic.topicIndex < currentModule.topics.length - 1) {
                    setSelectedTopic({ ...selectedTopic, topicIndex: selectedTopic.topicIndex + 1 })
                  } else if (selectedTopic.moduleIndex < roadmap.modules.length - 1) {
                    setSelectedTopic({ moduleIndex: selectedTopic.moduleIndex + 1, topicIndex: 0 })
                  }
                }}
              >
                {completedTopics.has(currentTopic.id) ? "Next Lesson" : "Mark Complete & Continue"}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft">
              <CheckCircle2 className="h-8 w-8 text-brand" />
            </div>
            <h2 className="mb-2 font-serif text-2xl font-bold">{roadmap.title}</h2>
            <p className="mb-6 max-w-md text-muted-foreground">{roadmap.description}</p>
            <Button
              size="lg"
              onClick={() => {
                let targetModule = 0
                let targetTopic = 0
                let foundIncomplete = false

                for (let moduleIndex = 0; moduleIndex < roadmap.modules.length; moduleIndex++) {
                  const mod = roadmap.modules[moduleIndex]
                  for (let topicIndex = 0; topicIndex < mod.topics.length; topicIndex++) {
                    const topic = mod.topics[topicIndex]
                    if (!completedTopics.has(topic.id)) {
                      targetModule = moduleIndex
                      targetTopic = topicIndex
                      foundIncomplete = true
                      break
                    }
                  }
                  if (foundIncomplete) break
                }

                setSelectedTopic({ moduleIndex: targetModule, topicIndex: targetTopic })
                setExpandedModules(new Set([roadmap.modules[targetModule].id]))
              }}
            >
              {completedCount > 0 && completedCount < totalTopics
                ? "Continue Learning"
                : completedCount === totalTopics
                  ? "Review Course"
                  : "Start Learning"}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {showAIChat && (
        <div className="flex h-[28rem] w-full flex-col border-t bg-background lg:h-auto lg:w-80 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <MessageSquare className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">AI Instructor</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAIChat(false)}
              className="hover:bg-brand-soft"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <>
                <div className="mb-4 rounded-lg bg-brand-soft p-3">
                  <p className="text-sm">Hello, how can I help you today?</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Some questions you might have about this lesson:
                  </p>
                  {currentTopic && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto w-full justify-start whitespace-normal bg-transparent p-3 text-left text-sm hover:bg-brand-soft"
                        onClick={() => handleSuggestedQuestion(`What are the key concepts in ${currentTopic.title}?`)}
                      >
                        What are the key concepts in {currentTopic.title}?
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto w-full justify-start whitespace-normal bg-transparent p-3 text-left text-sm hover:bg-brand-soft"
                        onClick={() => handleSuggestedQuestion("Can you provide practical examples?")}
                      >
                        Can you provide practical examples?
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto w-full justify-start whitespace-normal bg-transparent p-3 text-left text-sm hover:bg-brand-soft"
                        onClick={() => handleSuggestedQuestion("What are common mistakes to avoid?")}
                      >
                        What are common mistakes to avoid?
                      </Button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded-lg p-3",
                      message.role === "assistant" ? "bg-brand-soft" : "bg-muted ml-4",
                    )}
                  >
                    <RichText text={message.content} className="text-sm leading-relaxed" />
                  </div>
                ))}
                {isLoadingAI && (
                  <div className="rounded-lg bg-brand-soft p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-brand"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:0.2s]"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask AI anything about the lesson..."
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                disabled={isLoadingAI}
              />
              <Button size="sm" onClick={handleSendMessage} disabled={isLoadingAI || !inputMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {showQuiz && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="font-serif text-2xl font-bold">Quiz: {currentTopic?.title}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowQuiz(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingQuiz ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="text-center">
                    <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                    <p className="text-sm text-muted-foreground">Generating quiz questions...</p>
                  </div>
                </div>
              ) : quizError ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
                  <p className="max-w-sm font-semibold text-ink">{quizError}</p>
                  <Button onClick={handleGenerateQuiz}>Try again</Button>
                </div>
              ) : quizData ? (
                <div className="space-y-6">
                  {quizData.questions.map((question: any, qIndex: number) => (
                    <div key={qIndex} className="space-y-3">
                      <h3 className="font-semibold">
                        {qIndex + 1}. {question.question}
                      </h3>
                      <div className="space-y-2">
                        {question.options.map((option: string, oIndex: number) => {
                          const isSelected = selectedAnswers[qIndex] === oIndex
                          const isCorrect = question.correctAnswer === oIndex
                          const showResult = quizSubmitted

                          return (
                            <button
                              key={oIndex}
                              onClick={() => handleAnswerSelect(qIndex, oIndex)}
                              disabled={quizSubmitted}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                                !showResult && "hover:bg-muted/50",
                                isSelected && !showResult && "border-primary bg-primary/5",
                                showResult && isCorrect && "border-leaf bg-leaf-soft",
                                showResult && isSelected && !isCorrect && "border-coral bg-coral-soft",
                                quizSubmitted && "cursor-default",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                                  isSelected && !showResult && "border-primary bg-primary",
                                  showResult && isCorrect && "border-leaf bg-leaf",
                                  showResult && isSelected && !isCorrect && "border-coral bg-coral",
                                )}
                              >
                                {isSelected && <div className="h-2 w-2 rounded-full bg-white"></div>}
                              </div>
                              <span className="flex-1">{option}</span>
                            </button>
                          )
                        })}
                      </div>
                      {quizSubmitted && question.explanation && (
                        <div className="rounded-lg bg-muted p-3 text-sm">
                          <p className="font-semibold mb-1">Explanation:</p>
                          <p className="text-muted-foreground">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="border-t p-6">
              {!quizSubmitted ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {allQuestionsAnswered
                      ? "All questions answered"
                      : `Answer all questions to submit (${Object.keys(selectedAnswers).length}/${quizData?.questions?.length || 0})`}
                  </p>
                  <Button onClick={handleSubmitQuiz} disabled={!allQuestionsAnswered}>
                    Submit Quiz
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      Score:{" "}
                      {
                        Object.entries(selectedAnswers).filter(
                          ([qIndex, aIndex]) => quizData.questions[Number.parseInt(qIndex)].correctAnswer === aIndex,
                        ).length
                      }{" "}
                      / {quizData.questions.length}
                    </p>
                  </div>
                  <Button onClick={() => setShowQuiz(false)}>Close</Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Points feedback, bottom-right on desktop and full-width at the bottom on phones. */}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6 sm:w-96">
        {pointsPop && (
          <div
            key={pointsPop.id}
            role="status"
            className="rise-in flex -rotate-3 items-center gap-2 rounded-full border-2 border-ink bg-marigold px-4 py-2 font-display text-lg font-extrabold text-ink shadow-brut"
          >
            <Star className="h-5 w-5" />+{pointsPop.amount} points
          </div>
        )}
        {progressError && (
          <div role="alert" className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border-2 border-ink bg-coral-soft p-4 shadow-brut">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-coral-ink" />
            <p className="flex-1 text-sm font-semibold text-ink">{progressError}</p>
            <button type="button" onClick={() => setProgressError(null)} aria-label="Dismiss" className="text-ink/60 hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {roadmapBonus !== null && (
          <div role="status" className="rise-in pointer-events-auto w-full rounded-2xl border-2 border-ink bg-leaf-soft p-5 shadow-lift">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-leaf">
                <PartyPopper className="h-5 w-5 text-ink" />
              </span>
              <div className="flex-1">
                <p className="font-display text-lg font-extrabold text-ink">Roadmap finished!</p>
                <p className="text-sm text-ink/75">
                  You earned a <strong className="text-ink">+{roadmapBonus} point</strong> bonus for completing every lesson.
                </p>
              </div>
              <button type="button" onClick={() => setRoadmapBonus(null)} aria-label="Dismiss" className="text-ink/60 hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/rewards#perks">Get your certificate</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/rewards">See rewards</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
