"use client"

/**
 * .../payment-resume/PaymentReadyView.tsx
 *
 * completed=0 view. Shows the "Howdy {name}, ready to complete payment
 * for your form?" prompt and, once they tap Ready, opens the exact same
 * PaymentMethodDialog used on the candidate form itself and its Resume
 * Payment dialog — one payment UI everywhere, per the platform-wide
 * component work in components/payment/.
 *
 * On a successful payment, this does NOT show its own "done" state —
 * it calls onCompleted so the parent (PaymentResumeClient) can navigate
 * to ?completed=1, which re-fetches from /api/v1/election/receipt and
 * shows the real receipt + e-form download. Same "always land on the
 * receipt after paying, however you got there" behaviour as the main
 * candidate form and its Resume Payment dialog.
 */

import { useState } from "react"
import { Button } from "@/components/Button"
import { PaymentMethodDialog } from "@/components/payment/PaymentMethodDialog"

export function PaymentReadyView({
  electionId,
  officeId,
  reference,
  data,
  onCompleted,
}: {
  electionId: string
  officeId: string
  reference: string
  data: { fullName: string; email: string; phone: string; electionName: string; officeName: string; totalAmount: number; reference: string }
  onCompleted: () => void
}) {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <>
      <div className="rounded-2xl border border-line bg-ink-2 p-6 text-center">
        <h1 className="font-display text-2xl text-paper">
          Howdy {data.fullName || "there"}, ready to complete payment for your form?
        </h1>
        <p className="mt-2 text-sm text-muted">
          {data.officeName} — ₦{data.totalAmount.toLocaleString()}
        </p>
        <Button onClick={() => setShowDialog(true)} className="mt-6 w-full">
          Ready
        </Button>
      </div>

      {showDialog && (
        <PaymentMethodDialog
          metadata={{ electionId, electionName: data.electionName, officeId, officeName: data.officeName }}
          email={data.email}
          fullName={data.fullName}
          phone={data.phone}
          pendingCheckout={{ reference, totalAmount: data.totalAmount }}
          onSuccess={() => {
            setShowDialog(false)
            onCompleted()
          }}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </>
  )
}
