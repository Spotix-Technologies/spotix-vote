/**
 * src/app/api/v1/election/[electionId]/route.ts
 *
 * GET /api/v1/election/{electionId}
 *
 * Returns the election, its offices, and each office's candidates —
 * requires a signed-in session that is accredited for this election
 * (this route is what feeds the ballot itself, so it's stricter than
 * the "my elections" list, which only needs the session to exist).
 * vote_count on each candidate is null unless results have been
 * published (see fetchCandidatesForOffice in lib/election/db.ts).
 */

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { fetchElection, fetchOffices, fetchCandidatesForOffice, fetchVotedOfficeIds } from "@/lib/election/db"
import { createSupabaseServerClient } from "@/lib/election/auth-server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ electionId: string }> }) {
  const { electionId } = await params

  const supabaseServer = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: "Sign in to view this election" }, { status: 401 })
  }

  const { data: voter } = await supabaseAdmin
    .from("election_voters")
    .select("id")
    .eq("election_id", electionId)
    .ilike("email", user.email)
    .maybeSingle()

  if (!voter) {
    return NextResponse.json({ error: "You're not accredited to view this election" }, { status: 403 })
  }

  const election = await fetchElection(electionId)
  if (!election) return NextResponse.json({ error: "Election not found" }, { status: 404 })

  const [offices, votedOfficeIds] = await Promise.all([fetchOffices(electionId), fetchVotedOfficeIds(voter.id)])

  const officesWithCandidates = await Promise.all(
    offices.map(async (office) => ({
      ...office,
      hasVoted: votedOfficeIds.includes(office.officeId),
      candidates: await fetchCandidatesForOffice(office.officeId, election.resultsPublished),
    }))
  )

  return NextResponse.json({ election, offices: officesWithCandidates })
}
