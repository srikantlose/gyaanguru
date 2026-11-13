import type React from "react"
import { cn } from "@/lib/utils"

/*
 * Renders the small Markdown subset that chat models produce (bold, italics, inline code,
 * bullet/numbered lists, headings, paragraphs) as React elements. No HTML is injected.
 */

// Underscore emphasis only counts at word edges, as in CommonMark, so snake_case_names stay intact.
const INLINE = /(\*\*[^*]+\*\*|(?<!\w)__[^_]+__(?!\w)|`[^`]+`|\*[^*\s][^*]*\*|(?<!\w)_[^_\s][^_]*_(?!\w))/g

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (/^(\*\*|__).+\1$/.test(part)) return <strong key={key} className="font-bold text-ink">{part.slice(2, -2)}</strong>
    if (/^`.+`$/.test(part)) return <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>
    if (/^([*_]).+\1$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>
    return part
  })
}

type Block =
  | { type: "p"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "h"; text: string }

function parse(text: string): Block[] {
  const blocks: Block[] = []
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd()
    const last = blocks[blocks.length - 1]
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/)
    if (!line.trim()) {
      blocks.push({ type: "p", lines: [] })
    } else if (bullet) {
      if (last?.type === "ul") last.items.push(bullet[1])
      else blocks.push({ type: "ul", items: [bullet[1]] })
    } else if (numbered) {
      if (last?.type === "ol") last.items.push(numbered[1])
      else blocks.push({ type: "ol", items: [numbered[1]] })
    } else if (heading) {
      blocks.push({ type: "h", text: heading[1] })
    } else if (last?.type === "p") {
      last.lines.push(line)
    } else {
      blocks.push({ type: "p", lines: [line] })
    }
  }
  return blocks.filter((b) => b.type !== "p" || b.lines.length > 0)
}

export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {parse(text).map((block, bi) => {
        const k = `b${bi}`
        if (block.type === "h") return <p key={k} className="font-display font-extrabold text-ink">{renderInline(block.text, k)}</p>
        if (block.type === "ul" || block.type === "ol") {
          const List = block.type
          return (
            <List key={k} className={cn("space-y-1 pl-5", List === "ul" ? "list-disc" : "list-decimal")}>
              {block.items.map((item, ii) => (
                <li key={ii}>{renderInline(item, `${k}-${ii}`)}</li>
              ))}
            </List>
          )
        }
        return (
          <p key={k}>
            {block.lines.map((line, li) => (
              <span key={li}>
                {li > 0 && <br />}
                {renderInline(line, `${k}-${li}`)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
