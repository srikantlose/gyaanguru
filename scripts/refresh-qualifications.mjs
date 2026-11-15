#!/usr/bin/env node
// Re-reads every qualification in data/qualifications.json from its National Qualifications
// Register page, so the catalogue never drifts from nqr.gov.in and nothing is typed from memory.
//
//   npm run refresh:qualifications                      dry run: report changes, expiries, coverage
//   npm run refresh:qualifications -- --write           also rewrite the file (checkedOn = today)
//   npm run refresh:qualifications -- --add 14734:infra --write
//                                                       add a qualification (NQR page id : track[,track])
//   npm run refresh:qualifications -- --remove nqr-2689 --write
//   npm run refresh:qualifications -- --discover        list current IT-ITeS and Media & Entertainment
//                                                       qualifications at levels 2.5-6 not in the file
//
// Track definitions and each entry's tracks are kept from the existing file. Units are classed
// "core" unless they're employability skills, OJT/project, an introduction or a generic workplace
// unit, the same rules the catalogue was built with.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const FILE = path.join(ROOT, "data", "qualifications.json")
const NQR = "https://www.nqr.gov.in"
const SECTORS = { "IT-ITeS": 20, "Media & Entertainment": 26 }
const WARN_DAYS = 120
const NON_CORE_CODES = new Set(["Intro", "OJT", "MES/N0104", "SSC/N9014"])

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const values = (name) => args.flatMap((a, i) => (a === name && args[i + 1] ? [args[i + 1]] : []))
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
const addDays = (key, n) => new Date(Date.parse(`${key}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---- parsing the NQR page ------------------------------------------------------------------
const decode = (s) =>
  s
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&ndash;/g, "–").replace(/&rsquo;/g, "’")
    .replace(/\s+/g, " ").trim()
const stripTags = (html) => decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
const lines = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, "\n").replace(/<style[\s\S]*?<\/style>/gi, "\n").replace(/<[^>]+>/g, "\n").split("\n").map(decode).filter(Boolean)

function tables(html) {
  return [...html.matchAll(/<table([^>]*)>([\s\S]*?)<\/table>/gi)].map((m) => ({
    attrs: m[1],
    rows: [...m[2].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((r) => [...r[1].matchAll(/<t([hd])[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => ({ th: c[1] === "h", v: stripTags(c[2]) })))
      .filter((r) => r.length),
  }))
}

const after = (ls, label) => {
  const i = ls.findIndex((l) => l === label || l === `${label}:`)
  return i >= 0 ? ls[i + 1] : null
}
const num = (s) => (s == null ? null : Number(String(s).replace(/[^0-9.]/g, "")) || null)
const date = (s) => {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s || "")
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}
const cleanCode = (c) => c.replace(/\s*&\s*version.*$/i, "").replace(/\s+/g, "").trim()
const cleanTitle = (t) =>
  t.replace(/ﬁ/g, "fi").replace(/ﬂ/g, "fl").replace(/^NOS\s*\d+\s*:\s*/i, "").replace(/\b(.{12,}?)\s+\1\b/g, "$1").replace(/\s+/g, " ").trim()
const titleCase = (t) => (t === t.toUpperCase() ? t.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, p, c) => p + c.toUpperCase()) : t)

function parse(nqrId, html) {
  const ls = lines(html)
  const qi = ls.indexOf("Qualifications Search")
  const ci = ls.findIndex((l) => l.startsWith("NQR Code:"))
  const code = ci < 0 ? null : ls[ci].trim() === "NQR Code:" ? ls[ci + 1] : ls[ci].replace("NQR Code:", "").trim()
  const tbs = tables(html)
  const elg = tbs.find((t) => /elg/.test(t.attrs))
  const nosT = tbs.find((t) => t.rows.some((r) => r.some((c) => /NOS Code/i.test(c.v))))
  const li = ls.findIndex((l, i) => l === "Level" && ls[i - 2] === "Sector")
  const maxHours = ls.find((l) => /^Maximum\s*:/.test(l))
  const file = (/href="(https?:\/\/(?:www\.)?nqr\.gov\.in\/qualification\/file\/[^"]+\.pdf)"/i.exec(html) || [])[1] || null
  const units = (nosT?.rows ?? [])
    .filter((r) => !r.some((c) => /NOS Code/i.test(c.v)) && r.length >= 4)
    .filter((r) => !/^(SubA|SubB|TotalAB)$/i.test(r[1].v) && !/^(sub ?total|total)/i.test(r[0].v))
    .map((r) => {
      const unitCode = cleanCode(r[1].v || "")
      const title = cleanTitle(r[0].v)
      const nonCore =
        NON_CORE_CODES.has(unitCode) || /^DGT\/VSQ/i.test(unitCode) || /^MSME\/ES/i.test(unitCode) || /employab/i.test(title) ||
        /\bOJT\b|on[- ]the[- ]job/i.test(title) || !unitCode || unitCode === "-" || unitCode === "N/A"
      return { code: unitCode || "-", title, hours: num(r[3]?.v), mandatory: /mandatory/i.test(r[2]?.v || ""), core: !nonCore }
    })
  return {
    title: qi >= 0 ? titleCase(ls[qi + 1]) : null,
    code,
    level: li >= 0 ? num(ls[li + 1]) : null,
    sector: after(ls, "Sector"),
    awardingBody: after(ls, "Awarding Bodies"),
    certifyingBody: after(ls, "Certifying Bodies"),
    occupation: after(ls, "Proposed Occupation"),
    notionalHours: maxHours ? num(maxHours) : null,
    approvedOn: date(after(ls, "Originally Approved")),
    validTill: date(after(ls, "Valid Till")),
    eligibility: (elg?.rows ?? []).filter((r) => !r[0].th).map((r) => ({ criteria: [r[0]?.v, r[1]?.v].filter(Boolean).join(" "), experience: r[2]?.v || "" })),
    units,
    url: `${NQR}/qualifications/${nqrId}`,
    fileUrl: file ? file.replace(/&amp;/g, "&").replace("://nqr.", "://www.nqr.") : null,
  }
}

async function fetchPage(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (GyaanGuru catalogue refresh)" } })
      if (res.ok) return await res.text()
    } catch {
      // network hiccup: retry below
    }
    await sleep(1500)
  }
  throw new Error(`Couldn't load ${url}`)
}

async function read(nqrId) {
  const q = parse(nqrId, await fetchPage(`${NQR}/qualifications/${nqrId}`))
  if (!q.title || !q.code || !q.level || !q.validTill || !q.units.some((u) => u.core)) throw new Error(`Page ${nqrId} didn't parse; has the NQR layout changed?`)
  return q
}

// ---- discover ------------------------------------------------------------------------------
async function discover(known) {
  for (const [sector, sid] of Object.entries(SECTORS)) {
    const html = await fetchPage(`${NQR}/qualifications-search/${sid}`)
    const block = /data-type="amit-2"[^>]*\s+value="([0-9,]+)/.exec(html)
    const ids = block ? block[1].split(",").map(Number) : []
    console.log(`\n${sector}: ${ids.length} qualifications on the register`)
    for (const id of ids) {
      if (known.has(`nqr-${id}`)) continue
      try {
        const q = parse(id, await fetchPage(`${NQR}/qualifications/${id}`))
        if (q.level >= 2.5 && q.level <= 6 && q.validTill >= today && q.units.filter((u) => u.core).length >= 2) {
          console.log(`  ${id}  L${q.level}  ${q.title}  (${q.awardingBody}, valid till ${q.validTill})`)
        }
      } catch {
        // skip pages that don't load
      }
      await sleep(250)
    }
  }
}

// ---- main ----------------------------------------------------------------------------------
const doc = JSON.parse(fs.readFileSync(FILE, "utf8"))
const trackIds = new Set(doc.tracks.map((t) => t.id))
let entries = doc.qualifications.map((q) => ({ id: q.id, tracks: q.tracks, old: q }))

for (const spec of values("--add")) {
  const [rawId, rawTracks] = spec.split(":")
  const id = `nqr-${rawId.replace(/^nqr-/, "")}`
  const tracks = (rawTracks || "").split(",").filter(Boolean)
  if (!/^nqr-\d+$/.test(id) || !tracks.length || tracks.some((t) => !trackIds.has(t))) {
    console.error(`--add ${spec}: use <NQR page id>:<track>[,<track>] with tracks from ${[...trackIds].join(", ")}`)
    process.exit(1)
  }
  if (!entries.some((e) => e.id === id)) entries.push({ id, tracks, old: null })
}
const removed = new Set(values("--remove").map((r) => `nqr-${r.replace(/^nqr-/, "")}`))
entries = entries.filter((e) => !removed.has(e.id))

if (flag("--discover")) {
  await discover(new Set(entries.map((e) => e.id)))
  process.exit(0)
}

const out = []
const report = []
for (const e of entries) {
  const nqrId = Number(e.id.slice(4))
  const q = { id: e.id, tracks: e.tracks, ...(await read(nqrId)) }
  out.push(q)
  if (!e.old) report.push(`+ added ${q.id} ${q.title} (L${q.level})`)
  else {
    for (const k of ["title", "code", "level", "awardingBody", "notionalHours", "validTill", "fileUrl"]) {
      if (JSON.stringify(e.old[k]) !== JSON.stringify(q[k])) report.push(`~ ${q.id} ${k}: ${JSON.stringify(e.old[k])} -> ${JSON.stringify(q[k])}`)
    }
    const units = (x) => x.units.map((u) => `${u.code}|${u.title}|${u.core}`).join("\n")
    if (units(e.old) !== units(q)) report.push(`~ ${q.id} units changed`)
  }
  if (q.validTill < today) report.push(`! ${q.id} ${q.title} EXPIRED on ${q.validTill} (hidden in the app)`)
  else if (q.validTill < addDays(today, WARN_DAYS)) report.push(`! ${q.id} ${q.title} expires on ${q.validTill}`)
  await sleep(250)
}
for (const id of removed) report.push(`- removed ${id}`)

const band = (level) => Math.max(3, Math.min(6, Math.ceil(level)))
for (const t of doc.tracks) {
  for (const when of [today, addDays(today, WARN_DAYS)]) {
    const bands = new Set(out.filter((q) => q.tracks.includes(t.id) && q.validTill >= when).map((q) => band(q.level)))
    const missing = [3, 4, 5, 6].filter((b) => !bands.has(b))
    if (missing.length) report.push(`! track ${t.id} has no current qualification at level ${missing.join(", ")} on ${when}`)
  }
}

out.sort((a, b) => a.tracks[0].localeCompare(b.tracks[0]) || a.level - b.level || a.title.localeCompare(b.title))
console.log(`${out.length} qualifications re-read from nqr.gov.in on ${today}`)
console.log(report.length ? report.join("\n") : "No changes, nothing expiring soon.")

if (flag("--write")) {
  fs.writeFileSync(FILE, `${JSON.stringify({ ...doc, checkedOn: today, qualifications: out }, null, 2)}\n`)
  console.log(`\nWrote ${path.relative(ROOT, FILE)}. Run npm run build to validate it.`)
} else {
  console.log("\nDry run. Add --write to update the file.")
}
