import Link from "next/link"
import { Button } from "@/components/Button"

interface SuccessStateProps {
  contestantName: string
  voteCount: number
  updatedAt: string
  pollId: string
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-NG", { dateStyle: "long", timeStyle: "short" })
  } catch {
    return iso
  }
}

export function SuccessState({ contestantName, voteCount, updatedAt, pollId }: SuccessStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
          <path d="m20 6-11 11-5-5" />
        </svg>
      </div>

      <h2 className="font-display text-2xl text-paper">Votes Confirmed!</h2>
      <p className="mt-1 text-sm text-muted">Your payment was received and your votes have been counted.</p>

      <div className="mt-8 w-full space-y-3 text-left">
        <div className="rounded-xl border border-line bg-ink-2 px-4 py-3.5">
          <p className="text-xs text-muted">Voted For</p>
          <p className="text-sm font-medium text-paper">{contestantName}</p>
        </div>
        <div className="rounded-xl border border-line bg-ink-2 px-4 py-3.5">
          <p className="text-xs text-muted">Number of Votes</p>
          <p className="text-sm font-medium text-paper">
            {Number(voteCount).toLocaleString()} {Number(voteCount) === 1 ? "vote" : "votes"}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-ink-2 px-4 py-3.5">
          <p className="text-xs text-muted">Payment Date &amp; Time</p>
          <p className="text-sm font-medium text-paper">{formatDateTime(updatedAt)}</p>
        </div>
      </div>

      <Link href={`/poll/${encodeURIComponent(pollId)}`} className="mt-8 w-full">
        <Button className="w-full">Back to Poll</Button>
      </Link>
    </div>
  )
}
