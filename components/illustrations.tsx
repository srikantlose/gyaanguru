import type React from "react"
import { cn } from "@/lib/utils"

/*
 * Hand-built flat illustrations in the GyaanGuru palette. Colors come from theme variables.
 * Layers tagged with parallax-1/2/3 drift with the pointer when wrapped in <Parallax>;
 * `float-*` and `march` add gentle idle motion (both disabled for reduced motion).
 */

const C = {
  ink: "var(--color-ink)",
  brand: "var(--color-brand)",
  brandSoft: "var(--color-brand-soft)",
  marigold: "var(--color-marigold)",
  marigoldSoft: "var(--color-marigold-soft)",
  coral: "var(--color-coral)",
  coralSoft: "var(--color-coral-soft)",
  lagoon: "var(--color-lagoon)",
  lagoonSoft: "var(--color-lagoon-soft)",
  leaf: "var(--color-leaf)",
  leafSoft: "var(--color-leaf-soft)",
  muted: "var(--color-muted)",
  skin: "#b9784a",
  hair: "#2a2320",
  white: "#ffffff",
}

type IllustrationProps = { className?: string; title?: string }

function Svg({
  viewBox,
  className,
  title,
  children,
}: IllustrationProps & { viewBox: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      className={cn("h-auto w-full overflow-visible", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fontFamily="var(--font-display)"
    >
      <g stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
    </svg>
  )
}

/** Learner climbing NSQF level steps toward a flag, with lesson and points cards floating around. */
export function HeroIllustration(props: IllustrationProps) {
  const steps = [
    { label: "L3", fill: C.lagoon, text: C.ink },
    { label: "L4", fill: C.leaf, text: C.ink },
    { label: "L5", fill: C.marigold, text: C.ink },
    { label: "L6", fill: C.coral, text: C.ink },
  ]
  return (
    <Svg viewBox="0 0 520 460" {...props}>
      {/* backdrop */}
      <g className="parallax-1">
        <circle cx="270" cy="250" r="190" fill={C.brandSoft} />
        <circle cx="430" cy="92" r="40" fill={C.marigold} />
        <circle cx="430" cy="92" r="56" fill="none" stroke={C.marigold} strokeOpacity="0.35" strokeWidth="6" />
        <g fill={C.white} stroke="none">
          <rect x="70" y="70" width="96" height="26" rx="13" />
          <rect x="96" y="56" width="46" height="30" rx="15" />
          <rect x="300" y="40" width="70" height="20" rx="10" />
        </g>
      </g>

      {/* route from books to the flag */}
      <path
        className="march"
        d="M70 395 C 120 330, 90 300, 160 300 S 250 250, 300 215 S 380 150, 440 140"
        fill="none"
        stroke={C.ink}
        strokeOpacity="0.25"
        strokeWidth="3"
        strokeDasharray="2 10"
        strokeLinecap="round"
      />

      {/* NSQF steps */}
      <g className="parallax-2">
        <ellipse cx="300" cy="402" rx="200" ry="12" fill={C.ink} opacity="0.12"  stroke="none" />
        {steps.map((s, i) => {
          const h = 70 + i * 52
          const x = 140 + i * 82
          const y = 398 - h
          return (
            <g key={s.label}>
              <rect x={x} y={y} width="82" height={h} rx="12" fill={s.fill} />
              <rect x={x} y={y} width="82" height="10" rx="5" fill={C.white} opacity="0.25" stroke="none" />
              <text stroke="none" x={x + 41} y={y + 38} textAnchor="middle" fontSize="20" fontWeight="800" fill={s.text}>
                {s.label}
              </text>
            </g>
          )
        })}
        {/* flag on the top step */}
        <rect x="430" y="96" width="5" height="68" rx="2.5" fill={C.ink} />
        <path d="M435 98 L478 112 L435 126 Z" fill={C.brand} />
      </g>

      {/* learner standing on L4 */}
      <g className="parallax-3">
        <g className="float-slow">
          <rect x="235" y="250" width="11" height="28" rx="5" fill={C.ink} />
          <rect x="250" y="250" width="11" height="28" rx="5" fill={C.ink} />
          <rect x="226" y="208" width="14" height="32" rx="6" fill={C.marigold} />
          <rect x="232" y="200" width="34" height="56" rx="15" fill={C.brand} />
          <path d="M262 214 L286 188" stroke={C.brand} strokeWidth="10" strokeLinecap="round" />
          <circle cx="288" cy="185" r="6" fill={C.skin} />
          <circle cx="249" cy="184" r="15" fill={C.skin} />
          <path d="M234 182 a15 15 0 0 1 30 -2 c-6 -3 -14 -2 -20 3 c-3 2 -6 2 -10 -1z" fill={C.hair} />
        </g>
      </g>

      {/* floating lesson card */}
      <g className="parallax-3">
        <g className="float">
          <rect x="24" y="150" width="160" height="70" rx="16" fill={C.white} />
          <rect x="24" y="150" width="160" height="70" rx="16" fill="none" stroke={C.ink} strokeOpacity="0.08" />
          <circle cx="56" cy="185" r="16" fill={C.leafSoft} />
          <path d="M48 185 l6 6 l11 -12" stroke={C.leaf} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="82" y="172" width="80" height="9" rx="4.5" fill={C.ink} opacity="0.75" />
          <rect x="82" y="189" width="56" height="8" rx="4" fill={C.ink} opacity="0.2" />
        </g>
      </g>

      {/* points badge */}
      <g className="parallax-2">
        <g className="float-delayed">
          <rect x="96" y="236" width="104" height="44" rx="22" fill={C.marigold} />
          <circle cx="122" cy="258" r="11" fill={C.white} opacity="0.9" />
          <path d="M122 251 l2.4 4.9 5.4 .8 -3.9 3.8 .9 5.4 -4.8 -2.5 -4.8 2.5 .9 -5.4 -3.9 -3.8 5.4 -.8z" fill={C.marigold} />
          <text stroke="none" x="166" y="265" textAnchor="middle" fontSize="18" fontWeight="800" fill={C.ink}>
            +5
          </text>
        </g>
      </g>

      {/* book stack */}
      <g className="parallax-1">
        <rect x="30" y="374" width="92" height="20" rx="5" fill={C.coral} />
        <rect x="38" y="356" width="80" height="18" rx="5" fill={C.lagoon} />
        <rect x="26" y="338" width="86" height="18" rx="5" fill={C.brand} />
        <rect x="34" y="344" width="60" height="4" rx="2" fill={C.white} opacity="0.5" stroke="none" />
      </g>
    </Svg>
  )
}

/** Desk scene: laptop showing a mini roadmap, plant, mug and lamp. Used on the auth pages. */
export function StudyIllustration(props: IllustrationProps) {
  return (
    <Svg viewBox="0 0 420 340" {...props}>
      <g className="parallax-1">
        <circle cx="210" cy="160" r="140" fill={C.white} opacity="0.12" stroke="none" />
        <circle cx="340" cy="70" r="26" fill={C.marigold} />
      </g>
      <g className="parallax-2">
        {/* lamp */}
        <path d="M70 250 L70 150 L110 112" stroke={C.ink} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M96 96 l40 14 -14 28z" fill={C.marigold} />
        <path d="M118 130 L150 210" stroke={C.marigoldSoft} strokeWidth="26" opacity="0.25" strokeLinecap="round" />
        {/* desk */}
        <rect x="30" y="250" width="360" height="16" rx="8" fill={C.ink} />
        <rect x="60" y="266" width="10" height="56" rx="5" fill={C.ink} />
        <rect x="350" y="266" width="10" height="56" rx="5" fill={C.ink} />
        {/* laptop */}
        <rect x="140" y="140" width="160" height="104" rx="12" fill={C.ink} />
        <rect x="150" y="150" width="140" height="84" rx="6" fill={C.white} />
        <path className="march" d="M168 214 C 190 214, 192 172, 214 172 S 240 202, 262 186 S 274 162, 276 164" stroke={C.ink} strokeOpacity="0.3" strokeWidth="2.5" strokeDasharray="2 7" fill="none" strokeLinecap="round" />
        <circle cx="168" cy="214" r="7" fill={C.leaf} />
        <circle cx="214" cy="172" r="7" fill={C.lagoon} />
        <circle cx="262" cy="186" r="7" fill={C.marigold} />
        <circle cx="277" cy="164" r="7" fill={C.coral} />
        <rect x="120" y="242" width="200" height="10" rx="5" fill={C.ink} opacity="0.85" />
        {/* mug */}
        <rect x="320" y="212" width="32" height="38" rx="8" fill={C.coral} />
        <path d="M352 222 a10 10 0 0 1 0 18" stroke={C.coral} strokeWidth="5" fill="none" />
      </g>
      <g className="parallax-3">
        {/* plant */}
        <rect x="74" y="214" width="34" height="36" rx="8" fill={C.lagoon} />
        <g className="float-slow">
          <path d="M91 214 C 80 190, 64 186, 58 170 C 78 172, 90 186, 91 214" fill={C.leaf} />
          <path d="M91 214 C 96 186, 110 176, 122 166 C 122 188, 106 200, 91 214" fill={C.leaf} />
          <path d="M91 214 C 90 196, 92 182, 98 168" stroke={C.leaf} strokeWidth="3" fill="none" />
        </g>
        {/* floating check bubble */}
        <g className="float">
          <rect x="250" y="70" width="64" height="44" rx="14" fill={C.white} />
          <path d="M268 92 l8 8 l16 -16" stroke={C.leaf} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </Svg>
  )
}

/** Folded map with a dotted route and a pin (empty dashboard, roadmap overview). */
export function MapIllustration(props: IllustrationProps) {
  return (
    <Svg viewBox="0 0 240 180" {...props}>
      <ellipse cx="120" cy="164" rx="90" ry="8" fill={C.ink} opacity="0.12"  stroke="none" />
      <path d="M30 40 L90 24 L150 40 L210 24 L210 140 L150 156 L90 140 L30 156 Z" fill={C.white} stroke={C.ink} strokeOpacity="0.1" />
      <path d="M90 24 L90 140 M150 40 L150 156" stroke={C.ink} strokeOpacity="0.08" strokeWidth="2" />
      <path d="M30 40 L90 24 L90 140 L30 156 Z" fill={C.brandSoft} />
      <path d="M150 40 L210 24 L210 140 L150 156 Z" fill={C.lagoonSoft} />
      <path className="march" d="M50 128 C 80 110, 70 80, 110 84 S 150 112, 176 70" stroke={C.coral} strokeWidth="3" strokeDasharray="2 8" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="128" r="6" fill={C.leaf} />
      <g className="float">
        <path d="M176 70 c-14 0 -22 -10 -22 -21 a22 22 0 0 1 44 0 c0 11 -8 21 -22 21z" fill={C.coral} />
        <path d="M176 70 l-9 -9 h18 z" fill={C.coral} />
        <circle cx="176" cy="48" r="8" fill={C.white} />
      </g>
    </Svg>
  )
}

/** Two speech bubbles and a lightbulb (career guidance chat, AI instructor). */
export function ChatIllustration(props: IllustrationProps) {
  return (
    <Svg viewBox="0 0 240 180" {...props}>
      <ellipse cx="120" cy="166" rx="84" ry="7" fill={C.ink} opacity="0.12"  stroke="none" />
      <g className="float-slow">
        <rect x="20" y="30" width="130" height="70" rx="22" fill={C.brand} />
        <path d="M46 98 l-6 22 24 -20z" fill={C.brand} />
        <rect x="40" y="52" width="76" height="9" rx="4.5" fill={C.white} opacity="0.9" />
        <rect x="40" y="70" width="52" height="9" rx="4.5" fill={C.white} opacity="0.55" />
      </g>
      <g className="float-delayed">
        <rect x="96" y="84" width="124" height="62" rx="22" fill={C.marigoldSoft} />
        <path d="M196 144 l8 20 -24 -18z" fill={C.marigoldSoft} />
        <circle cx="132" cy="115" r="6" fill={C.marigold} />
        <circle cx="156" cy="115" r="6" fill={C.marigold} />
        <circle cx="180" cy="115" r="6" fill={C.marigold} />
      </g>
      <g className="float">
        <circle cx="196" cy="40" r="20" fill={C.marigold} />
        <rect x="188" y="58" width="16" height="10" rx="3" fill={C.ink} opacity="0.8" />
        <path d="M196 24 v10 M184 40 h-6 M214 40 h-6" stroke={C.white} strokeWidth="3" strokeLinecap="round" />
      </g>
    </Svg>
  )
}

/** Briefcase with a magnifying glass (jobs). */
export function JobsIllustration(props: IllustrationProps) {
  return (
    <Svg viewBox="0 0 240 180" {...props}>
      <ellipse cx="116" cy="164" rx="88" ry="8" fill={C.ink} opacity="0.12"  stroke="none" />
      <rect x="92" y="38" width="56" height="26" rx="10" fill="none" stroke={C.ink} strokeWidth="7" />
      <rect x="40" y="58" width="160" height="100" rx="18" fill={C.lagoon} />
      <rect x="40" y="96" width="160" height="12" fill={C.ink} opacity="0.15" stroke="none" />
      <rect x="108" y="90" width="24" height="24" rx="6" fill={C.marigold} />
      <g className="float">
        <circle cx="186" cy="62" r="26" fill={C.white} stroke={C.coral} strokeWidth="8" />
        <path d="M204 82 l18 18" stroke={C.coral} strokeWidth="10" strokeLinecap="round" />
        <path d="M176 62 l7 7 l13 -14" stroke={C.leaf} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </Svg>
  )
}

/** Envelope with a letter and a check (sign-up success). */
export function MailIllustration(props: IllustrationProps) {
  return (
    <Svg viewBox="0 0 240 180" {...props}>
      <ellipse cx="120" cy="166" rx="84" ry="7" fill={C.ink} opacity="0.12"  stroke="none" />
      <g className="float">
        <rect x="70" y="20" width="100" height="90" rx="10" fill={C.white} stroke={C.ink} strokeOpacity="0.1" />
        <rect x="86" y="40" width="68" height="8" rx="4" fill={C.ink} opacity="0.7" />
        <rect x="86" y="56" width="50" height="8" rx="4" fill={C.ink} opacity="0.2" />
      </g>
      <path d="M40 70 L120 120 L200 70 L200 150 a10 10 0 0 1 -10 10 L50 160 a10 10 0 0 1 -10 -10z" fill={C.brand} />
      <path d="M40 150 L104 108 M200 150 L136 108" stroke={C.ink} strokeOpacity="0.15" strokeWidth="4" />
      <circle cx="190" cy="56" r="22" fill={C.leaf} />
      <path d="M180 56 l7 7 l13 -14" stroke={C.white} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** Sapling growing out of an open book (calls to action). */
export function GrowthIllustration(props: IllustrationProps) {
  return (
    <Svg viewBox="0 0 240 200" {...props}>
      <circle cx="176" cy="44" r="22" fill={C.marigold} />
      <g className="float-slow">
        <path d="M120 120 C 120 90, 118 70, 122 44" stroke={C.leafSoft} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M121 76 C 98 74, 84 62, 80 44 C 104 44, 118 56, 121 76" fill={C.leaf} />
        <path d="M121 96 C 140 92, 156 80, 160 62 C 136 62, 124 76, 121 96" fill={C.leafSoft} />
        <circle cx="122" cy="40" r="9" fill={C.coral} />
      </g>
      <path d="M30 170 c30 -18 60 -18 90 0 v-56 c-30 -18 -60 -18 -90 0z" fill={C.white} />
      <path d="M120 170 c30 -18 60 -18 90 0 v-56 c-30 -18 -60 -18 -90 0z" fill={C.marigoldSoft} />
      <path d="M44 136 c20 -9 40 -9 60 0 M44 152 c20 -9 40 -9 60 0" stroke={C.ink} strokeOpacity="0.15" strokeWidth="4" fill="none" />
    </Svg>
  )
}

/** Gift box with a ribbon, a stack of point coins and a star: the rewards page. */
export function RewardsIllustration(props: IllustrationProps) {
  return (
    <Svg viewBox="0 0 240 200" {...props}>
      <circle cx="120" cy="104" r="84" fill="var(--color-bubblegum-soft)" />
      <g className="float-slow">
        <path d="M40 52 l6 13 14 2 -10 10 3 14 -13 -7 -12 7 2 -14 -10 -10 14 -2z" fill={C.leaf} />
      </g>
      <rect x="66" y="96" width="104" height="74" rx="6" fill={C.coral} />
      <rect x="58" y="78" width="120" height="26" rx="6" fill={C.coral} />
      <rect x="108" y="78" width="20" height="92" fill={C.marigold} />
      <path d="M118 78 C 100 52, 76 58, 86 74 C 92 82, 108 80, 118 78" fill={C.marigold} />
      <path d="M118 78 C 136 52, 160 58, 150 74 C 144 82, 128 80, 118 78" fill={C.marigold} />
      <g className="float">
        <ellipse cx="196" cy="150" rx="24" ry="9" fill={C.marigold} />
        <ellipse cx="196" cy="138" rx="24" ry="9" fill={C.marigold} />
        <ellipse cx="196" cy="126" rx="24" ry="9" fill={C.marigoldSoft} />
        <text x="196" y="131" textAnchor="middle" fontSize="12" fontWeight="900" fill={C.ink} stroke="none">
          +5
        </text>
      </g>
      <path d="M26 176 h188" strokeOpacity="0.25" />
    </Svg>
  )
}

/** Small scene illustrations for feature cards. */
export function SpotIllustration({ kind, className }: { kind: "roadmap" | "nsqf" | "lessons" | "progress" | "jobs" | "guidance"; className?: string }) {
  switch (kind) {
    case "roadmap":
      return (
        <Svg viewBox="0 0 160 100" className={className}>
          <path className="march" d="M18 78 C 50 78, 46 30, 80 30 S 112 70, 142 24" stroke={C.ink} strokeOpacity="0.25" strokeWidth="3" strokeDasharray="2 8" fill="none" strokeLinecap="round" />
          <circle cx="18" cy="78" r="11" fill={C.leaf} />
          <circle cx="80" cy="30" r="11" fill={C.lagoon} />
          <circle cx="112" cy="58" r="9" fill={C.marigold} />
          <g className="float">
            <path d="M142 26 c-9 0 -14 -6 -14 -13 a14 14 0 0 1 28 0 c0 7 -5 13 -14 13z" fill={C.coral} />
            <circle cx="142" cy="12" r="5" fill={C.white} />
          </g>
        </Svg>
      )
    case "nsqf":
      return (
        <Svg viewBox="0 0 160 100" className={className}>
          {[C.lagoon, C.leaf, C.marigold, C.coral].map((fill, i) => (
            <rect key={i} x={20 + i * 30} y={80 - (20 + i * 16)} width="28" height={20 + i * 16} rx="6" fill={fill} />
          ))}
          <rect x="133" y="10" width="3.5" height="34" rx="1.75" fill={C.ink} />
          <path className="float" d="M136.5 11 l18 6 -18 6z" fill={C.brand} />
        </Svg>
      )
    case "lessons":
      return (
        <Svg viewBox="0 0 160 100" className={className}>
          <rect x="24" y="14" width="96" height="74" rx="12" fill={C.white} stroke={C.ink} strokeOpacity="0.1" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle cx="44" cy={34 + i * 20} r="7" fill={i < 2 ? C.leaf : C.muted} />
              <rect x="58" y={30 + i * 20} width={48 - i * 10} height="8" rx="4" fill={C.ink} opacity={i < 2 ? 0.6 : 0.2} />
            </g>
          ))}
          <g className="float">
            <circle cx="126" cy="26" r="18" fill={C.marigold} />
            <text stroke="none" x="126" y="32" textAnchor="middle" fontSize="17" fontWeight="800" fill={C.ink}>
              ?
            </text>
          </g>
        </Svg>
      )
    case "progress":
      return (
        <Svg viewBox="0 0 160 100" className={className}>
          <rect x="22" y="58" width="22" height="30" rx="6" fill={C.lagoonSoft} />
          <rect x="52" y="42" width="22" height="46" rx="6" fill={C.lagoon} />
          <rect x="82" y="26" width="22" height="62" rx="6" fill={C.brand} />
          <g className="float">
            <circle cx="132" cy="34" r="18" fill={C.marigold} />
            <path d="M132 23 l3.5 7.2 7.9 1.1 -5.7 5.6 1.4 7.9 -7.1 -3.7 -7.1 3.7 1.4 -7.9 -5.7 -5.6 7.9 -1.1z" fill={C.white} />
          </g>
        </Svg>
      )
    case "jobs":
      return (
        <Svg viewBox="0 0 160 100" className={className}>
          <rect x="62" y="16" width="36" height="16" rx="6" fill="none" stroke={C.ink} strokeWidth="5" />
          <rect x="30" y="28" width="100" height="62" rx="12" fill={C.coral} />
          <rect x="72" y="50" width="16" height="16" rx="4" fill={C.white} />
          <g className="float">
            <circle cx="132" cy="24" r="14" fill={C.leaf} />
            <path d="M126 24 l4 4 l8 -9" stroke={C.white} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </Svg>
      )
    case "guidance":
      return (
        <Svg viewBox="0 0 160 100" className={className}>
          <rect x="18" y="18" width="80" height="44" rx="16" fill={C.brand} />
          <path d="M34 60 l-4 16 16 -14z" fill={C.brand} />
          <rect x="32" y="32" width="50" height="7" rx="3.5" fill={C.white} opacity="0.85" />
          <rect x="32" y="45" width="34" height="7" rx="3.5" fill={C.white} opacity="0.5" stroke="none" />
          <g className="float-delayed">
            <rect x="70" y="52" width="74" height="36" rx="14" fill={C.marigoldSoft} />
            <circle cx="92" cy="70" r="4" fill={C.marigold} />
            <circle cx="107" cy="70" r="4" fill={C.marigold} />
            <circle cx="122" cy="70" r="4" fill={C.marigold} />
          </g>
        </Svg>
      )
  }
}
