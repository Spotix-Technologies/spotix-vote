/**
 * src/lib/election/cloudinary-upload.ts
 *
 * Client-side candidate photo upload to Cloudinary, unsigned preset (no
 * server round-trip needed just to upload a picture — the candidate
 * form only ever sends the resulting photoUrl string to our own API).
 *
 * Requires two new env vars (Cloudinary Dashboard → Settings → Upload,
 * create an unsigned upload preset scoped to an "election-candidates"
 * folder so these uploads are easy to find/moderate):
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 */

const MAX_BYTES = 5 * 1024 * 1024 // 5MB

export class PhotoTooLargeError extends Error {
  constructor() {
    super("Photo must be under 5MB")
    this.name = "PhotoTooLargeError"
  }
}

export async function uploadCandidatePhoto(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new PhotoTooLargeError()
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured (missing env vars)")
  }

  const form = new FormData()
  form.append("file", file)
  form.append("upload_preset", uploadPreset)
  form.append("folder", "election-candidates")

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message ?? "Photo upload failed")
  }

  const data = await res.json()
  return data.secure_url as string
}
