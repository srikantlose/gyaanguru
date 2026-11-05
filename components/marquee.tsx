import { cn } from "@/lib/utils"

const DEFAULT_ITEMS = [
  "Data Analyst",
  "Python",
  "Digital Marketing",
  "Electrician",
  "Excel",
  "Retail Associate",
  "SEO",
  "Customer Support",
  "Tally & GST",
  "Web Development",
  "Healthcare Assistant",
  "Graphic Design",
]

/** Tilted tape-like ticker band of skills and roles. Pauses on hover. */
export function Marquee({ items = DEFAULT_ITEMS, className }: { items?: string[]; className?: string }) {
  const row = [...items, ...items]
  return (
    <div
      className={cn(
        "marquee relative -mx-2 -rotate-1 overflow-hidden border-y-2 border-ink bg-ink py-3 text-paper",
        className,
      )}
      aria-label="Skills and roles you can learn"
    >
      <div className="marquee-track flex w-max items-center gap-6 whitespace-nowrap">
        {row.map((item, i) => (
          <span
            key={i}
            aria-hidden={i >= items.length}
            className="flex items-center gap-6 font-display text-xl font-black uppercase [font-stretch:120%]"
          >
            <span aria-hidden className={i % 3 === 0 ? "text-marigold" : i % 3 === 1 ? "text-brand" : "text-bubblegum"}>✦</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
