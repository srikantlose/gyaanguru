"use client"

import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell, FormError } from "@/components/auth-shell"

type Stage = "checking" | "ready" | "invalid"

/**
 * Landing page for Supabase's password-reset email link. The browser client signs the user in from
 * the link (PKCE code or token in the URL) automatically; we then let them set a new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("checking")
  const [linkError, setLinkError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let settled = false
    const markReady = () => {
      settled = true
      setStage("ready")
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) markReady()
    })

    // getSession waits for the client to finish reading the reset link from the URL.
    supabase.auth.getSession().then(({ data }) => {
      const params = new URLSearchParams(window.location.search + "&" + window.location.hash.replace(/^#/, ""))
      const description = params.get("error_description")
      if (description && !data.session) {
        settled = true
        setLinkError(description.replace(/\+/g, " "))
        setStage("invalid")
      } else if (data.session) {
        markReady()
      }
    })

    const timer = setTimeout(() => {
      if (!settled) setStage("invalid")
    }, 6000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) return setError("Password must be at least 6 characters")
    if (password !== confirmPassword) return setError("Passwords do not match")

    setIsLoading(true)
    try {
      const { error } = await createClient().auth.updateUser({ password })
      if (error) throw error
      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't update your password. Please try again.")
      setIsLoading(false)
    }
  }

  if (stage === "invalid") {
    return (
      <AuthShell
        title="Link expired"
        description={linkError ?? "This reset link is invalid or has expired. Links only work once and for a limited time."}
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/auth/forgot-password">Send a new reset link</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      description={stage === "checking" ? "Checking your reset link…" : "Enter a new password for your account."}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={stage !== "ready" || isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={stage !== "ready" || isLoading}
          />
        </div>
        {error && <FormError>{error}</FormError>}
        <Button type="submit" size="lg" className="w-full" disabled={stage !== "ready" || isLoading}>
          {isLoading ? "Saving..." : "Update password"}
        </Button>
      </form>
    </AuthShell>
  )
}
