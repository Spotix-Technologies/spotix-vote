/**
 * src/lib/election/auth-server.ts
 *
 * Server-side Supabase Auth client for "Spotix Vote" voter accounts —
 * this is the FIRST place this app uses the Supabase anon/publishable
 * key (everything else, including all of lib/election/db.ts, uses the
 * service-role key and never touches Auth).
 *
 * This is safe alongside the "anon key is hard-denied by RLS" design
 * documented in lib/supabase.ts: Supabase Auth (sign up / sign in /
 * session) is a separate subsystem from table access. No table in
 * /supabase/election-schema.sql has an RLS policy granting the `anon`
 * or `authenticated` role anything — a signed-in voter's session proves
 * WHO they are, but every actual read/write against election_* tables
 * still happens server-side through supabaseAdmin (service role) after
 * this session is checked, e.g. registerVoteForSignedInUser() in
 * lib/election/votes.ts.
 *
 * Uses @supabase/ssr so the session lives in an httpOnly cookie the
 * Next.js server can read on every request, instead of localStorage
 * (which the Artifacts/browser-storage rules for this codebase
 * wouldn't allow anyway, and which doesn't survive to server routes).
 *
 * Env vars required (new):
 *   NEXT_PUBLIC_SUPABASE_URL       (already set)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  (new — Project Settings → API → anon/public key)
 */

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component that can't set cookies — safe to
            // ignore as long as middleware/route handlers refresh the session.
          }
        },
      },
    }
  )
}
