import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ProfileForm from "@/components/profile-form"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-balance">Profile</CardTitle>
              <CardDescription>Review and edit your onboarding details anytime.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm initialData={(profile?.onboarding_data as any) || undefined} />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
