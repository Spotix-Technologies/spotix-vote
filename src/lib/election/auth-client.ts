/**
 * src/lib/election/auth-client.ts
 *
 * Browser-side Supabase Auth client — used only by app/auth/login and
 * app/auth/signup for signInWithPassword/signUp. See auth-server.ts for
 * why the anon key is safe to expose here (Auth only, RLS still denies
 * anon on every election_* table).
 */

"use client"

import { createBrowserClient } from "@supabase/ssr"

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
