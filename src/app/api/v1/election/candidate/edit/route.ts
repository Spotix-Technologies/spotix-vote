/**
 * src/app/api/v1/election/candidate/edit/route.ts
 *
 * PATCH /api/v1/election/candidate/edit
 * Body: { candidateId, email, fullName?, phone?, photoUrl?, answers? }
 *
 * Only fullName/phone/photoUrl/answers are ever writable here — there's
 * no path from this route to change electionId, officeId, email, or
 * form_reference. The edit window is re-verified against the election's
 * CURRENT edit_grace_days at write time (see applyCandidateEdit), not
 * whatever the lookup call returned a minute earlier.
 */

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { applyCandidateEdit } from "@/lib/election/edit"
import { fetchElection } from "@/lib/election/db"

export async function PATCH(req: NextRequest) {
  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { candidateId, email, fullName, phone, photoUrl, answers, bioDataPath } = body
  if (!candidateId || !email?.trim()) {
    return NextResponse.json({ error: "candidateId and email are required" }, { status: 400 })
  }

  // Re-derive the election from the candidate row itself (never trusted
  // from the request body) so we know which election's CURRENT
  // edit_grace_days to check against.
  const { data: candidateRow } = await supabaseAdmin
    .from("election_candidates")
    .select("election_id")
    .eq("id", candidateId)
    .maybeSingle()

  if (!candidateRow) return NextResponse.json({ error: "Submission not found" }, { status: 404 })

  const election = await fetchElection(candidateRow.election_id)
  const editGraceDaysNow = election?.editGraceDays ?? 0

  const result = await applyCandidateEdit(candidateId, email.trim(), editGraceDaysNow, {
    fullName: fullName?.trim(),
    phone: phone?.trim(),
    photoUrl,
    answers,
    bioDataPath,
  })

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Submission not found for that email" }, { status: 404 })
    }
    return NextResponse.json({ error: "The edit window for this submission has closed" }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
