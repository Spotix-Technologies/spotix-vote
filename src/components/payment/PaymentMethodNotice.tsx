"use client"

/**
 * src/components/payment/PaymentMethodNotice.tsx
 *
 * Platform-wide — see PaymentMethodPicker.tsx's header comment for why
 * this moved out of poll/[pollId]/components/payment/.
 */

import { Button } from "@/components/Button"
import { getPaymentMethodNotice, type PaymentMethodId } from "@/lib/paystack/payment-channels"

export interface PaymentMethodNoticeProps {
  methodId: PaymentMethodId
  amount: number
  /** True once the message has been shown long enough and checkout is opening (unused for apple_pay). */
  connecting: boolean
  onChooseDifferent: () => void
}

export function PaymentMethodNotice({ methodId, amount, connecting, onChooseDifferent }: PaymentMethodNoticeProps) {
  const message = getPaymentMethodNotice(methodId, amount)
  const isAppleUnavailable = methodId === "apple_pay"

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brass/10">
        {isAppleUnavailable ? (
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-danger">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={`text-brass ${connecting ? "animate-spin" : ""}`}
          >
            <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <p className="text-sm text-paper">{message}</p>

      {isAppleUnavailable && (
        <Button type="button" variant="outline" onClick={onChooseDifferent}>
          Choose a different method
        </Button>
      )}
    </div>
  )
}
