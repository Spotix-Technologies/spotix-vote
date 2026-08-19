"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { PendingState } from "./components/PendingState"
import { SuccessState } from "./components/SuccessState"
import { FailedState } from "./components/FailedState"
import { IncorrectAmountState } from "./components/IncorrectAmountState"
import { WrongTypeState } from "./components/WrongTypeState"

interface RefData {
  transactionType: string | null
  status: "pending" | "successful" | "failed" | "incorrect_payment" | string
  contestantId: string | null
  contestantName: string | null
  voteCount: number | null
  updatedAt: string | null
  pollId: string | null
  pollName: string | null
  message?: string | null
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

/**
 * Asks the backend to actively check this reference against Paystack and
 * reconcile the `Reference` doc if it went through — same idea as
 * spotix-user's callback page (see spotix-backend/v1/verify-payment.js).
 * Used when our own Firestore read still shows "pending" (the webhook
 * may be late or dropped). Returns null on any network/config problem so
 * the caller just falls back to whatever it already has.
 */
async function reconcileWithBackend(
  ref: string,
): Promise<{ reconciled: boolean; status?: string; message?: string } | null> {
  if (!BACKEND_URL) return null
  try {
    const res = await fetch(`${BACKEND_URL}/v1/verify-payment?ref=${encodeURIComponent(ref)}`)
    if (res.status === 429) return { reconciled: false } // rate limited — just fall back
    const json = await res.json()
    if (!res.ok) return null
    return { reconciled: !!json.reconciled, status: json.status, message: json.message }
  } catch {
    return null
  }
}

export function CallbackClient({ pollId }: { pollId: string }) {
  const searchParams = useSearchParams()
  const ref = searchParams.get("ref")

  const [data, setData] = useState<RefData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStatus = useCallback(
    async (isRefresh = false) => {
      if (!ref) {
        setError("No payment reference found.")
        setLoading(false)
        return
      }

      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      try {
        let res = await fetch(`/api/v1/polls/verify?ref=${encodeURIComponent(ref)}`)
        let json = await res.json()

        if (!res.ok) {
          setError(json.error ?? "Failed to fetch payment status.")
          return
        }

        // Still pending on our own record? Ask the backend to actively
        // check with Paystack as the webhook may be late or never landed.
        // Terminal states (successful/failed/incorrect_payment) never re-check.
        if (json.status !== "successful" && json.status !== "failed" && json.status !== "incorrect_payment") {
          const reconcileResult = await reconcileWithBackend(ref)
          if (reconcileResult?.reconciled) {
            res = await fetch(`/api/v1/polls/verify?ref=${encodeURIComponent(ref)}`)
            json = await res.json()
          }
        }

        setData(json)
        setError(null)
      } catch {
        setError("Network error — please check your connection and try again.")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [ref],
  )

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brass border-t-transparent" />
        <p className="text-sm text-muted">Checking payment status…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center">
        <p className="mb-4 text-sm text-danger">{error}</p>
        <button
          onClick={() => fetchStatus()}
          className="rounded-full bg-brass px-5 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-brass-soft"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  if (data.transactionType && data.transactionType !== "voting_purchase") {
    return <WrongTypeState />
  }

  if (data.status === "successful") {
    return (
      <SuccessState
        contestantName={data.contestantName ?? "Unknown contestant"}
        voteCount={data.voteCount ?? 0}
        updatedAt={data.updatedAt ?? new Date().toISOString()}
        pollId={data.pollId ?? pollId}
      />
    )
  }

  if (data.status === "incorrect_payment") {
    return <IncorrectAmountState pollId={data.pollId ?? pollId} message={data.message} />
  }

  if (data.status === "failed") {
    return <FailedState pollId={data.pollId ?? pollId} />
  }

  return <PendingState onRefresh={() => fetchStatus(true)} refreshing={refreshing} />
}
