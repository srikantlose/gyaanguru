import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

// Refreshes the Supabase session cookie on every request. It never redirects: pages and API routes
// do their own auth checks.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
