"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { Briefcase, Compass, Layers, LayoutDashboard, Menu, Route } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "@/components/logo"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const memberLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tone: "text-brand-ink" },
  { href: "/generate", label: "Generate", icon: Route, tone: "text-coral-ink" },
  { href: "/jobs", label: "Jobs", icon: Briefcase, tone: "text-lagoon-ink" },
  { href: "/career-guidance", label: "Career Guidance", icon: Compass, tone: "text-leaf-ink" },
  { href: "/nsqf/demo", label: "NSQF Demo", icon: Layers, tone: "text-marigold-ink" },
]

const guestLinks = [
  { href: "/nsqf/demo", label: "NSQF Demo", icon: Layers, tone: "text-marigold-ink" },
  { href: "/jobs", label: "Jobs", icon: Briefcase, tone: "text-lagoon-ink" },
]

export function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    setMenuOpen(false)
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const links = user ? memberLinks : guestLinks
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-paper/90 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Logo />

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {links.map(({ href, label, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "group flex items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-all",
                isActive(href) ? "border-ink bg-marigold text-ink shadow-soft" : "border-transparent text-ink/80 hover:border-ink hover:bg-card hover:text-ink",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-transform group-hover:-rotate-6 group-hover:scale-110",
                  isActive(href) ? "text-ink" : tone,
                )}
              />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <Button variant="outline" onClick={handleSignOut} className="rounded-full">
                Sign out
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="rounded-full">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button asChild className="rounded-full">
                  <Link href="/auth/sign-up">Get started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile / tablet menu */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="ruled w-[85vw] max-w-sm border-l-2 border-ink bg-paper p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="border-b-2 border-ink bg-paper px-5 py-4">
                <Logo />
              </div>
              <nav className="flex flex-col gap-1 p-3" aria-label="Mobile">
                {links.map(({ href, label, icon: Icon, tone }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-base font-bold",
                      isActive(href) ? "border-ink bg-marigold shadow-soft" : "border-transparent hover:border-ink hover:bg-card",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        "border-2 border-ink bg-card",
                      )}
                    >
                      <Icon className={cn("h-5 w-5", tone)} />
                    </span>
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3 border-t-2 border-ink bg-paper p-4">
                {user ? (
                  <Button variant="outline" onClick={handleSignOut}>
                    Sign out
                  </Button>
                ) : (
                  <>
                    <Button asChild>
                      <Link href="/auth/sign-up" onClick={() => setMenuOpen(false)}>
                        Get started
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/auth/login" onClick={() => setMenuOpen(false)}>
                        Sign in
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
