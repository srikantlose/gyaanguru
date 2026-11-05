"use client"

import type React from "react"
import { useRef } from "react"
import { cn } from "@/lib/utils"

/**
 * Exposes the pointer position inside this box as --px / --py (each -1..1).
 * Children shift layers with e.g. `translate(calc(var(--px) * 12px), ...)` (see `.parallax-*` in globals.css).
 */
export function Parallax({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || e.pointerType === "touch") return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
    el.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
  }
  const onPointerLeave = () => {
    ref.current?.style.setProperty("--px", "0")
    ref.current?.style.setProperty("--py", "0")
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn("[--px:0] [--py:0]", className)}
    >
      {children}
    </div>
  )
}
