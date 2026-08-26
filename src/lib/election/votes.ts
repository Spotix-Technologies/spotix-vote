/**
 * src/lib/election/votes.ts
 *
 * Dedicated module for registering votes cast for a candidate — kept
 * separate from lib/election/db.ts (general election/office/candidate
 * reads) on purpose, so the one operation that actually changes a
 * ballot's state lives in its own file. Consumed only by
 * api/v1/election/vote/route.ts.
 *
 * All the actual atomicity (one vote per accredited voter, election
 * window check, live counter bump) happens inside the cast_election_vote()
 * Postgres function — see /supabase/election-schema.sql. This module is
 * a thin, typed wrapper plus the auth check that ties a vote to the
 * signed-in Supabase Auth session.
 */

import { supabaseAdmin } from "@/lib/supabase"
import { createSupabaseServerClient } from "@/lib/election/auth-server"

export type CastVoteReason =
  | "invalid_token"
  | "already_voted"
  | "election_not_active"
  | "voting_not_started"
  | "voting_closed"
  | "candidate_not_found"
  | "not_signed_in"
  | "not_accredited"

export type CastVoteResult = { ok: true } | { ok: false; reason: CastVoteReason }

/**
 * Casts one ballot for `candidateId` in `officeId`, on behalf of
 * whichever voter the CURRENT signed-in Supabase Auth session (via the
 * request's cookies) is accredited as for this election. The caller
 * never gets to pass a voterToken directly — it's resolved server-side
 * from the session's email, so a signed-in user can only ever vote as
 * themselves.
 */
export async function registerVoteForSignedInUser(
  electionId: string,
  officeId: string,
  candidateId: string
): Promise<CastVoteResult> {
  const supabaseServer = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user?.email) {
    return { ok: false, reason: "not_signed_in" }
  }

  const { data: voter, error: voterErr } = await supabaseAdmin
    .from("election_voters")
    .select("voter_token")
    .eq("election_id", electionId)
    .ilike("email", user.email)
    .maybeSingle()

  if (voterErr) throw voterErr
  if (!voter) return { ok: false, reason: "not_accredited" }

  const { data, error } = await supabaseAdmin.rpc("cast_election_vote", {
    p_voter_token: voter.voter_token,
    p_office_id: officeId,
    p_candidate_id: candidateId,
  })

  if (error) throw error
  return data as CastVoteResult
}
