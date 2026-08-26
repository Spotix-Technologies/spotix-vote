/**
 * src/lib/election/register.ts
 *
 * Candidate registration for FREE offices (form_fee = 0) — inserted
 * straight into Supabase election_candidates, no Paystack/Reference
 * involved at all. Paid offices instead go through
 * api/v1/election/ref → Paystack → spotix-backend's webhook →
 * v1/lib/election/allocate-candidate.js, which performs the equivalent
 * insert once the fee actually clears. Keeping the two paths separate
 * (rather than routing free candidates through a fake "reference") means
 * a free registration is exactly as instant as it looks — nothing is
 * waiting on a webhook that will never fire.
 */

import { supabaseAdmin } from "@/lib/supabase"

function genCandidateId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let id = "sp-cand-"
  for (let i = 0; i < 10; i++) id += chars.charAt(Math.floor(Math.random() * chars.length))
  return id
}

export interface FreeRegistrationInput {
  electionId: string
  officeId: string
  fullName: string
  email: string
  phone?: string
  photoUrl?: string
  answers?: Record<string, string | string[]>
  /** Storage path (BIO_DATA_BUCKET) from /api/v1/election/bio-data-upload — never a public URL. */
  bioDataPath?: string
}

export type FreeRegistrationResult =
  | { ok: true; candidateId: string }
  | { ok: false; reason: "already_registered" }

export async function registerFreeCandidate(input: FreeRegistrationInput): Promise<FreeRegistrationResult> {
  const candidateId = genCandidateId()

  const { data, error } = await supabaseAdmin
    .from("election_candidates")
    .insert({
      id: candidateId,
      election_id: input.electionId,
      office_id: input.officeId,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone ?? "",
      photo_url: input.photoUrl ?? "",
      answers: input.answers ?? {},
      bio_data_path: input.bioDataPath ?? null,
      form_reference: null,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") return { ok: false, reason: "already_registered" }
    throw error
  }

  return { ok: true, candidateId: data.id }
}
