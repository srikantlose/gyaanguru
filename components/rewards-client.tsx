"use client"

import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Coins,
  Gift,
  Loader2,
  RotateCw,
  Snowflake,
  Sparkles,
  Star,
  TriangleAlert,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MicroCredentialBadges } from "@/components/micro-credential-badges"
import { Tape } from "@/components/doodles"
import type { Achievement } from "@/lib/achievements"
import {
  POINTS_PER_LESSON,
  SCHEMA_MISSING_MESSAGE,
  type PerkKind,
  type PointEvent,
  type RewardItem,
  type RewardTone,
  type RewardsData,
} from "@/lib/rewards"
import { cn } from "@/lib/utils"

type FinishedRoadmap = { id: string; title: string; certified: boolean }

type Props = {
  balance: number
  earned: number
  spent: number
  roadmapsFinished: number
  freezesAvailable: number
  stickerPack: boolean
  finished: FinishedRoadmap[]
  /** null when loading the rewards tables failed. */
  rewards: RewardsData | null
  achievements: Achievement[]
}

const soft: Record<RewardTone, string> = {
  brand: "bg-brand-soft",
  marigold: "bg-marigold-soft",
  coral: "bg-coral-soft",
  lagoon: "bg-lagoon-soft",
  leaf: "bg-leaf-soft",
  bubblegum: "bg-bubblegum-soft",
}

const fill: Record<RewardTone, string> = {
  brand: "bg-brand",
  marigold: "bg-marigold",
  coral: "bg-coral",
  lagoon: "bg-lagoon",
  leaf: "bg-leaf",
  bubblegum: "bg-bubblegum",
}

const perkIcon: Record<PerkKind, typeof Gift> = {
  streak_freeze: Snowflake,
  certificate: Award,
  sticker_pack: Sparkles,
}

const eventStyle: Record<PointEvent["kind"], { icon: typeof Gift; chip: string }> = {
  topic: { icon: CheckCircle2, chip: "bg-leaf" },
  roadmap_bonus: { icon: Star, chip: "bg-marigold" },
  redeem: { icon: Gift, chip: "bg-coral" },
  adjust: { icon: Wallet, chip: "bg-lagoon" },
}

// Fixed time zone so the server render and the browser agree on the date.
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })

type Pending = { item: RewardItem; target?: FinishedRoadmap }

export function RewardsClient({
  balance,
  earned,
  spent,
  roadmapsFinished,
  freezesAvailable,
  stickerPack,
  finished,
  rewards,
  achievements,
}: Props) {
  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()
  const [pending, setPending] = useState<Pending | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [certChoice, setCertChoice] = useState("")

  const uncertified = finished.filter((r) => !r.certified)
  // Derived, not synced: after a refresh the chosen roadmap may already have its certificate.
  const certTarget = uncertified.find((r) => r.id === certChoice) ?? uncertified[0]

  const refresh = () => startRefresh(() => router.refresh())

  const openConfirm = (item: RewardItem) => {
    setDialogError(null)
    setPending({ item, target: item.perk === "certificate" ? certTarget : undefined })
  }

  const redeem = async () => {
    if (!pending) return
    setSubmitting(true)
    setDialogError(null)
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId: pending.item.id, targetId: pending.target?.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Couldn't redeem that. Please try again.")
      setPending(null)
      setNotice(data.message || `Redeemed ${pending.item.name}.`)
      refresh()
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Couldn't redeem that. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const stats = [
    { label: "Balance", value: balance, icon: Coins, tile: "bg-marigold-soft", chip: "bg-marigold" },
    { label: "Earned", value: earned, icon: Star, tile: "bg-leaf-soft", chip: "bg-leaf" },
    { label: "Spent", value: spent, icon: Gift, tile: "bg-coral-soft", chip: "bg-coral" },
    { label: "Roadmaps finished", value: roadmapsFinished, icon: Award, tile: "bg-lagoon-soft", chip: "bg-lagoon" },
  ]

  const perks = rewards?.catalog.filter((i) => i.kind === "perk") ?? []
  const demos = rewards?.catalog.filter((i) => i.kind === "demo") ?? []

  return (
    <div className="space-y-12">
      {/* balance + totals */}
      <section aria-label="Your points">
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tile, chip }) => (
            <div key={label} className={cn("brut flex items-center gap-3 rounded-2xl p-4 sm:p-5", tile)}>
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink", chip)}>
                <Icon className="h-5 w-5 text-ink" />
              </span>
              <div className="min-w-0">
                <dt className="text-sm font-semibold text-ink/70">{label}</dt>
                <dd className="font-display text-2xl font-extrabold text-ink" data-stat={label}>
                  {value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-ink">
          <li className="rounded-full border-2 border-ink bg-card px-3 py-1">+{POINTS_PER_LESSON} for each new lesson</li>
          <li className="rounded-full border-2 border-ink bg-card px-3 py-1">+60 to +320 for finishing a roadmap</li>
          <li className="rounded-full border-2 border-ink bg-card px-3 py-1">badges at 1, 5 and 10 roadmaps</li>
        </ul>
      </section>

      {notice && (
        <div role="status" className="brut flex items-start gap-3 rounded-2xl bg-leaf-soft p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-leaf-ink" />
          <p className="flex-1 font-semibold text-ink">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} className="text-sm font-bold text-ink/60 underline hover:text-ink">
            Dismiss
          </button>
        </div>
      )}

      {rewards === null ? (
        <div role="alert" className="brut flex flex-col gap-4 rounded-2xl bg-coral-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-coral-ink" />
            <p className="font-semibold text-ink">Couldn&apos;t load the rewards store just now.</p>
          </div>
          <Button variant="outline" onClick={refresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            Try again
          </Button>
        </div>
      ) : !rewards.ready ? (
        <div role="alert" className="brut flex items-start gap-3 rounded-2xl bg-marigold-soft p-5">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-marigold-ink" />
          <p className="font-semibold text-ink">{SCHEMA_MISSING_MESSAGE}</p>
        </div>
      ) : (
        <>
          <section id="perks" aria-labelledby="perks-heading" className="scroll-mt-24">
            <div className="mb-5">
              <h2 id="perks-heading" className="text-2xl font-extrabold text-ink">
                Perks that work
              </h2>
              <p className="mt-1 text-ink/70">These do something in GyaanGuru as soon as you redeem them.</p>
            </div>
            {perks.length === 0 ? (
              <EmptyNote>No perks are available right now.</EmptyNote>
            ) : (
              <ul className="grid gap-x-5 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
                {perks.map((item) => {
                  let blocked: string | null = null
                  let extra: React.ReactNode = null
                  if (item.perk === "streak_freeze") {
                    extra = (
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-lagoon-ink">
                        <Snowflake className="h-4 w-4" />
                        {freezesAvailable === 0 ? "None saved yet" : `${freezesAvailable} saved for a busy day`}
                      </p>
                    )
                  } else if (item.perk === "certificate") {
                    if (finished.length === 0) blocked = "Finish a roadmap first"
                    else if (!certTarget) blocked = "All your finished roadmaps have one"
                    extra =
                      uncertified.length > 0 ? (
                        <label className="block text-sm font-semibold text-ink">
                          For roadmap
                          <select
                            value={certTarget?.id ?? ""}
                            onChange={(e) => setCertChoice(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-2 border-ink bg-card px-2.5 py-2 text-sm font-medium"
                          >
                            {uncertified.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.title}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : finished.length > 0 ? (
                        <CertificateLinks roadmaps={finished.filter((r) => r.certified)} />
                      ) : null
                  } else if (item.perk === "sticker_pack" && stickerPack) {
                    blocked = "Unlocked"
                    extra = (
                      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-bold text-primary underline">
                        See them on your dashboard <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )
                  }
                  return (
                    <RewardCard
                      key={item.id}
                      item={item}
                      balance={balance}
                      blocked={blocked}
                      extra={extra}
                      onRedeem={() => openConfirm(item)}
                    />
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="demo-heading">
            <div className="mb-5">
              <h2 id="demo-heading" className="text-2xl font-extrabold text-ink">
                Demo rewards
              </h2>
              <p className="mt-1 max-w-2xl text-ink/70">
                These show how a real rewards store could work. Redeeming one spends the points and logs a request, but{" "}
                <strong className="text-ink">nothing is delivered</strong>.
              </p>
            </div>
            {demos.length === 0 ? (
              <EmptyNote>No demo rewards right now.</EmptyNote>
            ) : (
              <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {demos.map((item) => (
                  <RewardCard key={item.id} item={item} balance={balance} onRedeem={() => openConfirm(item)} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="mb-5 text-2xl font-extrabold text-ink">
          Badges
        </h2>
        <MicroCredentialBadges achievements={achievements} />
      </section>

      {rewards?.ready && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section aria-labelledby="passbook-heading" className="rounded-2xl border-2 border-ink bg-card shadow-brut">
            <div className="border-b-2 border-ink px-5 py-4">
              <h2 id="passbook-heading" className="text-xl font-extrabold text-ink">
                Points passbook
              </h2>
              <p className="text-sm text-ink/60">Every point in and out, newest first{rewards.events.length >= 50 ? " (last 50)" : ""}.</p>
            </div>
            {rewards.events.length === 0 ? (
              <p className="px-5 py-8 text-center text-ink/70">Nothing here yet. Finish a lesson to earn your first {POINTS_PER_LESSON} points.</p>
            ) : (
              <ol className="divide-y divide-border">
                {rewards.events.map((e) => {
                  const { icon: Icon, chip } = eventStyle[e.kind] ?? eventStyle.adjust
                  return (
                    <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-ink", chip)}>
                        <Icon className="h-4 w-4 text-ink" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink" title={e.description}>
                          {e.description}
                        </p>
                        <p className="hand text-sm text-ink/60">{shortDate(e.createdAt)}</p>
                      </div>
                      <span
                        className={cn(
                          "font-display text-lg font-extrabold tabular-nums",
                          e.amount > 0 ? "text-leaf-ink" : "text-coral-ink",
                        )}
                      >
                        {e.amount > 0 ? `+${e.amount}` : `−${Math.abs(e.amount)}`}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>

          <section aria-labelledby="redeemed-heading" className="rounded-2xl border-2 border-ink bg-card shadow-brut">
            <div className="border-b-2 border-ink px-5 py-4">
              <h2 id="redeemed-heading" className="text-xl font-extrabold text-ink">
                Redeemed
              </h2>
              <p className="text-sm text-ink/60">What you&apos;ve spent your points on.</p>
            </div>
            {rewards.redemptions.length === 0 ? (
              <p className="px-5 py-8 text-center text-ink/70">You haven&apos;t redeemed anything yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {rewards.redemptions.map((r) => {
                  const roadmap = r.targetId ? finished.find((f) => f.id === r.targetId) : undefined
                  return (
                    <li key={r.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{r.rewardName}</p>
                          {roadmap && <p className="truncate text-sm text-ink/70">{roadmap.title}</p>}
                          <p className="hand text-sm text-ink/60">
                            {shortDate(r.createdAt)} · −{r.cost}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 -rotate-3 rounded-md border-2 px-2 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wider",
                            r.status === "active" ? "border-leaf-ink text-leaf-ink" : "border-coral-ink text-coral-ink",
                          )}
                        >
                          {r.status === "active" ? "Unlocked" : "Demo · requested"}
                        </span>
                      </div>
                      {r.rewardId === "completion-certificate" && r.targetId && (
                        <Link
                          href={`/certificate/${r.targetId}`}
                          className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-primary underline"
                        >
                          Open certificate <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && !submitting && setPending(null)}>
        <DialogContent className="bg-card">
          {pending && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-ink">Redeem {pending.item.name}?</DialogTitle>
                <DialogDescription className="text-ink/75">
                  {pending.item.cost} points come off your balance: {balance} → {balance - pending.item.cost}.
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-ink/80">
                {pending.item.kind === "demo"
                  ? "This is a demo reward. The points are spent and a request is logged, but nothing is delivered."
                  : pending.item.perk === "certificate"
                    ? `Your certificate will be for “${pending.target?.title ?? "your roadmap"}”. You can open and print it straight away.`
                    : pending.item.perk === "streak_freeze"
                      ? "It's saved until the first day you miss a lesson, then it keeps your streak alive."
                      : "The stickers appear on your dashboard straight away."}
              </p>
              {dialogError && (
                <p role="alert" className="rounded-lg border-2 border-ink bg-coral-soft px-3 py-2 text-sm font-semibold text-ink">
                  {dialogError}
                </p>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setPending(null)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={redeem} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Redeem for {pending.item.cost}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RewardCard({
  item,
  balance,
  blocked = null,
  extra = null,
  onRedeem,
}: {
  item: RewardItem
  balance: number
  blocked?: string | null
  extra?: React.ReactNode
  onRedeem: () => void
}) {
  const short = item.cost - balance
  const Icon = item.perk ? perkIcon[item.perk] : Gift
  return (
    <li className="relative flex flex-col rounded-2xl border-2 border-ink bg-card shadow-brut" data-reward={item.id}>
      {item.featured && <Tape tone={item.tone === "marigold" ? "coral" : "marigold"} className="-top-3 left-6 -rotate-3" />}
      <div className={cn("flex items-start justify-between gap-3 rounded-t-[14px] border-b-2 border-ink p-4", soft[item.tone])}>
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink", fill[item.tone])}>
          <Icon className="h-5 w-5 text-ink" />
        </span>
        <span className="rotate-2 rounded-full border-2 border-ink bg-card px-3 py-1 font-display text-sm font-extrabold text-ink shadow-soft">
          {item.cost} pts
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink/60">{item.category}</p>
          <h3 className="mt-0.5 text-lg leading-snug text-ink">{item.name}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink/75">{item.description}</p>
        </div>
        {item.kind === "demo" && (
          <span className="w-fit -rotate-2 rounded-md border-2 border-coral-ink px-2 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wider text-coral-ink">
            Demo · nothing is delivered
          </span>
        )}
        {extra}
      </div>
      {/* perforated tear line, like a coupon */}
      <div className="relative border-t-2 border-dashed border-ink/40">
        <span className="absolute -left-[11px] -top-[11px] h-5 w-5 rounded-full border-2 border-ink bg-paper [clip-path:inset(0_0_0_50%)]" />
        <span className="absolute -right-[11px] -top-[11px] h-5 w-5 rounded-full border-2 border-ink bg-paper [clip-path:inset(0_50%_0_0)]" />
      </div>
      <div className="p-4">
        <Button
          className="w-full"
          variant={blocked || short > 0 ? "outline" : "default"}
          disabled={Boolean(blocked) || short > 0}
          onClick={onRedeem}
        >
          {blocked ? blocked : short > 0 ? `${short} more points needed` : `Redeem for ${item.cost}`}
        </Button>
      </div>
    </li>
  )
}

function CertificateLinks({ roadmaps }: { roadmaps: FinishedRoadmap[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {roadmaps.map((r) => (
        <li key={r.id}>
          <Link href={`/certificate/${r.id}`} className="inline-flex items-center gap-1 font-bold text-primary underline">
            {r.title} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border-2 border-dashed border-ink bg-card px-5 py-8 text-center text-ink/70">{children}</p>
}
