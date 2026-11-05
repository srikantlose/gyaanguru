import type React from "react"
import { CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const tones = [
  "bg-lagoon text-ink border-2 border-ink",
  "bg-leaf text-ink border-2 border-ink",
  "bg-marigold text-ink border-2 border-ink",
  "bg-coral text-ink border-2 border-ink",
  "bg-brand text-ink border-2 border-ink",
]

/** Card title with a colored step number, for multi-section forms. */
export function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-3 text-xl">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-extrabold",
          tones[(n - 1) % tones.length],
        )}
      >
        {n}
      </span>
      {children}
    </CardTitle>
  )
}
