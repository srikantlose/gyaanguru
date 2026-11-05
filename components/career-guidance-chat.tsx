"use client"

import type React from "react"
import { ChatIllustration } from "@/components/illustrations"
import { cn } from "@/lib/utils"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, Database } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface Message {
  role: "user" | "assistant"
  content: string
  mode?: "RAG" | "LLM"
}

type Persona = "learner" | "trainer" | "policymaker"

export function CareerGuidanceChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [persona, setPersona] = useState<Persona>("learner")
  const [ragEnabled, setRagEnabled] = useState<boolean>(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/career-guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          persona,
          rag: ragEnabled,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to get response")
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: "assistant",
        content: data.text,
        mode: ragEnabled ? "RAG" : "LLM",
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error && error.message !== "Failed to get response"
              ? error.message
              : "Sorry, I encountered an error. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Career Chat
          </CardTitle>
          <p className="text-sm text-muted-foreground">Grounded in your profile, your progress and India&apos;s NSQF framework</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="text-xs text-muted-foreground">Audience:</div>
            <ToggleGroup
              type="single"
              value={persona}
              onValueChange={(v) => v && setPersona(v as Persona)}
              variant="outline"
              className="gap-0"
            >
              <ToggleGroupItem value="learner" className="px-3.5">Learner</ToggleGroupItem>
              <ToggleGroupItem value="trainer" className="px-3.5">Trainer</ToggleGroupItem>
              <ToggleGroupItem value="policymaker" className="px-3.5">Policymaker</ToggleGroupItem>
            </ToggleGroup>

            <div className="ml-3 h-4 w-px bg-border" aria-hidden="true" />

            <Toggle
              aria-label="Use my profile and NSQF data"
              variant="outline"
              pressed={ragEnabled}
              onPressedChange={setRagEnabled}
              className="gap-2"
            >
              <Database className="h-4 w-4" />
              {ragEnabled ? "My data: On" : "My data: Off"}
            </Toggle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Suggested prompts */}
          {messages.length === 0 && (
            <div className="grid items-center gap-6 rounded-2xl border-2 border-dashed border-ink/40 bg-paper p-5 md:grid-cols-[180px_1fr]">
              <ChatIllustration className="mx-auto w-40 md:w-full" />
              <div className="grid gap-3">
                <p className="font-display text-lg font-bold text-ink">Not sure what to ask? Try one of these:</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-xl border-2 border-ink px-4 py-3 text-left text-sm font-bold shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-brut bg-lagoon-soft text-lagoon-ink hover:bg-lagoon-soft/70"
                    onClick={() => setInput("What career paths are available in data science?")}
                  >
                    What career paths are available in data science?
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border-2 border-ink px-4 py-3 text-left text-sm font-bold shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-brut bg-coral-soft text-coral-ink hover:bg-coral-soft/70"
                    onClick={() => setInput("How can I transition from teaching to educational policy?")}
                  >
                    How can I transition from teaching to educational policy?
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border-2 border-ink px-4 py-3 text-left text-sm font-bold shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-brut bg-leaf-soft text-leaf-ink hover:bg-leaf-soft/70"
                    onClick={() => setInput("What skills do trainers need in 2025?")}
                  >
                    What skills do trainers need in 2025?
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border-2 border-ink px-4 py-3 text-left text-sm font-bold shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-brut bg-marigold-soft text-marigold-ink hover:bg-marigold-soft/70"
                    onClick={() => setInput("Guide me on implementing vocational training programs")}
                  >
                    Guide me on implementing vocational training programs
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className={cn("space-y-4 max-h-[600px] overflow-y-auto", messages.length > 0 && "min-h-[400px]")}>
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.role === "assistant" && (
                      <Badge variant="secondary" className="shrink-0 mt-1">
                        {message.mode === "LLM" ? "General" : "Personalised"}
                      </Badge>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about career guidance, training strategies, or policy recommendations..."
              className="min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <Button type="submit" size="icon" className="shrink-0" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About This Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            With <strong className="text-ink">My data</strong> on, the chat reads your onboarding answers, roadmaps and
            progress, plus GyaanGuru&apos;s NSQF level reference, so its advice is about you. Turn it off for general advice.
            Learners, trainers and policymakers can use it for:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Career exploration and planning</li>
            <li>Skills development and training recommendations</li>
            <li>Policy implementation strategies</li>
            <li>Educational program design</li>
            <li>Workforce development insights</li>
          </ul>
          <p className="text-xs">Answers are AI-generated. Double-check important decisions with a counsellor.</p>
        </CardContent>
      </Card>
    </div>
  )
}
