/**
 * .../eform-pdf/fetchImageAsDataUrl.ts
 *
 * jsPDF's addImage() needs actual image data (a data: URL or raw
 * base64), not a remote URL — the candidate's photo lives on Cloudinary
 * (photoUrl), so this fetches it client-side and converts it via
 * FileReader before handing it to the PDF builder. Returns null on any
 * failure (network hiccup, CORS, missing photo) so the PDF can still
 * generate with a placeholder instead of failing the whole download.
 */
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { mode: "cors" })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
