/**
 * app/election/[electionId]/loading.tsx
 *
 * Route-level loading UI for the ballot page — shown while the server
 * component resolves the voter's accreditation and fetches offices +
 * candidates. Mirrors the real page's hero/card shell.
 */

import { Skeleton } from "@/components/Skeleton"

export default function ElectionBallotLoading() {
  return (
    <main className="min-h-screen bg-ink">
      <div className="sticky top-0 z-40 border-b border-line/70 bg-ink/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Skeleton className="h-7 w-24" />
          <div className="flex min-w-0 flex-1 justify-center">
            <Skeleton className="h-7 w-40 rounded-full" />
          </div>
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        </div>
      </div>

      <div className="relative h-56 w-full sm:h-72">
        <div className="h-full w-full bg-gradient-to-br from-purple/40 via-ink to-ink" />
      </div>

      <div className="mx-auto max-w-2xl px-4 -mt-16 pb-24 sm:px-6">
        <div className="rounded-2xl border border-line bg-ink-2/90 p-6 backdrop-blur">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-8 w-56" />
          <Skeleton className="mt-3 h-4 w-full max-w-md" />
          <Skeleton className="mt-4 h-5 w-28 rounded-full" />
        </div>

        <div className="mt-8 flex flex-col gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-line bg-ink-2 p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {[0, 1, 2].map((j) => (
                  <Skeleton key={j} className="h-12 w-full rounded-lg" />
                ))}
              </div>
              <Skeleton className="mt-4 h-10 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
