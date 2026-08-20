"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/Button"
import { ensurePaystackScriptLoaded, isPaystackReady } from "@/lib/paystack/paystack-client"
import { upsertPaystackCustomer } from "@/lib/paystack/paystack-customer"
import { openVoteCheckout } from "@/lib/paystack/vote-checkout"
import { findPaymentMethod, type PaymentMethodId } from "@/lib/paystack/payment-channels"
import { PaymentMethodPicker } from "./payment/PaymentMethodPicker"
import { PaymentMethodNotice } from "./payment/PaymentMethodNotice"

export interface VoteModalProps {
  pollId: string
  creatorId: string
  pollName: string
  pollPrice: number
  buyerBearsBurden: boolean
  contestantId: string
  contestantName: string
  categoryId?: string
  onClose: () => void
}

// Spotix's standard buyer-side service fee. Kept in sync with the
// service fee spotix-user's ticket checkout applies elsewhere.
const SERVICE_FEE_RATE = 0.05

// How long the payment-method notice ("transfer exactly ₦X" / "Initializing
// transaction…") stays up before the Paystack widget actually opens.
// Mirrors spotix-user's PayWithPaystack AMOUNT_NOTICE_DELAY_MS.
const NOTICE_DELAY_MS = 1300

type Step = "details" | "method" | "notice"

export function VoteModal({
  pollId,
  creatorId,
  pollName,
  pollPrice,
  buyerBearsBurden,
  contestantId,
  contestantName,
  categoryId,
  onClose,
}: VoteModalProps) {
  const [step, setStep] = useState<Step>("details")
  const [voteCount, setVoteCount] = useState(1)
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [reference, setReference] = useState<string | null>(null)
  const [payer, setPayer] = useState<{ name: string; email: string; phone: string | null } | null>(null)

  const [activeMethod, setActiveMethod] = useState<PaymentMethodId | null>(null)
  const [connecting, setConnecting] = useState(false)

  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const base = pollPrice * voteCount
  const serviceFee = buyerBearsBurden ? Math.round(base * SERVICE_FEE_RATE) : 0
  const total = base + serviceFee

  // Preload the Paystack script as soon as the modal mounts, so it's
  // ready well before the buyer reaches the payment-method step.
  useEffect(() => {
    ensurePaystackScriptLoaded()
  }, [])

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [])

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!guestName.trim() || !guestEmail.trim()) {
      setError("Name and email are required.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/vote/payref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          creatorId,
          contestantId,
          contestantName,
          pollPrice,
          voteCount,
          totalAmount: total,
          pollName,
          categoryId,
          buyerBearsBurden,
          serviceFee,
          guestName,
          guestEmail,
          guestPhone: guestPhone || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Couldn't start payment")

      const resolvedName = data.payerName || guestName
      const resolvedEmail = data.payerEmail || guestEmail
      const resolvedPhone = data.payerPhone || guestPhone || null

      setReference(data.reference)
      setPayer({ name: resolvedName, email: resolvedEmail, phone: resolvedPhone })

      // Register (or refresh) this buyer's Paystack Customer record before
      // checkout opens — same call, same timing, as spotix-user's
      // doOpen()/openWidget() in PayWithPaystack.tsx. Fire-and-forget.
      const nameParts = resolvedName.trim().split(/\s+/)
      upsertPaystackCustomer(
        resolvedEmail,
        nameParts[0] ?? "",
        nameParts[1] ?? nameParts[0] ?? "",
        resolvedPhone ?? undefined,
      )

      setStep("method")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  function openCheckout(methodId: PaymentMethodId) {
    if (!reference || !payer) return

    if (!isPaystackReady()) {
      setError("Payment gateway is still loading. Please wait a moment and try again.")
      setStep("method")
      return
    }
    const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    if (!paystackKey) {
      setError("Payment configuration error. Please contact support.")
      setStep("method")
      return
    }

    const method = findPaymentMethod(methodId)

    const handler = openVoteCheckout({
      paystackKey,
      email: payer.email,
      amount: total,
      reference,
      fullName: payer.name,
      phone: payer.phone ?? "",
      channels: method.channels,
      metadata: {
        pollId,
        pollName,
        contestantId,
        contestantName,
        voteCount,
        organizerId: creatorId,
        categoryId: categoryId ?? null,
      },
      onSuccess: (ref) => {
        // Redirect flow (matches spotix-user): the callback page owns
        // reconciling + displaying the final status, instead of this
        // modal trying to poll in place.
        window.location.href = `/poll/${encodeURIComponent(pollId)}/callback?ref=${encodeURIComponent(ref)}`
      },
      onClose: () => {
        // Buyer closed the widget without paying — let them try again
        // or pick a different method.
        setConnecting(false)
        setStep("method")
      },
    })

    if (!handler) {
      setError("Failed to initialize Paystack. Please refresh and try again.")
      setStep("method")
      return
    }
    if (typeof handler.openIframe === "function") handler.openIframe()
    else handler.pay?.()
  }

  function handleSelectMethod(methodId: PaymentMethodId) {
    setError(null)
    setActiveMethod(methodId)
    setStep("notice")

    const method = findPaymentMethod(methodId)
    if (!method.available) {
      // Apple Pay: show the "not available yet" notice and stop —
      // PaymentMethodNotice's "Choose a different method" sends them
      // back to the picker.
      setConnecting(false)
      return
    }

    setConnecting(true)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => openCheckout(methodId), NOTICE_DELAY_MS)
  }

  function handleChooseDifferent() {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    setConnecting(false)
    setActiveMethod(null)
    setStep("method")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl border border-line bg-ink-2 p-6 sm:rounded-2xl">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="font-display text-xl text-paper">Vote for {contestantName}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-paper">
            ✕
          </button>
        </div>
        <p className="mb-5 text-sm text-muted">{pollName}</p>

        {step === "details" && (
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Votes</label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVoteCount((v) => Math.max(1, v - 1))}
                  aria-label="Decrease votes"
                >
                  −
                </Button>
                <span className="w-12 text-center font-mono text-lg text-paper">{voteCount}</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVoteCount((v) => v + 1)}
                  aria-label="Increase votes"
                >
                  +
                </Button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted" htmlFor="guestName">
                Full name
              </label>
              <input
                id="guestName"
                className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-paper outline-none focus-visible:border-brass"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted" htmlFor="guestEmail">
                Email
              </label>
              <input
                id="guestEmail"
                type="email"
                className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-paper outline-none focus-visible:border-brass"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted" htmlFor="guestPhone">
                Phone (optional)
              </label>
              <input
                id="guestPhone"
                className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-paper outline-none focus-visible:border-brass"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
              />
            </div>

            <div className="stub-divider my-2" />

            <div className="flex items-center justify-between font-mono text-sm text-muted">
              <span>Total</span>
              <span className="text-lg text-brass-soft">₦{total.toLocaleString()}</span>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Starting payment…" : `Pay ₦${total.toLocaleString()}`}
            </Button>
          </form>
        )}

        {step === "method" && (
          <div className="space-y-4">
            <PaymentMethodPicker onSelect={handleSelectMethod} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="button"
              onClick={() => setStep("details")}
              className="w-full text-center text-xs text-muted hover:text-paper"
            >
              ← Back to details
            </button>
          </div>
        )}

        {step === "notice" && activeMethod && (
          <PaymentMethodNotice
            methodId={activeMethod}
            amount={total}
            connecting={connecting}
            onChooseDifferent={handleChooseDifferent}
          />
        )}
      </div>
    </div>
  )
}
