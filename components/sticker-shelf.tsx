import { BookOpen, Coffee, Flame, Moon, Rocket, Zap } from "lucide-react"
import { Sticker } from "@/components/doodles"

const STICKERS = [
  { label: "chai powered", icon: Coffee, tone: "marigold", rotate: -6 },
  { label: "night owl", icon: Moon, tone: "lagoon", rotate: 4 },
  { label: "no zero days", icon: Zap, tone: "coral", rotate: -3 },
  { label: "padhai mode", icon: BookOpen, tone: "leaf", rotate: 5 },
  { label: "streak hero", icon: Flame, tone: "bubblegum", rotate: -5 },
  { label: "level up!", icon: Rocket, tone: "brand", rotate: 3 },
] as const

/** The Sticker Pack reward: six draggable stickers for the dashboard. */
export function StickerShelf() {
  return (
    <div className="relative z-10 mb-8 flex flex-wrap items-center gap-3" aria-label="Your sticker pack">
      {STICKERS.map(({ label, icon: Icon, tone, rotate }) => (
        <Sticker key={label} tone={tone} rotate={rotate} draggable>
          <Icon className="h-4 w-4" />
          {label}
        </Sticker>
      ))}
      <span className="hand text-base text-ink/60">drag them anywhere · double-click to send one home</span>
    </div>
  )
}
