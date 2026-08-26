/**
 * src/lib/election/bio-data-upload.ts
 *
 * Client-side upload for the candidate "bio data" qualifying document
 * (student ID, admission letter, etc.) — deliberately NOT Cloudinary
 * like the candidate photo. This document can be sensitive/personally
 * identifying, so it goes through our own server route
 * (/api/v1/election/bio-data-upload) into a PRIVATE Supabase Storage
 * bucket instead of an unsigned public preset. See that route for the
 * storage details and lib/election/bio-data.ts for the "we forward this
 * to the organiser then delete it" data-handling notice.
 */

const MAX_BYTES = 10 * 1024 * 1024 // 10MB — bio data is often a scanned PDF/photo, bigger than an avatar

export class BioDataTooLargeError extends Error {
  constructor() {
    super("File must be under 10MB")
    this.name = "BioDataTooLargeError"
  }
}

export async function uploadCandidateBioData(file: File, electionId: string, officeId: string): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new BioDataTooLargeError()
  }

  const form = new FormData()
  form.append("file", file)
  form.append("electionId", electionId)
  form.append("officeId", officeId)

  const res = await fetch("/api/v1/election/bio-data-upload", {
    method: "POST",
    body: form,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? "Document upload failed")
  }

  const data = await res.json()
  return data.path as string
}
