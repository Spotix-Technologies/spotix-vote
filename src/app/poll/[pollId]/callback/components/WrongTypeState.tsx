import Link from "next/link"
import { Button } from "@/components/Button"

export function WrongTypeState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brass/10">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brass">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </div>

      <h2 className="font-display text-2xl text-paper">Wrong Transaction Type</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">This reference isn&apos;t a voting transaction.</p>

      <Link href="/" className="mt-6">
        <Button variant="outline">Go Home</Button>
      </Link>
    </div>
  )
}
