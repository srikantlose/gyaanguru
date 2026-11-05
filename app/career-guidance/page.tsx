import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CareerGuidanceChat } from "@/components/career-guidance-chat"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CareerPathSimulator } from "@/components/career-path-simulator"
import { ResumeMatcher } from "@/components/resume-matcher"
import { MicroCredentialBadges } from "@/components/micro-credential-badges"
import { NsqfRoadmap } from "@/components/nsqf-roadmap"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default async function CareerGuidancePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-background to-purple-50/30">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-2">
              Career Guidance
            </h1>
            <p className="text-muted-foreground text-lg">
              Tools for learners, trainers, and policymakers: RAG Chatbot, Career Path Simulator, NSQF Progress Tracker,
              Micro-credential Badges, and an AI-Powered Resume Matcher.
            </p>
          </div>

          <Tabs defaultValue="rag-chatbot" className="mb-10">
            <TabsList className="bg-purple-100/50 dark:bg-purple-950/30">
              <TabsTrigger
                value="rag-chatbot"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                RAG Chatbot
              </TabsTrigger>
              <TabsTrigger
                value="simulator"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                Career Path Simulator
              </TabsTrigger>
              <TabsTrigger value="nsqf" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                NSQF Progress Tracker
              </TabsTrigger>
              <TabsTrigger value="badges" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                Micro-credential Badges
              </TabsTrigger>
              <TabsTrigger value="resume" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                AI-Powered Resume Matcher
              </TabsTrigger>
            </TabsList>
            <TabsContent value="rag-chatbot">
              <CareerGuidanceChat />
            </TabsContent>
            <TabsContent value="simulator" className="pt-6">
              <Card id="career-path-simulator" className="border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="text-purple-700 dark:text-purple-300">Career Path Simulator</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Compare &quot;Course A vs Course B&quot; to preview likely career outcomes and salary trend.
                  </p>
                  <CareerPathSimulator />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="nsqf" className="pt-6">
              <Card id="nsqf-progress" className="border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="text-purple-700 dark:text-purple-300">NSQF Progress Tracker</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    See how close you are to the next NSQF level with an interactive ladder.
                  </p>
                  <NsqfRoadmap
                    initialNodes={[
                      {
                        nsqfLevel: 4,
                        course: "Intro to Data Analysis",
                        jobRole: "Junior Data Analyst",
                        qualification: "Certificate",
                      },
                      {
                        nsqfLevel: 5,
                        course: "Applied Machine Learning",
                        jobRole: "Data Analyst",
                        qualification: "Diploma",
                      },
                      {
                        nsqfLevel: 6,
                        course: "Advanced ML Systems",
                        jobRole: "ML Engineer",
                        qualification: "Advanced Diploma",
                      },
                    ]}
                  />
                  <div className="text-xs text-muted-foreground">
                    Want a full generator? Visit the{" "}
                    <Link
                      href="/nsqf/demo"
                      className="underline underline-offset-2 text-purple-600 hover:text-purple-700"
                    >
                      NSQF Demo
                    </Link>
                    .
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="badges" className="pt-6">
              <Card id="micro-credential-badges" className="border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="text-purple-700 dark:text-purple-300">Micro-credential Badges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Earn verifiable badges when you complete skill clusters; link to your blockchain wallet.
                  </p>
                  <MicroCredentialBadges />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="resume" className="pt-6">
              <Card id="resume-matcher" className="border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="text-purple-700 dark:text-purple-300">AI-Powered Resume Matcher</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload your CV to see how well it matches trending roles. No data leaves your browser in this demo.
                  </p>
                  <ResumeMatcher />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
