/**
 * src/lib/election/bio-data.ts
 *
 * Shared constants for the candidate "bio data" upload feature (the
 * qualifying document — student ID, admission letter, etc. — an
 * organiser can require per office; see election_offices.bio_data_required).
 *
 * Storage: a PRIVATE Supabase Storage bucket, never a public one — these
 * documents can be personally identifying. Nothing in this app ever
 * turns a stored path into a public URL; spotix-booker's organiser
 * dashboard generates short-lived signed URLs on demand instead (see
 * BOOKER_BIO_DATA_NOTICE below for the copy shown to candidates about
 * that).
 *
 * ⚠️ One-time setup required in the Supabase dashboard (not something
 * code can do): create a bucket named exactly BIO_DATA_BUCKET below,
 * with "Public bucket" left OFF. No storage policies are needed for the
 * anon/public key since every read/write here goes through supabaseAdmin
 * (service role) on the server, same as every other table in this app.
 */

export const BIO_DATA_BUCKET = "election-bio-data"

export const MAX_BIO_DATA_BYTES = 10 * 1024 * 1024 // 10MB

export const BIO_DATA_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]

/** Shown to candidates on the registration form, next to the bio data upload field. */
export const BIO_DATA_CANDIDATE_NOTICE =
  "This document is used only to verify you qualify to contest — it's stored securely, never shown to other candidates or voters. After the election ends, Spotix forwards it to the event organizer and permanently deletes it from our systems."

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-80)
}

export function buildBioDataStoragePath(electionId: string, officeId: string, originalFilename: string): string {
  const stamp = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `${electionId}/${officeId}/${stamp}-${rand}-${sanitizeFilename(originalFilename || "document")}`
}
