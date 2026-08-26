/**
 * .../eform-pdf/buildEFormPdf.ts
 *
 * Orchestrator: takes the receipt data already fetched by ReceiptView,
 * fetches the candidate's photo as a data URL (see
 * fetchImageAsDataUrl.ts), runs the section-drawing functions in order
 * (pdfSections.ts) using the Spotix brand constants (pdfTheme.ts), and
 * triggers the browser download. This is the only file that needs to
 * know jsPDF exists — everything else in this folder is plain data/DOM
 * work, so swapping the PDF library later only touches this file.
 */

import { jsPDF } from "jspdf"
import { fetchImageAsDataUrl } from "./fetchImageAsDataUrl"
import { drawHeader, drawTitle, drawPhoto, drawDetailsTable, drawConfirmedBadge, drawFooter, type EFormData } from "./pdfSections"

export interface EFormPdfInput {
  electionName: string
  officeName: string
  fullName: string
  phone: string
  photoUrl: string
  reference: string
  paymentDate: string | null // ISO string or null
  editExpiresAt: string | null // ISO string or null
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

export async function buildAndDownloadEFormPdf(input: EFormPdfInput): Promise<void> {
  const photoDataUrl = await fetchImageAsDataUrl(input.photoUrl)

  const data: EFormData = {
    electionName: input.electionName || "Spotix Election",
    officeName: input.officeName,
    fullName: input.fullName,
    phone: input.phone,
    reference: input.reference,
    paymentDate: formatDate(input.paymentDate),
    editExpiresLabel: input.editExpiresAt ? formatDate(input.editExpiresAt) : "No further edits allowed",
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" })

  let y = drawHeader(doc, 0)
  drawPhoto(doc, y - 6, photoDataUrl)
  y = drawTitle(doc, y, data)
  y = drawConfirmedBadge(doc, y)
  drawDetailsTable(doc, y, data)
  drawFooter(doc)

  const filenameSafeOffice = data.officeName.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()
  doc.save(`spotix-eform-${filenameSafeOffice}-${input.reference}.pdf`)
}
