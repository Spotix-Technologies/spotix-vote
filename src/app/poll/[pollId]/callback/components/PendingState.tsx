import { Button } from "@/components/Button"

interface PendingStateProps {
  onRefresh: () => void
  refreshing: boolean
}

export function PendingState({ onRefresh, refreshing }: PendingStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brass/10">
        <svg
          viewBox="0 0 24 24"
          width="34"
          height="34"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="animate-pulse text-brass"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" strokeLinecap="round" />
        </svg>
      </div>

      <h2 className="font-display text-2xl text-paper">Payment Pending</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Spotix is yet to reconcile your payment. If you&apos;ve already paid, kindly refresh this page. If it
        stays pending after a couple of refreshes, please reach out to support with your reference number.
      </p>

      <Button className="mt-6" onClick={onRefresh} disabled={refreshing}>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={refreshing ? "animate-spin" : ""}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v6h-6" />
        </svg>
        {refreshing ? "Checking…" : "Refresh Status"}
      </Button>
    </div>
  )
}
