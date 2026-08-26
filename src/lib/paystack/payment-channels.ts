/**
 * src/lib/paystack/payment-channels.ts
 *
 * The "How do you wanna pay?" step shows a short list of payment methods
 * BEFORE the Paystack widget opens, and each selection is passed straight
 * to PaystackPop.setup()'s `channels` option so Paystack's own checkout
 * skips straight to that method instead of showing every option again.
 *
 * Apple Pay is listed (on Apple devices only, see device.ts) but isn't
 * wired to a real Paystack channel yet — selecting it just shows a
 * "not available yet" notice and lets the buyer pick something else.
 *
 * Mobile Money is deliberately NOT listed: per Paystack's own docs
 * (https://paystack.com/docs/payments/payment-channels/), the Mobile
 * Money channel is "currently available in Ghana, Kenya, and Côte
 * d'Ivoire" — it does not support NGN at all. Passing "mobile_money" in
 * `channels` for an NGN transaction is exactly what was causing the
 * widget to silently ignore the restriction and fall back to showing
 * every channel — Paystack has nothing valid to narrow down to, so it
 * shows everything instead. If Spotix ever expands to GHS/KES/XOF,
 * this can come back gated on the transaction currency.
 */

export type PaymentMethodId = "bank_transfer" | "card" | "apple_pay"

export interface PaymentMethodOption {
  id: PaymentMethodId
  label: string
  description: string
  /** Paystack `channels` values this method maps to. Empty = not wired up yet. */
  channels: string[]
  /** True if selecting this method should actually proceed to checkout. */
  available: boolean
}

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    description: "Pay by transferring directly from your bank app",
    channels: ["bank_transfer"],
    available: true,
  },
  {
    id: "card",
    label: "Card",
    description: "Debit or credit card",
    channels: ["card"],
    available: true,
  },
  {
    id: "apple_pay",
    label: "Apple Pay",
    description: "Pay instantly with Apple Pay",
    channels: [],
    available: false,
  },
]

/**
 * The transient notice shown for ~1.2s right before the widget opens
 * (or, for Apple Pay, shown and left up since there's nothing to open).
 */
export function getPaymentMethodNotice(id: PaymentMethodId, amount: number): string {
  if (id === "bank_transfer") {
    return `Ensure to transfer exactly ₦${amount.toLocaleString()} to avoid failed transactions.`
  }
  if (id === "apple_pay") {
    return "Apple Pay is not available yet."
  }
  return "Initializing transaction…"
}

export function findPaymentMethod(id: PaymentMethodId): PaymentMethodOption {
  const found = PAYMENT_METHOD_OPTIONS.find((m) => m.id === id)
  if (!found) throw new Error(`Unknown payment method: ${id}`)
  return found
}
