import Link from "next/link"
import { CallbackClient } from "./CallbackClient"

export const revalidate = 0

export default async function PollCallbackPage({ params }: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await params

  return (
    <main className="min-h-screen bg-ink pb-24">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href={`/poll/${encodeURIComponent(pollId)}`}
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-brass transition-colors hover:text-brass-soft"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Poll
        </Link>

        <div className="rounded-2xl border border-line bg-ink-2 p-6 sm:p-10">
          <CallbackClient pollId={pollId} />
        </div>
      </div>
    </main>
  )
}
