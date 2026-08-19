"use client"

import { useEffect, useState } from "react"
import { PAYMENT_METHOD_OPTIONS, type PaymentMethodId } from "@/lib/paystack/payment-channels"
import { isApplePlatform } from "@/lib/paystack/device"

const METHOD_ICONS: Record<PaymentMethodId, React.ReactNode> = {
  bank_transfer: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h18M5 10v9M9 10v9M15 10v9M19 10v9M3 19h18M12 3l9 5H3l9-5Z" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
      <path d="M2.5 9.5h19" />
    </svg>
  ),
  mobile_money: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2.5" width="12" height="19" rx="2.2" />
      <path d="M10 18.5h4" />
    </svg>
  ),
  apple_pay: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.462 2.25-1.14 3.06-.75.9-1.98 1.59-3.03 1.5a3.36 3.36 0 0 1-.03-.42c0-1.14.51-2.28 1.2-3.03.75-.87 2.04-1.53 3-1.56.03.15.03.3.03.45ZM20.1 17.55c-.36.84-.54 1.2-1.02 1.95-.63 1.02-1.5 2.28-2.61 2.31-.99.03-1.26-.63-2.61-.63s-1.68.6-2.64.63c-1.11.03-1.95-1.14-2.58-2.16-1.77-2.85-1.95-6.21-.87-8.01.78-1.29 2.01-2.04 3.15-2.04 1.17 0 1.9.63 2.85.63.93 0 1.5-.63 2.85-.63 1.02 0 2.1.54 2.88 1.5-2.52 1.38-2.1 4.98.6 6.45Z" />
    </svg>
  ),
}

export interface PaymentMethodPickerProps {
  onSelect: (methodId: PaymentMethodId) => void
  disabled?: boolean
}

export function PaymentMethodPicker({ onSelect, disabled }: PaymentMethodPickerProps) {
  const [showApplePay, setShowApplePay] = useState(false)

  // Apple Pay only ever shows on an Apple device — checked client-side
  // only, so it starts hidden and appears after mount (no SSR mismatch
  // risk since it's additive, never removes something already rendered).
  useEffect(() => {
    setShowApplePay(isApplePlatform())
  }, [])

  const methods = PAYMENT_METHOD_OPTIONS.filter((m) => m.id !== "apple_pay" || showApplePay)

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-paper">How do you wanna pay?</h3>
      <div className="space-y-2">
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(m.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-ink-2 px-4 py-3 text-left transition-colors hover:border-brass disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass/10 text-brass">
              {METHOD_ICONS[m.id]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-paper">{m.label}</span>
              <span className="block truncate text-xs text-muted">{m.description}</span>
            </span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
