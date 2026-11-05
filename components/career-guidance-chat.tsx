"use client"

import type React from "react"

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

      if (!response.ok) throw new Error("Failed to get response")

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
          content: "Sorry, I encountered an error. Please try again.",
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
            RAG Career Chatbot
          </CardTitle>
          <p className="text-sm text-muted-foreground">Retrieval-Augmented Generation powered by our knowledge base</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="text-xs text-muted-foreground">Audience:</div>
            <ToggleGroup
              type="single"
              value={persona}
              onValueChange={(v) => v && setPersona(v as Persona)}
              variant="outline"
              className="gap-0"
            >
              <ToggleGroupItem value="learner">Learner</ToggleGroupItem>
              <ToggleGroupItem value="trainer">Trainer</ToggleGroupItem>
              <ToggleGroupItem value="policymaker">Policymaker</ToggleGroupItem>
            </ToggleGroup>

            <div className="ml-3 h-4 w-px bg-border" aria-hidden="true" />

            <Toggle
              aria-label="Use Retrieval Augmentation"
              variant="outline"
              pressed={ragEnabled}
              onPressedChange={setRagEnabled}
              className="gap-2"
            >
              <Database className="h-4 w-4" />
              {ragEnabled ? "RAG On" : "RAG Off"}
            </Toggle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Suggested prompts */}
          {messages.length === 0 && (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">Try asking about:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3 bg-transparent"
                  onClick={() => setInput("What career paths are available in data science?")}
                >
                  <span className="text-sm">What career paths are available in data science?</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3 bg-transparent"
                  onClick={() => setInput("How can I transition from teaching to educational policy?")}
                >
                  <span className="text-sm">How can I transition from teaching to educational policy?</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3 bg-transparent"
                  onClick={() => setInput("What skills do trainers need in 2025?")}
                >
                  <span className="text-sm">What skills do trainers need in 2025?</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3 bg-transparent"
                  onClick={() => setInput("Guide me on implementing vocational training programs")}
                >
                  <span className="text-sm">Guide me on implementing vocational training programs</span>
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-4 min-h-[400px] max-h-[600px] overflow-y-auto">
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
                        {message.mode || "RAG"}
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
            This RAG-powered career chatbot is designed for learners, trainers, and policymakers to get personalized
            advice on:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Career exploration and planning</li>
            <li>Skills development and training recommendations</li>
            <li>Policy implementation strategies</li>
            <li>Educational program design</li>
            <li>Workforce development insights</li>
          </ul>
          <p className="text-xs">
            Powered by Retrieval-Augmented Generation for accurate, context-aware career guidance.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
