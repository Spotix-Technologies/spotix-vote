/**
 * app/elections/loading.tsx
 *
 * Next.js route-level loading UI — shown automatically while the
 * (async, server-component) elections page fetches
 * fetchElectionsForVoterEmail. Mirrors the real page's shell so there's
 * no layout jump once data arrives.
 */

import { Skeleton } from "@/components/Skeleton"

export default function ElectionsLoading() {
  return (
    <main className="min-h-screen bg-ink">
      <div className="sticky top-0 z-40 border-b border-line/70 bg-ink/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Skeleton className="h-7 w-24" />
          <div className="flex min-w-0 flex-1 justify-center">
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        </div>
      </div>

      <div className="relative h-40 w-full sm:h-52">
        <div className="h-full w-full bg-gradient-to-br from-purple/40 via-ink to-ink" />
      </div>

      <div className="mx-auto max-w-2xl px-4 -mt-16 pb-24 sm:px-6">
        <div className="rounded-2xl border border-line bg-ink-2/90 p-6 backdrop-blur">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-8 w-48" />
          <Skeleton className="mt-3 h-4 w-64" />
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-line bg-ink-2 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="mt-3 h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-10 w-24 shrink-0 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
