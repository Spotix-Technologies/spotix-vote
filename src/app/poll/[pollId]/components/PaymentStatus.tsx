"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/Button"

type Status = "pending" | "success" | "failed"

export function PaymentStatus({ reference, onDone }: { reference: string; onDone: () => void }) {
  const [status, setStatus] = useState<Status>("pending")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let attempts = 0

    async function poll() {
      attempts += 1
      try {
        const res = await fetch(`/api/v1/polls/verify?ref=${encodeURIComponent(reference)}`)
        const data = await res.json()
        if (cancelled) return

        if (data.status === "success") {
          setStatus("success")
          return
        }
        if (data.status === "failed" || data.status === "incorrect_payment") {
          setStatus("failed")
          setMessage(data.message ?? "Payment could not be confirmed.")
          return
        }
      } catch {
        /* keep polling */
      }
      if (attempts < 12 && !cancelled) setTimeout(poll, 2500)
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [reference])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-ink-2 p-8 text-center">
        {status === "pending" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brass border-t-transparent" />
            <h2 className="font-display text-xl text-paper">Confirming your vote</h2>
            <p className="mt-2 text-sm text-muted">
              Reference <span className="font-mono text-brass-soft">{reference}</span>
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <h2 className="font-display text-xl text-success">Vote counted</h2>
            <p className="mt-2 text-sm text-muted">Thanks for voting — your ballot has been recorded.</p>
            <Button className="mt-6 w-full" onClick={onDone}>
              Back to poll
            </Button>
          </>
        )}
        {status === "failed" && (
          <>
            <h2 className="font-display text-xl text-danger">Payment didn&apos;t go through</h2>
            <p className="mt-2 text-sm text-muted">{message}</p>
            <Button className="mt-6 w-full" onClick={onDone}>
              Try again
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
