/**
 * src/app/api/v1/election/[electionId]/tally/route.ts
 *
 * GET /api/v1/election/{electionId}/tally
 *
 * Lightweight, frequently-polled endpoint backing the "live" vote
 * counter — returns just office/candidate vote_count numbers, nothing
 * else, so polling it every few seconds is cheap. Same
 * results-published gate as the main election route: candidates carry
 * voteCount: null until the organiser publishes.
 *
 * This app never issues an anon Supabase key with table access (see
 * lib/supabase.ts), so "live" here means short-interval client polling
 * against this route rather than a client-side Realtime subscription —
 * see the note in /supabase/election-schema.sql.
 */

import { NextRequest, NextResponse } from "next/server"
import { fetchElection, fetchOffices, fetchCandidatesForOffice } from "@/lib/election/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ electionId: string }> }) {
  const { electionId } = await params

  const election = await fetchElection(electionId)
  if (!election) return NextResponse.json({ error: "Election not found" }, { status: 404 })

  const offices = await fetchOffices(electionId)
  const tally = await Promise.all(
    offices.map(async (office) => ({
      officeId: office.officeId,
      officeName: office.name,
      candidates: await fetchCandidatesForOffice(office.officeId, election.resultsPublished),
    }))
  )

  return NextResponse.json({ resultsPublished: election.resultsPublished, tally })
}
