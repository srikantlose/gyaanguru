import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { CareerGuidanceChat } from "@/components/career-guidance-chat"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CareerPathSimulator } from "@/components/career-path-simulator"
import { ResumeMatcher } from "@/components/resume-matcher"
import { MicroCredentialBadges } from "@/components/micro-credential-badges"
import { NsqfRoadmap } from "@/components/nsqf-roadmap"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { ChatIllustration } from "@/components/illustrations"
import { loadLearner } from "@/lib/learner"
import { computeAchievements } from "@/lib/achievements"
import { buildRoadmap } from "@/lib/nsqf-path"

export default async function CareerGuidancePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const learner = await loadLearner(supabase, user.id)
  const achievements = computeAchievements(learner)
  const o = learner.onboarding
  const goal = learner.goals.targetRole || learner.goals.shortTerm || learner.roadmaps[0]?.title || "career growth"
  const path = await buildRoadmap({
    education: o.academicBackground?.highestQualification || "",
    skills: o.priorSkills?.skills || "",
    goal,
  })
  const nodes = path.path.map((p) => ({
    nsqfLevel: p.nsqfLevel,
    course: p.course,
    jobRole: p.jobRole,
    qualification: p.qualification,
    alternatives: p.alternatives,
  }))
  const startLevel = learner.currentLevel ?? path.learner.startLevel

  return (
    <main>
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <PageHeader
            eyebrow="Career guidance"
            tone="leaf"
            title="Career Guidance"
            description="Ask questions, compare career paths, track your NSQF level, collect badges and check your resume against roles."
            art={<ChatIllustration />}
          />

          <Tabs defaultValue="rag-chatbot" className="mb-10">
            <TabsList className="mb-2">
              <TabsTrigger value="rag-chatbot">Career Chat</TabsTrigger>
              <TabsTrigger value="simulator">Career Path Simulator</TabsTrigger>
              <TabsTrigger value="nsqf">NSQF Progress Tracker</TabsTrigger>
              <TabsTrigger value="badges">Badges</TabsTrigger>
              <TabsTrigger value="resume">Resume Matcher</TabsTrigger>
            </TabsList>

            <TabsContent value="rag-chatbot">
              <CareerGuidanceChat />
            </TabsContent>

            <TabsContent value="simulator" className="pt-6">
              <Card id="career-path-simulator">
                <CardHeader>
                  <CardTitle className="text-xl">Career Path Simulator</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Compare two courses or careers: typical roles, salary ranges in India, demand and time to job-ready.
                  </p>
                </CardHeader>
                <CardContent>
                  <CareerPathSimulator />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nsqf" className="pt-6">
              <Card id="nsqf-progress">
                <CardHeader>
                  <CardTitle className="text-xl">NSQF Progress Tracker</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Your path toward &ldquo;{goal}&rdquo;, based on your onboarding answers. Complete the current course to
                    move up a level.
                    {!learner.onboarded && (
                      <>
                        {" "}
                        <Link href="/onboarding" className="font-semibold text-primary underline underline-offset-4">
                          Finish onboarding
                        </Link>{" "}
                        for a more accurate path.
                      </>
                    )}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <NsqfRoadmap initialNodes={nodes} learner={{ startLevel }} />
                  <p className="text-xs text-muted-foreground">
                    Want an AI-generated pathway? Try the{" "}
                    <Link href="/nsqf/demo" className="font-semibold text-primary underline underline-offset-4">
                      NSQF pathway builder
                    </Link>
                    .
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="badges" className="pt-6">
              <Card id="micro-credential-badges">
                <CardHeader>
                  <CardTitle className="text-xl">Badges</CardTitle>
                  <p className="text-sm text-muted-foreground">Earned from your real activity on GyaanGuru.</p>
                </CardHeader>
                <CardContent>
                  <MicroCredentialBadges achievements={achievements} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resume" className="pt-6">
              <Card id="resume-matcher">
                <CardHeader>
                  <CardTitle className="text-xl">Resume Matcher</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Get a match score for a role, what you&apos;re strong at, what to add, and courses to close the gap.
                  </p>
                </CardHeader>
                <CardContent>
                  <ResumeMatcher defaultRole={learner.goals.targetRole} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
