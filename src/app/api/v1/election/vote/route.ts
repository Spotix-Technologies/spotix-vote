/**
 * src/app/api/v1/election/vote/route.ts
 *
 * POST /api/v1/election/vote
 * Body: { electionId, officeId, candidateId }
 *
 * The dedicated, modular vote-casting endpoint — all it does is check
 * the caller is signed in and delegate to
 * lib/election/votes.ts#registerVoteForSignedInUser, which resolves the
 * voter's accreditation from their session email and calls the atomic
 * cast_election_vote() RPC. No other route in this app writes to
 * election_votes.
 */

import { NextRequest, NextResponse } from "next/server"
import { registerVoteForSignedInUser } from "@/lib/election/votes"

const REASON_STATUS: Record<string, number> = {
  not_signed_in: 401,
  not_accredited: 403,
  invalid_token: 403,
  already_voted: 409,
  election_not_active: 403,
  voting_not_started: 403,
  voting_closed: 403,
  candidate_not_found: 404,
}

const REASON_MESSAGE: Record<string, string> = {
  not_signed_in: "Sign in to vote.",
  not_accredited: "You're not on the accredited voter list for this election.",
  invalid_token: "Your voting credential could not be verified.",
  already_voted: "You've already voted in this election.",
  election_not_active: "This election isn't currently open for voting.",
  voting_not_started: "Voting hasn't started yet.",
  voting_closed: "Voting has closed for this election.",
  candidate_not_found: "That candidate could not be found for this office.",
}

export async function POST(req: NextRequest) {
  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { electionId, officeId, candidateId } = body
  if (!electionId || !officeId || !candidateId) {
    return NextResponse.json({ error: "electionId, officeId, and candidateId are required" }, { status: 400 })
  }

  const result = await registerVoteForSignedInUser(electionId, officeId, candidateId)

  if (!result.ok) {
    return NextResponse.json(
      { error: REASON_MESSAGE[result.reason] ?? "Vote could not be registered.", reason: result.reason },
      { status: REASON_STATUS[result.reason] ?? 400 }
    )
  }

  return NextResponse.json({ success: true })
}
