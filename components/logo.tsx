import Link from "next/link"
import { cn } from "@/lib/utils"

/** Brand mark: an open notebook on a marigold tile, ink-outlined. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-10 w-10", className)} aria-hidden>
      <rect x="3" y="3" width="36" height="36" rx="10" fill="var(--color-ink)" />
      <rect x="1" y="1" width="35" height="35" rx="10" fill="var(--color-marigold)" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M8 26c4-2.2 7-2.2 10.5 0V13c-3.5-2.2-6.5-2.2-10.5 0z" fill="#fff" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18.5 26c3.5-2.2 6.5-2.2 10.5 0V13c-4-2.2-7-2.2-10.5 0z" fill="var(--color-brand)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="29" cy="8.5" r="3.5" fill="var(--color-coral)" stroke="var(--color-ink)" strokeWidth="2" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label="GyaanGuru home">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-black tracking-tight text-ink [font-stretch:115%]">GyaanGuru</span>
        <span className="hand -mt-0.5 text-sm font-bold text-coral-ink" lang="hi">
          ज्ञान · गुरु
        </span>
      </span>
    </Link>
  )
}
