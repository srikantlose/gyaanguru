"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { SectionTitle } from "@/components/section-title"
import { PageHeader } from "@/components/page-header"
import { StudyIllustration } from "@/components/illustrations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
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

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [form, setForm] = useState<OnboardingForm>(EMPTY)
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle")
  const [needsMigration, setNeedsMigration] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load existing onboarding data for realtime editing
  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        if (profile?.onboarding_data) {
          setForm((prev) => ({ ...prev, ...profile.onboarding_data }))
        }
      } catch (e) {
        console.log("[v0] Failed loading onboarding_data:", e)
      }
    }
    load()
  }, [router, supabase])

  const scheduleSave = (payload: OnboardingForm) => {
    if (needsMigration) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving("saving")
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload), // autosave only onboarding_data, no finalize
        })
        if (res.status === 412) {
          setNeedsMigration(true)
          throw new Error("schema not migrated")
        }
        if (!res.ok) throw new Error("autosave failed")
        setSaving("saved")
        setTimeout(() => setSaving("idle"), 800)
      } catch (e) {
        console.log("[v0] Autosave error:", e)
        setSaving("idle")
      }
    }, 500)
  }

  // Autosave from user edits only. (Saving from an effect on `form` also fired on mount with the
  // empty form, which could overwrite saved answers if loading the profile took longer than 500ms.)
  const update = (path: string[], value: string) => {
    const next = structuredClone(form)
    let cursor: any = next
    for (let i = 0; i < path.length - 1; i++) cursor = cursor[path[i]]
    cursor[path[path.length - 1]] = value
    setForm(next)
    scheduleSave(next)
  }

  async function handleFinish() {
    try {
      setSaving("saving")
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingData: form, finalize: true }),
      })
      if (res.status === 412) {
        setNeedsMigration(true)
        throw new Error("schema not migrated")
      }
      if (!res.ok) throw new Error("finalize failed")
      router.push("/dashboard")
    } catch (err) {
      console.log("[v0] finalize error:", err)
      alert("We couldn't finish onboarding. Please run the migration and try again.")
      setSaving("idle")
    }
  }

  return (
    <main className="container mx-auto px-4 py-10 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        {needsMigration && (
          <Alert className="mb-4">
            <AlertTitle>Database migration required</AlertTitle>
            <AlertDescription>
              Missing columns on profiles. Please run the SQL script at scripts/schema.sql to
              proceed.
            </AlertDescription>
          </Alert>
        )}
        <PageHeader
          eyebrow="Getting started"
          tone="lagoon"
          title="Tell us about you"
          description="Five short sections. Everything saves as you type, and you can change it later from your profile."
          actions={
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-card px-3 py-1 text-sm font-bold text-ink shadow-soft">
              <span className={saving === "saving" ? "h-2 w-2 animate-pulse rounded-full bg-marigold" : "h-2 w-2 rounded-full bg-leaf"} />
              {saving === "saving" ? "Saving..." : saving === "saved" ? "Saved" : "Autosave on"}
            </span>
          }
          art={<StudyIllustration />}
        />

        <Card className="mb-6">
          <CardHeader>
            <SectionTitle n={1}>Academic Background</SectionTitle>
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

        <Card className="mb-6">
          <CardHeader>
            <SectionTitle n={2}>Prior Skills</SectionTitle>
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

        <Card className="mb-6">
          <CardHeader>
            <SectionTitle n={3}>Socio-Economic</SectionTitle>
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

        <Card className="mb-6">
          <CardHeader>
            <SectionTitle n={4}>Learning Preferences</SectionTitle>
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

        <Card className="mb-6">
          <CardHeader>
            <SectionTitle n={5}>Aspirations</SectionTitle>
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

        <div className="flex justify-end">
          <Button onClick={handleFinish} disabled={saving === "saving"}>
            {saving === "saving" ? "Saving..." : "Finish Onboarding"}
          </Button>
        </div>
      </div>
    </main>
  )
}
