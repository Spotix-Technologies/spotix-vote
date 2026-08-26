"use client"

/**
 * .../payment-resume/ReceiptView.tsx
 *
 * completed=1 view. The data it renders was already verified successful
 * server-side by /api/v1/election/receipt (see that route's header
 * comment) — this component just displays it and, on request, builds
 * the downloadable e-form PDF via eform-pdf/buildEFormPdf.ts.
 */

import { useState } from "react"
import { Pill } from "@/components/Pill"
import { Button } from "@/components/Button"
import { buildAndDownloadEFormPdf } from "./eform-pdf/buildEFormPdf"

export interface ReceiptData {
  reference: string
  electionName: string
  officeName: string
  fullName: string
  phone: string
  photoUrl: string
  totalAmount: number
  paymentDate: string | null
  editExpiresAt: string | null
  candidateCredited: boolean
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "long", year: "numeric" })
  } catch {
    return "—"
  }
}

export function ReceiptView({ data }: { data: ReceiptData }) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function handleDownload() {
    setDownloading(true)
    setDownloadError(null)
    try {
      await buildAndDownloadEFormPdf({
        electionName: data.electionName,
        officeName: data.officeName,
        fullName: data.fullName,
        phone: data.phone,
        photoUrl: data.photoUrl,
        reference: data.reference,
        paymentDate: data.paymentDate,
        editExpiresAt: data.editExpiresAt,
      })
    } catch {
      setDownloadError("Could not generate the PDF — please try again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink-2">
      <div className="flex flex-col items-center gap-2 p-6 text-center">
        <Pill tone="success">Payment confirmed</Pill>
        <h1 className="mt-2 font-display text-2xl text-paper">You're all set, {data.fullName || "candidate"}</h1>
        <p className="text-sm text-muted">
          {data.officeName} — {data.electionName}
        </p>
      </div>

      <div className="stub-divider" />

      <div className="flex flex-col gap-3 p-6">
        {data.photoUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.photoUrl} alt={data.fullName} className="h-20 w-20 rounded-full border border-line object-cover" />
          </div>
        )}

        <dl className="flex flex-col gap-2 text-sm">
          <Row label="Reference" value={data.reference} />
          <Row label="Amount paid" value={`₦${data.totalAmount.toLocaleString()}`} />
          <Row label="Date paid" value={formatDate(data.paymentDate)} />
          <Row label="Edit window" value={data.editExpiresAt ? `Until ${formatDate(data.editExpiresAt)}` : "No further edits allowed"} />
        </dl>

        {!data.candidateCredited && (
          <p className="rounded-lg border border-line bg-ink px-3 py-2 text-xs text-muted">
            We're finalizing your registration — this usually takes a few seconds. Refresh if you don't see "Confirmed" yet.
          </p>
        )}

        <Button onClick={handleDownload} disabled={downloading} className="mt-2 w-full">
          {downloading ? "Preparing PDF…" : "Download e-form"}
        </Button>
        {downloadError && <p className="text-center text-sm text-danger">{downloadError}</p>}

        <p className="text-center text-xs text-muted">
          Questions? Reach out to <span className="text-paper">support@spotix.com.ng</span>. Good luck from all of us
          at Spotix!
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate text-right text-paper">{value}</dd>
    </div>
  )
}
