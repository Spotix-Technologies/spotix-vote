import Link from "next/link"
import { Button } from "@/components/Button"

interface IncorrectAmountStateProps {
  pollId: string
  message?: string | null
}

const DEFAULT_MESSAGE =
  "It looks like you transferred an incorrect amount for this payment. Don't worry a reversal will be made " +
  "back to your original payment method within 48 business hours. If you don't see it reflected after that, " +
  "please reach out to support."

export function IncorrectAmountState({ pollId, message }: IncorrectAmountStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brass/10">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brass">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </div>

      <h2 className="font-display text-2xl text-paper">Incorrect Amount Sent</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">{message ?? DEFAULT_MESSAGE}</p>

      <Link href={`/poll/${encodeURIComponent(pollId)}`} className="mt-6">
        <Button variant="outline">Back to Poll</Button>
      </Link>
    </div>
  )
}
