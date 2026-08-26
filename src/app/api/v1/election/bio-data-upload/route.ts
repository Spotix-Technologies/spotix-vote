/**
 * src/app/api/v1/election/bio-data-upload/route.ts
 *
 * POST /api/v1/election/bio-data-upload
 * multipart/form-data: file, electionId, officeId
 *
 * Uploads a candidate's qualifying document into the private
 * BIO_DATA_BUCKET Supabase Storage bucket and returns just the storage
 * PATH (never a public URL — the bucket isn't public). spotix-booker's
 * organiser dashboard exchanges that path for a short-lived signed URL
 * when an organiser actually needs to view it.
 *
 * No candidate row exists yet at upload time (the office form isn't
 * submitted until after this call resolves), so this can't be gated by
 * "does this candidate own this office" — same trust model as the
 * Cloudinary photo upload, which is also pre-submission. The path is
 * only ever attached to a real candidate row once /api/v1/election/ref
 * (or the paid-office webhook) runs.
 */

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { fetchOffice, fetchElection } from "@/lib/election/db"
import { BIO_DATA_BUCKET, MAX_BIO_DATA_BYTES, BIO_DATA_ALLOWED_TYPES, buildBioDataStoragePath } from "@/lib/election/bio-data"

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 })

  const file = form.get("file")
  const electionId = form.get("electionId")
  const officeId = form.get("officeId")

  if (!(file instanceof File) || typeof electionId !== "string" || typeof officeId !== "string" || !electionId || !officeId) {
    return NextResponse.json({ error: "file, electionId, and officeId are required" }, { status: 400 })
  }

  if (file.size > MAX_BIO_DATA_BYTES) {
    return NextResponse.json({ error: "File must be under 10MB" }, { status: 413 })
  }
  if (file.type && !BIO_DATA_ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF or image files (JPG, PNG, WEBP, HEIC) are accepted" }, { status: 415 })
  }

  const [election, office] = await Promise.all([fetchElection(electionId), fetchOffice(officeId)])
  if (!election) return NextResponse.json({ error: "Election not found" }, { status: 404 })
  if (!office || office.election_id !== electionId) {
    return NextResponse.json({ error: "Office not found for this election" }, { status: 404 })
  }

  const path = buildBioDataStoragePath(electionId, officeId, file.name)
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from(BIO_DATA_BUCKET)
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false })

  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ path })
}
