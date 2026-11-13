import Link from "next/link"
import { LogoMark } from "@/components/logo"

const columns = [
  {
    title: "Learn",
    links: [
      { href: "/generate", label: "Build a roadmap" },
      { href: "/dashboard", label: "My dashboard" },
      { href: "/ai-mentor", label: "AI mentor" },
    ],
  },
  {
    title: "Grow",
    links: [
      { href: "/career-guidance", label: "Career guidance" },
      { href: "/nsqf/demo", label: "NSQF pathways" },
      { href: "/jobs", label: "Live jobs" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink text-white/80 print:hidden">
      {/* color strip */}
      <div className="flex h-1.5" aria-hidden>
        <span className="flex-1 bg-brand" />
        <span className="flex-1 bg-marigold" />
        <span className="flex-1 bg-coral" />
        <span className="flex-1 bg-lagoon" />
        <span className="flex-1 bg-leaf" />
      </div>
      <div className="container mx-auto grid gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-xl font-extrabold text-white">
              Gyaan<span className="text-marigold">Guru</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Personal learning roadmaps for Bharat&apos;s learners, mapped to NSQF levels and linked to real jobs.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-marigold">{col.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-white hover:underline underline-offset-4">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container mx-auto flex flex-col gap-2 px-4 py-5 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} GyaanGuru · MIT License</p>
          <p>Aligned with NCVET · NSQF · Skill India</p>
        </div>
      </div>
    </footer>
  )
}
