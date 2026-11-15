"use client"

import { Check, ExternalLink, Landmark } from "lucide-react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  coreUnits,
  formatLevel,
  getQualification,
  isCurrent,
  listQualifications,
  listTracks,
  suggestQualifications,
  type Qualification,
} from "@/lib/qualifications"

type Props = {
  topic: string
  /** The learner's level band, to prefer qualifications near it. */
  band: number | null
  /** Today's YYYY-MM-DD key, from the server (no Date.now during render). */
  today: string
  value: string | null
  onChange: (q: Qualification | null) => void
}

const NONE = "none"

function Option({ q, selected, onSelect }: { q: Qualification; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border-2 border-ink px-3 py-2.5 text-left transition",
        selected ? "bg-brand-soft shadow-soft" : "bg-card hover:bg-paper",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink",
          selected ? "bg-brand" : "bg-card",
        )}
      >
        {selected && <Check className="h-3 w-3 text-ink" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-snug text-ink">{q.title}</span>
        <span className="mt-0.5 block text-xs text-ink/65">
          NSQF {formatLevel(q.level)} · {coreUnits(q).length} units · {q.awardingBody.replace(/\s*\(.*\)\s*$/, "")}
        </span>
      </span>
      <span className="shrink-0 rounded-full border-2 border-ink bg-marigold px-2 py-0.5 font-display text-xs font-black text-ink">
        L{formatLevel(q.level)}
      </span>
    </button>
  )
}

/** Optional "target a real NSQF qualification" choice for the roadmap generator. */
export function QualificationPicker({ topic, band, today, value, onChange }: Props) {
  const selected = getQualification(value)
  const suggestions = suggestQualifications({ topic, band, today })
  const shown = selected && !suggestions.some((s) => s.id === selected.id) ? [selected, ...suggestions.slice(0, 3)] : suggestions
  const tracks = listTracks()
  const current = listQualifications().filter((q) => isCurrent(q, today))

  return (
    <fieldset className="space-y-3 rounded-2xl border-2 border-ink bg-paper p-4">
      <legend className="flex items-center gap-2 px-1 font-display text-base font-extrabold text-ink">
        <Landmark className="h-4 w-4" />
        Target a real qualification <span className="text-sm font-semibold text-ink/55">(optional)</span>
      </legend>
      <p className="text-sm text-ink/70">
        Pick one and your roadmap gets one module per official unit of that NSQF qualification, plus the steps to take its real
        assessment. These come from the government&apos;s National Qualifications Register.
      </p>

      <div role="radiogroup" aria-label="Target qualification" className="space-y-2">
        <button
          type="button"
          role="radio"
          aria-checked={!selected}
          onClick={() => onChange(null)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border-2 border-ink px-3 py-2.5 text-left transition",
            !selected ? "bg-brand-soft shadow-soft" : "bg-card hover:bg-paper",
          )}
        >
          <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink", !selected ? "bg-brand" : "bg-card")}>
            {!selected && <Check className="h-3 w-3 text-ink" />}
          </span>
          <span className="min-w-0">
            <span className="block font-bold text-ink">No qualification, just this topic</span>
            <span className="block text-xs text-ink/65">The roadmap&apos;s NSQF level will be an estimate.</span>
          </span>
        </button>
        {shown.map((q) => (
          <Option key={q.id} q={q} selected={selected?.id === q.id} onSelect={() => onChange(q)} />
        ))}
        {topic.trim() && suggestions.length === 0 && (
          <p className="text-sm text-ink/60">No qualification in our list matches &ldquo;{topic.trim()}&rdquo;. Browse them all below.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="browse-qualifications" className="text-sm font-bold text-ink">
          Or browse all {current.length}
        </label>
        <Select value={selected?.id ?? NONE} onValueChange={(id) => onChange(id === NONE ? null : getQualification(id))}>
          <SelectTrigger id="browse-qualifications" className="w-full">
            <SelectValue placeholder="Choose a qualification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No qualification</SelectItem>
            {tracks.map((t) => (
              <SelectGroup key={t.id}>
                <SelectLabel>{t.name}</SelectLabel>
                {current
                  .filter((q) => q.tracks[0] === t.id)
                  .sort((a, b) => a.level - b.level)
                  .map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      L{formatLevel(q.level)} · {q.title}
                    </SelectItem>
                  ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <div className="rounded-xl border-2 border-ink bg-card p-3 text-sm shadow-soft">
          <p className="font-bold text-ink">{selected.title}</p>
          <p className="mt-0.5 text-ink/70">
            NSQF level {formatLevel(selected.level)} · NQR code <span className="font-mono text-xs">{selected.code}</span>
          </p>
          <p className="text-ink/70">Awarded by {selected.awardingBody}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-ink/80">
            {coreUnits(selected).map((u) => (
              <li key={u.code}>
                {u.title}
                {!u.mandatory && <span className="text-ink/55"> (optional unit)</span>}
              </li>
            ))}
          </ul>
          <a
            href={selected.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 font-bold text-primary underline-offset-2 hover:underline"
          >
            See it on the National Qualifications Register <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </fieldset>
  )
}
