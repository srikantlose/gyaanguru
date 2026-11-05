"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type IndiaOutcome = {
  nsqfLevel: number
  jobRole: string
  entryLPA: number
  fiveYearLPA: number
  demand: "High" | "Medium" | "Low"
  ssc: string
  cities: string[]
  progression: string
}

function detectDomain(base: string) {
  if (/(data|analytics|ml|ai)/i.test(base)) return "data"
  if (/(full[-\s]?stack|web|frontend|backend|dev|software)/i.test(base)) return "fullstack"
  if (/(marketing|growth|seo|sem|ads|content)/i.test(base)) return "marketing"
  if (/(design|ux|ui|product design)/i.test(base)) return "design"
  return "general"
}

const DOMAIN: Record<"data" | "fullstack" | "marketing" | "design" | "general", IndiaOutcome> = {
  data: {
    nsqfLevel: 6,
    jobRole: "Data Analyst",
    entryLPA: 4.5,
    fiveYearLPA: 12,
    demand: "High",
    ssc: "IT-ITeS SSC (NASSCOM)",
    cities: ["Bengaluru", "Hyderabad", "Pune", "Gurugram"],
    progression: "Data Analyst → Senior Analyst → Analytics Manager",
  },
  fullstack: {
    nsqfLevel: 6,
    jobRole: "Full-Stack Developer",
    entryLPA: 4,
    fiveYearLPA: 10,
    demand: "High",
    ssc: "IT-ITeS SSC (NASSCOM)",
    cities: ["Bengaluru", "Hyderabad", "Pune", "Noida"],
    progression: "Jr. Developer → Sr. Developer → Tech Lead",
  },
  marketing: {
    nsqfLevel: 5,
    jobRole: "Growth/Digital Marketer",
    entryLPA: 3.5,
    fiveYearLPA: 8,
    demand: "Medium",
    ssc: "MEPSC (Management & Entrepreneurship)",
    cities: ["Mumbai", "Bengaluru", "Gurugram", "Pune"],
    progression: "Associate → Specialist → Growth Manager",
  },
  design: {
    nsqfLevel: 5,
    jobRole: "UI/UX Designer",
    entryLPA: 3.8,
    fiveYearLPA: 9,
    demand: "Medium",
    ssc: "Media & Entertainment SSC",
    cities: ["Bengaluru", "Mumbai", "Hyderabad", "Pune"],
    progression: "Junior Designer → UX Designer → Product Designer",
  },
  general: {
    nsqfLevel: 5,
    jobRole: "Associate",
    entryLPA: 3,
    fiveYearLPA: 6,
    demand: "Medium",
    ssc: "Relevant SSC (role-dependent)",
    cities: ["Bengaluru", "Hyderabad", "Pune"],
    progression: "Associate → Executive → Senior Executive",
  },
}

function simulateIndia(course: string): IndiaOutcome {
  const domain = detectDomain(course)
  // deterministic slight jitter for variety (±0.3 LPA) but stable per input
  const hash = [...course.trim().toLowerCase()].reduce((a, c) => a + c.charCodeAt(0), 0)
  const jitter = ((hash % 7) - 3) * 0.1 // -0.3..+0.3
  const base = DOMAIN[domain]
  return {
    ...base,
    entryLPA: Math.max(2.5, +(base.entryLPA + jitter).toFixed(1)),
    fiveYearLPA: Math.max(base.entryLPA + 1.0, +(base.fiveYearLPA + jitter).toFixed(1)),
  }
}

export function CareerPathSimulator() {
  const [courseA, setCourseA] = useState("")
  const [courseB, setCourseB] = useState("")
  const [result, setResult] = useState<{ aName: string; bName: string; a: IndiaOutcome; b: IndiaOutcome } | null>(null)

  const onCompare = () => {
    const a = simulateIndia(courseA)
    const b = simulateIndia(courseB)
    setResult({ aName: courseA.trim(), bName: courseB.trim(), a, b })
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Input
          placeholder="Course A (e.g., 'Data Analytics Bootcamp')"
          value={courseA}
          onChange={(e) => setCourseA(e.target.value)}
        />
        <Input
          placeholder="Course B (e.g., 'Full-Stack Web Development')"
          value={courseB}
          onChange={(e) => setCourseB(e.target.value)}
        />
        <Button onClick={onCompare} disabled={!courseA.trim() || !courseB.trim()}>
          Compare
        </Button>
      </div>

      {result ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric (India)</TableHead>
              <TableHead>Course A {result.aName ? `– ${result.aName}` : ""}</TableHead>
              <TableHead>Course B {result.bName ? `– ${result.bName}` : ""}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>NSQF Level</TableCell>
              <TableCell>{result.a.nsqfLevel}</TableCell>
              <TableCell>{result.b.nsqfLevel}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Typical Job Role</TableCell>
              <TableCell>{result.a.jobRole}</TableCell>
              <TableCell>{result.b.jobRole}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Entry Salary (₹ LPA)</TableCell>
              <TableCell>{result.a.entryLPA}</TableCell>
              <TableCell>{result.b.entryLPA}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>5-Year Salary (₹ LPA)</TableCell>
              <TableCell>{result.a.fiveYearLPA}</TableCell>
              <TableCell>{result.b.fiveYearLPA}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Demand Trend (India)</TableCell>
              <TableCell>{result.a.demand}</TableCell>
              <TableCell>{result.b.demand}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Sector Skill Council (SSC)</TableCell>
              <TableCell>{result.a.ssc}</TableCell>
              <TableCell>{result.b.ssc}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Top Cities</TableCell>
              <TableCell>{result.a.cities.join(", ")}</TableCell>
              <TableCell>{result.b.cities.join(", ")}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Progression Path</TableCell>
              <TableCell>{result.a.progression}</TableCell>
              <TableCell>{result.b.progression}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ) : null}
    </div>
  )
}
