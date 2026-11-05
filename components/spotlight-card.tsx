"use client"

import type React from "react"
import { useRef } from "react"
import { cn } from "@/lib/utils"
import { Tape } from "@/components/doodles"

type Tone = "brand" | "marigold" | "coral" | "lagoon" | "leaf" | "bubblegum"

const toneVar: Record<Tone, string> = {
  brand: "var(--color-brand)",
  marigold: "var(--color-marigold)",
  coral: "var(--color-coral)",
  lagoon: "var(--color-lagoon)",
  leaf: "var(--color-leaf)",
  bubblegum: "var(--color-bubblegum)",
}

/**
 * Ink-outlined card with a hard shadow. On hover it lifts, straightens if tilted, and a
 * colored highlighter glow follows the pointer. Optional washi tape and tilt for a pinned-note look.
 */
export function SpotlightCard({
  tone = "brand",
  tape,
  tilt = 0,
  className,
  children,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: Tone; tape?: Tone; tilt?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--sx", `${e.clientX - rect.left}px`)
    el.style.setProperty("--sy", `${e.clientY - rect.top}px`)
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      className={cn(
        "group/spot relative rounded-2xl border-2 border-ink bg-card shadow-brut transition-all duration-200",
        "hover:-translate-x-0.5 hover:-translate-y-1 hover:rotate-0 hover:shadow-lift motion-reduce:transform-none",
        className,
      )}
      style={{ ["--spot" as string]: toneVar[tone], rotate: tilt ? `${tilt}deg` : undefined, ...style }}
      {...props}
    >
      {tape && <Tape tone={tape} className="-top-3 left-6 -rotate-6" />}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[14px]">
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
          style={{
            background:
              "radial-gradient(260px circle at var(--sx, 50%) var(--sy, 50%), color-mix(in srgb, var(--spot) 28%, transparent), transparent 65%)",
          }}
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
