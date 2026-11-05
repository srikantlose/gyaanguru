"use client"

import { useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type OnboardingForm = {
  academicBackground: {
    highestQualification: string
    stream: string
    yearOfPassing: string
    currentlyStudying: string
  }
  priorSkills: {
    skills: string
    certifications: string
  }
  socioEconomic: {
    location: string
    incomeBracket: string
    accessToDevices: string
    englishProficiency: string
  }
  learningPreferences: {
    mode: string
    hoursPerWeek: string
    pace: string
    preferredLanguage: string
  }
  aspirations: {
    shortTermGoal: string
    longTermGoal: string
    targetJobRole: string
  }
}

const EMPTY: OnboardingForm = {
  academicBackground: { highestQualification: "", stream: "", yearOfPassing: "", currentlyStudying: "" },
  priorSkills: { skills: "", certifications: "" },
  socioEconomic: { location: "", incomeBracket: "", accessToDevices: "", englishProficiency: "" },
  learningPreferences: { mode: "", hoursPerWeek: "", pace: "", preferredLanguage: "" },
  aspirations: { shortTermGoal: "", longTermGoal: "", targetJobRole: "" },
}

export default function ProfileForm({ initialData }: { initialData?: Partial<OnboardingForm> }) {
  const [form, setForm] = useState<OnboardingForm>(() => ({ ...EMPTY, ...(initialData || {}) }))
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle")
  const [needsMigration, setNeedsMigration] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = (payload: OnboardingForm) => {
    if (needsMigration) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving("saving")
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload), // editing profile uses same onboarding API without finalize
        })
        if (res.status === 412) {
          setNeedsMigration(true)
          throw new Error("schema not migrated")
        }
        if (!res.ok) throw new Error("save failed")
        setSaving("saved")
        setTimeout(() => setSaving("idle"), 800)
      } catch (e) {
        console.log("[v0] Profile save error:", e)
        setSaving("idle")
      }
    }, 500)
  }

  // Autosave from user edits only, so opening the profile page doesn't re-save unchanged data.
  const update = (path: string[], value: string) => {
    const next = structuredClone(form)
    let cursor: any = next
    for (let i = 0; i < path.length - 1; i++) cursor = cursor[path[i]]
    cursor[path[path.length - 1]] = value
    setForm(next)
    scheduleSave(next)
  }

  return (
    <div className="space-y-6">
      {needsMigration && (
        <Alert>
          <AlertTitle>Database migration required</AlertTitle>
          <AlertDescription>
            Missing columns on profiles. Please run scripts/005_fix_onboarding_schema.sql to proceed.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold">Onboarding Details</h2>
        <span className="text-sm text-muted-foreground">
          {saving === "saving" ? "Saving..." : saving === "saved" ? "Saved" : ""}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-balance">Academic Background</CardTitle>
          <CardDescription>Tell us about your education.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="highestQualification">Highest Qualification</Label>
            <Input
              id="highestQualification"
              value={form.academicBackground.highestQualification}
              onChange={(e) => update(["academicBackground", "highestQualification"], e.target.value)}
              placeholder="Class 12 / Diploma / Bachelor’s"
            />
          </div>
          <div>
            <Label htmlFor="stream">Stream</Label>
            <Input
              id="stream"
              value={form.academicBackground.stream}
              onChange={(e) => update(["academicBackground", "stream"], e.target.value)}
              placeholder="Science / Commerce / Arts / CS"
            />
          </div>
          <div>
            <Label htmlFor="yop">Year of Passing</Label>
            <Input
              id="yop"
              value={form.academicBackground.yearOfPassing}
              onChange={(e) => update(["academicBackground", "yearOfPassing"], e.target.value)}
              placeholder="2024"
            />
          </div>
          <div>
            <Label htmlFor="current">Currently Studying</Label>
            <Input
              id="current"
              value={form.academicBackground.currentlyStudying}
              onChange={(e) => update(["academicBackground", "currentlyStudying"], e.target.value)}
              placeholder="B.Tech 2nd year, etc."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prior Skills</CardTitle>
          <CardDescription>Existing skills or certifications.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="skills">Skills</Label>
            <Textarea
              id="skills"
              value={form.priorSkills.skills}
              onChange={(e) => update(["priorSkills", "skills"], e.target.value)}
              placeholder="e.g. Excel, HTML/CSS, Basic Python"
            />
          </div>
          <div>
            <Label htmlFor="certs">Certifications</Label>
            <Textarea
              id="certs"
              value={form.priorSkills.certifications}
              onChange={(e) => update(["priorSkills", "certifications"], e.target.value)}
              placeholder="e.g. NSDC certificate, Coursera course"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Socio-Economic</CardTitle>
          <CardDescription>Context that affects learning access.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={form.socioEconomic.location}
              onChange={(e) => update(["socioEconomic", "location"], e.target.value)}
              placeholder="City / District / State"
            />
          </div>
          <div>
            <Label htmlFor="income">Income Bracket</Label>
            <Input
              id="income"
              value={form.socioEconomic.incomeBracket}
              onChange={(e) => update(["socioEconomic", "incomeBracket"], e.target.value)}
              placeholder="e.g. < 3 LPA"
            />
          </div>
          <div>
            <Label htmlFor="devices">Access to Devices</Label>
            <Input
              id="devices"
              value={form.socioEconomic.accessToDevices}
              onChange={(e) => update(["socioEconomic", "accessToDevices"], e.target.value)}
              placeholder="Mobile only / Shared PC / Personal laptop"
            />
          </div>
          <div>
            <Label htmlFor="english">English Proficiency</Label>
            <Input
              id="english"
              value={form.socioEconomic.englishProficiency}
              onChange={(e) => update(["socioEconomic", "englishProficiency"], e.target.value)}
              placeholder="Basic / Intermediate / Advanced"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Learning Preferences</CardTitle>
          <CardDescription>How you prefer to learn.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="mode">Mode</Label>
            <Input
              id="mode"
              value={form.learningPreferences.mode}
              onChange={(e) => update(["learningPreferences", "mode"], e.target.value)}
              placeholder="Online / Offline / Hybrid"
            />
          </div>
          <div>
            <Label htmlFor="hours">Hours per week</Label>
            <Input
              id="hours"
              value={form.learningPreferences.hoursPerWeek}
              onChange={(e) => update(["learningPreferences", "hoursPerWeek"], e.target.value)}
              placeholder="e.g. 8"
            />
          </div>
          <div>
            <Label htmlFor="pace">Pace</Label>
            <Input
              id="pace"
              value={form.learningPreferences.pace}
              onChange={(e) => update(["learningPreferences", "pace"], e.target.value)}
              placeholder="Self-paced / Instructor-led"
            />
          </div>
          <div>
            <Label htmlFor="lang">Preferred Language</Label>
            <Input
              id="lang"
              value={form.learningPreferences.preferredLanguage}
              onChange={(e) => update(["learningPreferences", "preferredLanguage"], e.target.value)}
              placeholder="English / Hindi / ..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aspirations</CardTitle>
          <CardDescription>Your goals and target roles.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="short">Short-term Goal</Label>
            <Textarea
              id="short"
              value={form.aspirations.shortTermGoal}
              onChange={(e) => update(["aspirations", "shortTermGoal"], e.target.value)}
              placeholder="e.g. Get an internship in data entry within 3 months"
            />
          </div>
          <div>
            <Label htmlFor="long">Long-term Goal</Label>
            <Textarea
              id="long"
              value={form.aspirations.longTermGoal}
              onChange={(e) => update(["aspirations", "longTermGoal"], e.target.value)}
              placeholder="e.g. Move to operations supervisor role"
            />
          </div>
          <div>
            <Label htmlFor="role">Target Job Role</Label>
            <Input
              id="role"
              value={form.aspirations.targetJobRole}
              onChange={(e) => update(["aspirations", "targetJobRole"], e.target.value)}
              placeholder="e.g. Junior Engineer"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
