"use client"

import { useEffect, useRef } from "react"

/**
 * Notebook-paper page background: ruled lines and a red margin line. Around the pointer the paper
 * turns into teal graph paper with a soft highlighter glow. Pointer position is written to CSS
 * variables (no re-renders); static on touch devices and with reduced motion.
 */
export function InteractiveBackground() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (!window.matchMedia("(hover: hover)").matches) return

    let frame = 0
    let x = -1000
    let y = -1000
    const apply = () => {
      frame = 0
      el.style.setProperty("--mx", `${x}px`)
      el.style.setProperty("--my", `${y}px`)
    }
    const onMove = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      if (!frame) frame = requestAnimationFrame(apply)
    }
    const onLeave = () => {
      x = -1000
      y = -1000
      if (!frame) frame = requestAnimationFrame(apply)
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerleave", onLeave)
    return () => {
      window.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerleave", onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const reveal = "radial-gradient(200px circle at var(--mx) var(--my), black 30%, transparent 75%)"

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ ["--mx" as string]: "-1000px", ["--my" as string]: "-1000px" }}
    >
      {/* ruled lines */}
      <div className="ruled absolute inset-0 opacity-70" />
      {/* red margin line (wide screens) */}
      <div className="absolute inset-y-0 left-10 hidden w-[2px] bg-margin/70 xl:block" />
      <div className="absolute inset-y-0 left-[46px] hidden w-px bg-margin/40 xl:block" />
      {/* graph paper revealed around the pointer */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in srgb, var(--color-brand) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--color-brand) 55%, transparent) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          backgroundPosition: "0 -1px",
          maskImage: reveal,
          WebkitMaskImage: reveal,
        }}
      />
      {/* highlighter glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(260px circle at var(--mx) var(--my), color-mix(in srgb, var(--color-marigold) 22%, transparent), transparent 70%)",
        }}
      />
    </div>
  )
}
