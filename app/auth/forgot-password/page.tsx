"use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell, FormError } from "@/components/auth-shell"
import { MailIllustration } from "@/components/illustrations"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      // Supabase doesn't reveal whether the address has an account, so neither do we.
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't send the reset email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        description={`If an account exists for ${email}, we've sent a link to reset your password.`}
        footer={
          <Link href="/auth/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Back to login
          </Link>
        }
      >
        <MailIllustration className="mx-auto w-44" />
        <p className="mt-6 text-sm text-ink/70">
          The link opens a page where you choose a new password. Didn&apos;t get it after a few minutes? Check your spam
          folder, or{" "}
          <button type="button" onClick={() => setSent(false)} className="font-semibold text-primary underline underline-offset-4">
            try again
          </button>
          .
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Forgot password?"
      description="Enter the email you signed up with and we'll send you a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/auth/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Back to login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>
        {error && <FormError>{error}</FormError>}
        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  )
}
