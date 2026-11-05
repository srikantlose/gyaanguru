import { Award, Check, Lock } from "lucide-react"
import type { Achievement } from "@/lib/achievements"
import { cn } from "@/lib/utils"

const fill: Record<Achievement["tone"], string> = {
  brand: "bg-brand",
  marigold: "bg-marigold",
  coral: "bg-coral",
  lagoon: "bg-lagoon",
  leaf: "bg-leaf",
  bubblegum: "bg-bubblegum",
}

/** Badges earned from the learner's real activity, with progress toward the locked ones. */
export function MicroCredentialBadges({ achievements }: { achievements: Achievement[] }) {
  const earned = achievements.filter((a) => a.earned).length
  return (
    <div className="space-y-4">
      <p className="font-display text-lg font-extrabold text-ink">
        {earned} of {achievements.length} badges earned
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {achievements.map((a, i) => (
          <li
            key={a.id}
            className={cn(
              "relative flex flex-col items-center rounded-2xl border-2 border-ink p-4 text-center transition-transform",
              a.earned ? "bg-card shadow-brut hover:-rotate-2" : "bg-muted/60",
            )}
            style={{ rotate: a.earned ? `${i % 2 ? 1.5 : -1.5}deg` : undefined }}
          >
            <span
              className={cn(
                "relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink",
                a.earned ? cn(fill[a.tone], "shadow-soft") : "border-dashed bg-card",
              )}
            >
              {a.earned ? <Award className="h-8 w-8 text-ink" /> : <Lock className="h-6 w-6 text-ink/40" />}
              {a.earned && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-leaf">
                  <Check className="h-3.5 w-3.5 text-ink" strokeWidth={3} />
                </span>
              )}
            </span>
            <p className={cn("mt-3 font-display font-extrabold", a.earned ? "text-ink" : "text-ink/60")}>{a.title}</p>
            <p className="text-xs text-ink/70">{a.description}</p>
            {!a.earned && (
              <div className="mt-3 w-full">
                <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-card">
                  <div className={cn("h-full", fill[a.tone])} style={{ width: `${a.progress}%` }} />
                </div>
                <p className="mt-1 text-[11px] font-semibold text-ink/60">{a.hint}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Badges update automatically as you complete lessons and roadmaps.</p>
    </div>
  )
}
