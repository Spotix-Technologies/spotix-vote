"use client"

/**
 * src/components/payment/PaymentMethodDialog.tsx
 *
 * Full "pick a method → brief notice → Paystack opens" flow as one
 * self-contained modal, built on PaymentMethodPicker + PaymentMethodNotice.
 * Platform-wide by design — used by:
 *   - the candidate form's initial "Pay & submit" (office/[officeId]/page.tsx)
 *   - that same page's "Resume payment" dialog's "Pay now" button
 *   - the payment-resume page's "Ready" button (office/[officeId]/payment-resume/)
 *
 * Takes `metadata` in the exact shape openElectionCheckout already wants
 * (ElectionCheckoutMetadata) rather than a whole OfficeDetail, so it
 * doesn't need to know anything about the page-specific office-fetching
 * shape it's called from.
 */

import { useState } from "react"
import { ensurePaystackScriptLoaded } from "@/lib/paystack/paystack-client"
import { openElectionCheckout, type ElectionCheckoutMetadata } from "@/lib/election/paystack/election-checkout"
import { findPaymentMethod, type PaymentMethodId } from "@/lib/paystack/payment-channels"
import { PaymentMethodPicker } from "./PaymentMethodPicker"
import { PaymentMethodNotice } from "./PaymentMethodNotice"

const METHOD_NOTICE_DELAY_MS = 1100

export interface PaymentMethodDialogProps {
  metadata: ElectionCheckoutMetadata
  email: string
  fullName: string
  phone: string
  pendingCheckout: { reference: string; totalAmount: number }
  title?: string
  onSuccess: () => void
  onCancel: () => void
}

export function PaymentMethodDialog({
  metadata,
  email,
  fullName,
  phone,
  pendingCheckout,
  title = "Complete payment",
  onSuccess,
  onCancel,
}: PaymentMethodDialogProps) {
  const [activeMethod, setActiveMethod] = useState<PaymentMethodId | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openCheckout(methodId: PaymentMethodId) {
    const method = findPaymentMethod(methodId)

    ensurePaystackScriptLoaded().then((ready) => {
      if (!ready) {
        setError("Payment gateway is still loading — please wait a moment and try again.")
        setActiveMethod(null)
        setConnecting(false)
        return
      }

      openElectionCheckout({
        paystackKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email,
        amount: pendingCheckout.totalAmount,
        reference: pendingCheckout.reference,
        fullName,
        phone,
        channels: method.channels,
        metadata,
        onSuccess: () => onSuccess(),
        onClose: () => {
          // Buyer dismissed the widget without paying — back to the
          // picker, same reference, so nothing is lost or re-created.
          setConnecting(false)
          setActiveMethod(null)
        },
      })
    })
  }

  function handleSelectMethod(methodId: PaymentMethodId) {
    setError(null)
    setActiveMethod(methodId)

    const method = findPaymentMethod(methodId)
    if (!method.available) {
      setConnecting(false)
      return
    }

    setConnecting(true)
    setTimeout(() => openCheckout(methodId), METHOD_NOTICE_DELAY_MS)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl border border-line bg-ink-2 p-6 sm:rounded-2xl">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="font-display text-xl text-paper">{title}</h2>
          <button onClick={onCancel} aria-label="Close" className="text-muted hover:text-paper">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">
          ₦{pendingCheckout.totalAmount.toLocaleString()} for {metadata.officeName}
        </p>

        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        {activeMethod ? (
          <PaymentMethodNotice
            methodId={activeMethod}
            amount={pendingCheckout.totalAmount}
            connecting={connecting}
            onChooseDifferent={() => {
              setActiveMethod(null)
              setConnecting(false)
            }}
          />
        ) : (
          <PaymentMethodPicker onSelect={handleSelectMethod} />
        )}
      </div>
    </div>
  )
}
