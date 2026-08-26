/**
 * src/lib/election/edit.ts
 *
 * Candidate self-edit window. The organiser sets elections.edit_grace_days
 * (0 = no edits ever allowed); the deadline for any one candidate is
 * always computed fresh as candidate.created_at + edit_grace_days, never
 * stored per-row — so if the organiser extends or shortens the window
 * from the Booker dashboard (EditGraceControl.tsx), every candidate's
 * deadline moves with it immediately, including ones who already missed
 * the old deadline.
 *
 * Only name, phone, photo, and question answers are editable — never
 * election_id, office_id, email, or form_reference. Editing after
 * payment doesn't touch the fee or the payment record at all.
 */

import { supabaseAdmin } from "@/lib/supabase"
import { adminDb } from "@/lib/firebase-admin"

export function computeEditDeadline(candidateCreatedAt: string, editGraceDays: number): Date {
  const created = new Date(candidateCreatedAt)
  return new Date(created.getTime() + editGraceDays * 24 * 60 * 60 * 1000)
}

export function isWithinEditWindow(candidateCreatedAt: string, editGraceDays: number): boolean {
  if (editGraceDays <= 0) return false
  return new Date() < computeEditDeadline(candidateCreatedAt, editGraceDays)
}

export interface EditableCandidate {
  candidateId: string
  officeId: string
  electionId: string
  fullName: string
  email: string
  phone: string
  photoUrl: string
  answers: Record<string, string | string[]>
  bioDataPath: string
  formReference: string | null
  createdAt: string
}

/**
 * Looks up a candidate by (officeId, email) — same identity pair used
 * at registration. A row only exists here once actually credited (free
 * offices insert immediately; paid offices only once
 * spotix-backend's webhook confirms payment — see
 * allocate-candidate.js), so in practice this can never return an
 * unpaid candidate. For a paid candidate, we additionally re-verify the
 * underlying Reference doc's payment status is "successful" before
 * calling them editable — defense in depth against ever surfacing an
 * edit form for a row that shouldn't exist yet (e.g. a webhook race, or
 * a reference later reversed/charged back).
 */
export async function findCandidateForEdit(officeId: string, email: string): Promise<EditableCandidate | null> {
  const { data, error } = await supabaseAdmin
    .from("election_candidates")
    .select("id, office_id, election_id, full_name, email, phone, photo_url, answers, bio_data_path, form_reference, created_at")
    .eq("office_id", officeId)
    .ilike("email", email)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  if (data.form_reference) {
    const refDoc = await adminDb.collection("Reference").doc(data.form_reference).get()
    const refStatus = refDoc.exists ? refDoc.data()?.status : null
    if (refStatus !== "successful") {
      // Row exists (so payment cleared at some point) but the reference
      // no longer reads "successful" — don't hand back an editable form.
      return null
    }
  }

  return {
    candidateId: data.id,
    officeId: data.office_id,
    electionId: data.election_id,
    fullName: data.full_name ?? "",
    email: data.email,
    phone: data.phone ?? "",
    photoUrl: data.photo_url ?? "",
    answers: data.answers ?? {},
    bioDataPath: data.bio_data_path ?? "",
    formReference: data.form_reference ?? null,
    createdAt: data.created_at,
  }
}

export interface CandidateEditPatch {
  fullName?: string
  phone?: string
  photoUrl?: string
  answers?: Record<string, string | string[]>
  bioDataPath?: string
}

/**
 * Applies the edit. Re-checks the edit window server-side against the
 * CURRENT edit_grace_days (in case the organiser changed it between the
 * candidate loading the edit form and submitting it) — never trusts a
 * client-supplied "yes I'm still in the window" flag.
 */
export async function applyCandidateEdit(
  candidateId: string,
  email: string,
  editGraceDaysNow: number,
  patch: CandidateEditPatch
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "window_closed" }> {
  const { data: candidate, error } = await supabaseAdmin
    .from("election_candidates")
    .select("id, email, created_at")
    .eq("id", candidateId)
    .maybeSingle()

  if (error) throw error
  if (!candidate || candidate.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, reason: "not_found" }
  }
  if (!isWithinEditWindow(candidate.created_at, editGraceDaysNow)) {
    return { ok: false, reason: "window_closed" }
  }

  const update: Record<string, any> = {}
  if (patch.fullName !== undefined) update.full_name = patch.fullName
  if (patch.phone !== undefined) update.phone = patch.phone
  if (patch.photoUrl !== undefined) update.photo_url = patch.photoUrl
  if (patch.answers !== undefined) update.answers = patch.answers
  if (patch.bioDataPath !== undefined) update.bio_data_path = patch.bioDataPath

  const { error: updateError } = await supabaseAdmin.from("election_candidates").update(update).eq("id", candidateId)
  if (updateError) throw updateError

  return { ok: true }
}
