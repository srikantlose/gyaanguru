import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { StudyIllustration } from "@/components/illustrations"
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
    <main className="container mx-auto px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Profile"
          tone="brand"
          title={profile?.full_name ? `${profile.full_name}'s profile` : "Your profile"}
          description="Review and edit your onboarding details anytime. Changes save automatically."
          art={<StudyIllustration />}
        />
        <ProfileForm initialData={(profile?.onboarding_data as any) || undefined} />
      </div>
    </main>
  )
}
