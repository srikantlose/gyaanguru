import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MailIllustration } from "@/components/illustrations"

export default function SignUpSuccessPage() {
  return (
    <main className="container mx-auto px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-md rounded-[2rem] border-2 border-ink bg-card p-8 text-center shadow-lift sm:p-10 rise-in">
        <MailIllustration className="mx-auto w-52" />
        <h1 className="mt-6 text-3xl font-extrabold text-ink">Check your email</h1>
        <p className="mt-3 text-muted-foreground">We&apos;ve sent you a confirmation link to verify your account</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Click the link to activate your account, then sign in to build your first roadmap.
        </p>
        <Button asChild size="lg" className="mt-8 w-full">
          <Link href="/auth/login">Back to login</Link>
        </Button>
      </div>
    </main>
  )
}
