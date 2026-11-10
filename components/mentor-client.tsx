"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { ArrowRight, Award, BookOpen, Check, Clock, Flame, Loader2, Send, Star, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { ChatIllustration, MapIllustration } from "@/components/illustrations"
import { Sticker } from "@/components/doodles"
import type { LearnerSnapshot } from "@/lib/learner"
import type { Achievement } from "@/lib/achievements"
import { cn } from "@/lib/utils"
import { RichText } from "@/components/rich-text"

type Msg = { role: "user" | "assistant"; content: string }

const QUICK_PROMPTS = [
  "What should I learn next?",
  "Make me a study plan for this week",
  "How am I doing so far?",
  "Explain my next lesson simply",
]

export function MentorClient({ learner, achievements }: { learner: LearnerSnapshot; achievements: Achievement[] }) {
  const firstName = learner.name?.split(" ")[0] ?? "there"
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: learner.roadmaps.length
        ? `Hi ${firstName}! I can see your roadmaps and progress. Ask me what to study next, for a weekly plan, or to explain a topic.`
        : `Hi ${firstName}! You don't have a roadmap yet. Tell me what you want to learn and I'll help you plan, or create one on the Generate page.`,
    },
  ])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const [activeRoadmap, setActiveRoadmap] = useState(learner.roadmaps[0]?.id ?? null)

  const scrollToEnd = () =>
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }))

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || sending) return
    const history: Msg[] = [...messages, { role: "user", content }]
    setMessages(history)
    setInput("")
    setSending(true)
    scrollToEnd()
    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The greeting is UI-only; send the real conversation.
        body: JSON.stringify({ messages: history.slice(1) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "The mentor couldn't reply. Please try again.")
      setMessages((m) => [...m, { role: "assistant", content: data.reply }])
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." }])
    } finally {
      setSending(false)
      scrollToEnd()
    }
  }

  const stats = [
    { label: "Hours learned", value: learner.hoursLearned, icon: Clock, tile: "bg-lagoon-soft", chip: "bg-lagoon" },
    { label: "Lessons done", value: learner.topicsDone, icon: BookOpen, tile: "bg-leaf-soft", chip: "bg-leaf" },
    { label: "Day streak", value: learner.streak, icon: Flame, tile: "bg-coral-soft", chip: "bg-coral" },
    { label: "Points", value: learner.points, icon: Star, tile: "bg-marigold-soft", chip: "bg-marigold" },
  ]
  const roadmap = learner.roadmaps.find((r) => r.id === activeRoadmap) ?? null
  const maxDay = Math.max(1, ...learner.week.map((d) => d.count))
  const earned = achievements.filter((a) => a.earned)

  return (
    <main className="container mx-auto px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="AI mentor"
          tone="marigold"
          title="AI Mentor"
          description="A study coach that knows your roadmaps, progress and goals."
          actions={
            learner.streak > 0 ? (
              <Sticker tone="coral" rotate={-4}>
                <Flame className="h-4 w-4" /> {learner.streak} day streak
              </Sticker>
            ) : undefined
          }
          art={<ChatIllustration />}
        />

        <dl className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tile, chip }) => (
            <div key={label} className={cn("brut flex items-center gap-3 rounded-2xl p-4", tile)}>
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink text-ink", chip)}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <dt className="text-sm font-semibold text-ink/70">{label}</dt>
                <dd className="font-display text-2xl font-extrabold text-ink">{value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <Tabs defaultValue="chat">
          <TabsList className="mb-4">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="path">Learning path</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Chat */}
          <TabsContent value="chat">
            <div className="flex h-[34rem] flex-col rounded-2xl border-2 border-ink bg-card shadow-brut">
              <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap rounded-2xl border-2 border-ink px-4 py-3 text-sm leading-relaxed text-ink",
                        m.role === "user" ? "bg-marigold shadow-soft" : "bg-paper",
                      )}
                    >
                      {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink/60">
                    <Loader2 className="h-4 w-4 animate-spin" /> Mentor is thinking…
                  </div>
                )}
              </div>
              <div className="space-y-3 border-t-2 border-ink p-4">
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      disabled={sending}
                      className="rounded-full border-2 border-ink bg-brand-soft px-3 py-1 text-xs font-bold text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    send(input)
                  }}
                >
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        send(input)
                      }
                    }}
                    placeholder="Ask your mentor anything about your learning…"
                    aria-label="Message the mentor"
                    className="min-h-[52px] flex-1 resize-none"
                    rows={2}
                  />
                  <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Send">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>

          {/* Learning path */}
          <TabsContent value="path">
            {learner.roadmaps.length === 0 ? (
              <EmptyRoadmaps />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {learner.roadmaps.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setActiveRoadmap(r.id)}
                      className={cn(
                        "rounded-full border-2 border-ink px-3 py-1 text-sm font-bold text-ink transition-all",
                        r.id === activeRoadmap ? "bg-marigold shadow-soft" : "bg-card hover:bg-muted",
                      )}
                    >
                      {r.title} · {r.percent}%
                    </button>
                  ))}
                </div>
                {roadmap && (
                  <div className="rounded-2xl border-2 border-ink bg-card p-5 shadow-brut">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="font-display text-xl font-extrabold text-ink">{roadmap.title}</p>
                      <Button asChild size="sm">
                        <Link href={`/roadmap/${roadmap.id}`}>
                          {roadmap.done > 0 ? "Continue" : "Start"} <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    <ol className="space-y-2">
                      {roadmap.topics.map((t) => {
                        const isNext = roadmap.next?.moduleIndex === t.moduleIndex && roadmap.next?.topicIndex === t.topicIndex
                        return (
                          <li
                            key={`${t.moduleIndex}-${t.topicIndex}`}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border-2 px-3 py-2",
                              isNext ? "border-ink bg-marigold-soft shadow-soft" : "border-transparent",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-ink",
                                t.done ? "bg-leaf" : "bg-card",
                              )}
                            >
                              {t.done && <Check className="h-4 w-4 text-ink" strokeWidth={3} />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={cn("font-semibold", t.done ? "text-ink/50 line-through" : "text-ink")}>{t.title}</p>
                              <p className="text-xs text-muted-foreground">{t.moduleTitle}</p>
                            </div>
                            {isNext && <span className="hand text-sm text-coral-ink">up next</span>}
                            {t.hours > 0 && <span className="text-xs font-semibold text-ink/60">{t.hours}h</span>}
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Goals */}
          <TabsContent value="goals">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Short-term goal", value: learner.goals.shortTerm, tone: "bg-lagoon-soft" },
                { label: "Long-term goal", value: learner.goals.longTerm, tone: "bg-leaf-soft" },
                { label: "Target role", value: learner.goals.targetRole, tone: "bg-bubblegum-soft" },
              ].map((g) => (
                <div key={g.label} className={cn("brut rounded-2xl p-5", g.tone)}>
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink/70">
                    <Target className="h-4 w-4" /> {g.label}
                  </p>
                  <p className="mt-2 font-display text-lg font-extrabold text-ink">{g.value || "Not set yet"}</p>
                </div>
              ))}
            </div>
            {!(learner.goals.shortTerm || learner.goals.longTerm || learner.goals.targetRole) && (
              <p className="mt-4 text-sm text-ink/70">
                Add your goals in{" "}
                <Link href="/profile" className="font-semibold text-primary underline underline-offset-4">
                  your profile
                </Link>{" "}
                so the mentor can plan around them.
              </p>
            )}
            {learner.roadmaps.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="font-display text-lg font-extrabold text-ink">Roadmap progress</p>
                {learner.roadmaps.map((r) => (
                  <div key={r.id}>
                    <div className="flex justify-between text-sm font-semibold text-ink">
                      <span>{r.title}</span>
                      <span>
                        {r.done}/{r.total} · {r.percent}%
                      </span>
                    </div>
                    <div className="mt-1 h-3.5 overflow-hidden rounded-full border-2 border-ink bg-card">
                      <div className="h-full bg-brand" style={{ width: `${r.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border-2 border-ink bg-card p-5 shadow-brut">
                <p className="font-display text-lg font-extrabold text-ink">Lessons completed, last 7 days</p>
                <div className="mt-5 flex h-44 items-end gap-3">
                  {learner.week.map((d) => (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs font-bold text-ink">{d.count}</span>
                      <div
                        className="w-full rounded-t-lg border-2 border-ink bg-brand"
                        style={{ height: `${Math.max(6, (d.count / maxDay) * 100)}%`, opacity: d.count ? 1 : 0.25 }}
                        title={`${d.count} lesson${d.count === 1 ? "" : "s"} on ${d.date}`}
                      />
                      <span className="text-xs font-semibold text-ink/70">{d.label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-ink/70">
                  Active on {learner.activeDays} day{learner.activeDays === 1 ? "" : "s"} so far.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-ink bg-card p-5 shadow-brut">
                <p className="font-display text-lg font-extrabold text-ink">
                  Badges ({earned.length}/{achievements.length})
                </p>
                {earned.length ? (
                  <ul className="mt-3 space-y-2">
                    {earned.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <Award className="h-4 w-4 text-marigold-ink" /> {a.title}
                        <span className="font-normal text-ink/60">· {a.description}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-ink/70">Complete your first lesson to earn a badge.</p>
                )}
                <Link href="/career-guidance" className="mt-4 inline-block text-sm font-semibold text-primary underline underline-offset-4">
                  See all badges
                </Link>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

function EmptyRoadmaps() {
  return (
    <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-ink bg-card px-6 py-12 text-center">
      <MapIllustration className="w-48" />
      <p className="mt-4 font-display text-lg font-extrabold text-ink">No roadmap yet</p>
      <p className="mt-1 text-sm text-ink/70">Create one and your mentor will guide you through it.</p>
      <Button asChild className="mt-5">
        <Link href="/generate">Build a roadmap</Link>
      </Button>
    </div>
  )
}
