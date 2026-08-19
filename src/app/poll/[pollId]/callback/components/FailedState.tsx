import Link from "next/link"
import { Button } from "@/components/Button"

interface FailedStateProps {
  pollId: string
}

export function FailedState({ pollId }: FailedStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-danger/10">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-danger">
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </svg>
      </div>

      <h2 className="font-display text-2xl text-paper">Payment Didn&apos;t Go Through</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Your payment wasn&apos;t successful and you haven&apos;t been charged. If you believe you were charged,
        please reach out to support with your reference number and we&apos;ll sort it out promptly.
      </p>

      <Link href={`/poll/${encodeURIComponent(pollId)}`} className="mt-6">
        <Button variant="outline">Vote Again</Button>
      </Link>
    </div>
  )
}
