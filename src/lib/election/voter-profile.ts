/**
 * src/lib/election/voter-profile.ts
 *
 * Reads/writes voter_profiles — the one field Supabase Auth itself
 * doesn't give us: phone number (see supabase/voter-profiles-schema.sql
 * for the table + the trigger that creates a row at signup). Always
 * goes through supabaseAdmin (service role); voter_profiles has RLS
 * enabled with no policies, same as every other table in this app.
 */

import { supabaseAdmin } from "@/lib/supabase"

export interface VoterProfile {
  id: string
  email: string | null
  fullName: string | null
  phone: string | null
}

export async function fetchVoterProfile(userId: string): Promise<VoterProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("voter_profiles")
    .select("id, email, full_name, phone")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    phone: data.phone,
  }
}

/**
 * Saves/updates a voter's phone number. Called from the vote payref
 * route whenever a signed-in voter types a phone number at checkout —
 * "if they fill in their number, store it back" so next time they
 * don't have to. Upserts in case the trigger-created row was somehow
 * missed (e.g. accounts created before this table existed).
 */
export async function upsertVoterPhone(userId: string, email: string | null, phone: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("voter_profiles")
    .upsert({ id: userId, email, phone }, { onConflict: "id" })

  if (error) throw error
}
