"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

export function Header() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-gradient-to-r from-purple-50 via-background to-purple-50 dark:from-purple-950/30 dark:via-background dark:to-purple-950/30 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent"
        >
          GyaanGuru
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" className="rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  Dashboard
                </Button>
              </Link>
              <Link href="/generate">
                <Button variant="ghost" className="rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  Generate
                </Button>
              </Link>
              <Link href="/jobs">
                <Button variant="ghost" className="rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  Jobs
                </Button>
              </Link>
              <Link href="/career-guidance">
                <Button variant="ghost" className="rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  Career Guidance
                </Button>
              </Link>
              <Link href="/nsqf/demo">
                <Button variant="ghost" className="rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  NSQF Demo
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="rounded-full bg-transparent border-purple-300 hover:bg-purple-100 dark:border-purple-700 dark:hover:bg-purple-900/30"
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" className="rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  Sign in
                </Button>
              </Link>
              <Link href="/nsqf/demo">
                <Button variant="ghost" className="rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  NSQF Demo
                </Button>
              </Link>
              <Link href="/jobs">
                <Button variant="ghost" className="rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  Jobs
                </Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button className="rounded-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
