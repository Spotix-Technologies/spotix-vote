/**
 * src/app/api/v1/election/candidate/lookup/route.ts
 *
 * POST /api/v1/election/candidate/lookup
 * Body: { officeId, email }
 *
 * Backs the "Edit my details" dialog: candidate enters their email,
 * this returns their submission plus whether they're still inside the
 * organiser-set edit window. editableUntil is returned even when
 * already closed, so the UI can say exactly when it closed rather than
 * just "no".
 */

import { NextRequest, NextResponse } from "next/server"
import { findCandidateForEdit, computeEditDeadline, isWithinEditWindow } from "@/lib/election/edit"
import { fetchElection } from "@/lib/election/db"

export async function POST(req: NextRequest) {
  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { officeId, email } = body
  if (!officeId || !email?.trim()) {
    return NextResponse.json({ error: "officeId and email are required" }, { status: 400 })
  }

  const candidate = await findCandidateForEdit(officeId, email.trim())
  if (!candidate) {
    return NextResponse.json({ error: "No submission found for that email on this office" }, { status: 404 })
  }

  const election = await fetchElection(candidate.electionId)
  const editGraceDays = election?.editGraceDays ?? 0

  return NextResponse.json({
    candidateId: candidate.candidateId,
    fullName: candidate.fullName,
    email: candidate.email,
    phone: candidate.phone,
    photoUrl: candidate.photoUrl,
    answers: candidate.answers,
    bioDataPath: candidate.bioDataPath,
    editable: isWithinEditWindow(candidate.createdAt, editGraceDays),
    editableUntil: editGraceDays > 0 ? computeEditDeadline(candidate.createdAt, editGraceDays).toISOString() : null,
  })
}
