/**
 * src/app/api/v1/election/receipt/route.ts
 *
 * POST /api/v1/election/receipt
 * Body: { reference }
 *
 * Backs the `completed=1` view of payment-resume/page.tsx. Deliberately
 * separate from /api/v1/election/resume — that route is fine handing
 * back a "still pending" status for the pre-payment view, but a RECEIPT
 * must never be shown unless the payment has actually cleared. This
 * route re-checks status === "successful" directly against the
 * Reference doc before returning anything — never trusts the
 * `completed=1` query param alone, since that's just a URL a candidate
 * could type by hand.
 *
 * Also joins in what the Reference doc alone doesn't have: the
 * candidate's photo and the actual edit-window deadline, both of which
 * live on the Supabase election_candidates row (only created once
 * spotix-backend's webhook credits the reference — see
 * lib/election/edit.ts's computeEditDeadline for the same math used on
 * the candidate's own edit dialog).
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { supabaseAdmin } from "@/lib/supabase"
import { fetchElection } from "@/lib/election/db"
import { computeEditDeadline } from "@/lib/election/edit"

export async function POST(req: NextRequest) {
  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const reference = body.reference?.trim()
  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 })
  }

  const doc = await adminDb.collection("Reference").doc(reference).get()
  if (!doc.exists) {
    return NextResponse.json({ error: "No form found for that reference" }, { status: 404 })
  }

  const data = doc.data()!
  if (data.transactionType !== "election_form_purchase") {
    return NextResponse.json({ error: "No form found for that reference" }, { status: 404 })
  }

  // The one rule this whole route exists to enforce.
  if (data.status !== "successful") {
    return NextResponse.json({ error: "This payment hasn't been confirmed yet" }, { status: 409 })
  }

  const election = await fetchElection(data.electionId)

  let photoUrl = data.photoUrl ?? ""
  let editExpiresAt: string | null = null

  if (data.candidateId) {
    const { data: candidate } = await supabaseAdmin
      .from("election_candidates")
      .select("photo_url, created_at")
      .eq("id", data.candidateId)
      .maybeSingle()

    if (candidate) {
      photoUrl = candidate.photo_url || photoUrl
      if (election && election.editGraceDays > 0) {
        editExpiresAt = computeEditDeadline(candidate.created_at, election.editGraceDays).toISOString()
      }
    }
  }

  return NextResponse.json({
    reference,
    electionName: data.electionName ?? election?.name ?? "",
    officeName: data.officeName ?? "",
    fullName: data.fullName ?? "",
    phone: data.phone ?? "",
    photoUrl,
    totalAmount: data.totalAmount ?? 0,
    paymentDate: data.paymentCompletedAt ?? data.updatedAt ?? null,
    editExpiresAt,
    candidateCredited: data.candidateCredited === true,
  })
}
