import "server-only"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/*
 * Supabase client with the project's secret key (service_role). It bypasses row-level security,
 * so it is only for server code that has already checked who the user is. Used to store quizzes
 * (with their answers) where learners can't read or write them, and to pay for passed quizzes.
 * Never import this from a client component, and never expose SUPABASE_SECRET_KEY to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY?.trim()
  if (!url || !key) return null
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export const ADMIN_MISSING_MESSAGE =
  "Quizzes can't be checked yet: the server needs SUPABASE_SECRET_KEY in .env.local. Ask the site owner to add it."
