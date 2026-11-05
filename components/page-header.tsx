import type React from "react"
import { cn } from "@/lib/utils"
import { HandNote, Tape } from "@/components/doodles"

type Tone = "brand" | "marigold" | "coral" | "lagoon" | "leaf"

const eyebrowTone: Record<Tone, string> = {
  brand: "bg-brand text-ink",
  marigold: "bg-marigold text-ink",
  coral: "bg-coral text-ink",
  lagoon: "bg-lagoon text-ink",
  leaf: "bg-leaf text-ink",
}

const tapeTone: Record<Tone, Tone> = {
  brand: "marigold",
  marigold: "coral",
  coral: "lagoon",
  lagoon: "leaf",
  leaf: "coral",
}

/**
 * Page title block in the notebook style: sticker eyebrow, wide display title, optional
 * handwritten note, actions, and the page illustration taped down like a scrapbook card.
 */
export function PageHeader({
  eyebrow,
  tone = "brand",
  title,
  description,
  note,
  actions,
  art,
  className,
}: {
  eyebrow?: React.ReactNode
  tone?: Tone
  title: React.ReactNode
  description?: React.ReactNode
  note?: React.ReactNode
  actions?: React.ReactNode
  art?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-6 sm:mb-10 md:flex-row md:items-center md:justify-between", className)}>
      <div className="min-w-0 max-w-2xl rise-in">
        {eyebrow && <span className={cn("eyebrow mb-4 -rotate-2", eyebrowTone[tone])}>{eyebrow}</span>}
        <h1 className="text-3xl leading-[1.05] text-ink sm:text-[2.6rem]">{title}</h1>
        {note && <HandNote className="mt-1 block text-xl">{note}</HandNote>}
        {description && <p className="mt-3 text-base leading-relaxed text-ink/70 sm:text-lg">{description}</p>}
        {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {art && (
        <div className="relative hidden w-52 shrink-0 rotate-2 rounded-2xl border-2 border-ink bg-card p-4 shadow-brut transition-transform duration-300 hover:rotate-0 md:block lg:w-60">
          <Tape tone={tapeTone[tone]} className="-top-3 left-1/2 -translate-x-1/2 -rotate-3" />
          {art}
        </div>
      )}
    </div>
  )
}
