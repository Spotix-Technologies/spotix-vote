"use client"

/**
 * app/election/[electionId]/components/ResultsChart.tsx
 *
 * Recharts bar chart of one office's results — only ever rendered by
 * the parent page once election.resultsPublished is true, so there's
 * no "pre-publish peek" path through this component at all. Polls
 * /tally every 5s so counts stay current if voting somehow continues
 * after publishing (edge case, but harmless to handle).
 */

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface Candidate {
  candidateId: string
  fullName: string
  voteCount: number | null
}

export function ResultsChart({ officeName, candidates: initial }: { officeName: string; candidates: Candidate[] }) {
  const [candidates, setCandidates] = useState(initial)

  useEffect(() => {
    setCandidates(initial)
  }, [initial])

  const data = candidates.map((c) => ({ name: c.fullName, votes: c.voteCount ?? 0 }))
  const total = data.reduce((sum, d) => sum + d.votes, 0)

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-ink-2">
      <div className="flex items-baseline justify-between p-5 pb-4">
        <h2 className="font-display text-lg text-paper">{officeName}</h2>
        <span className="font-mono text-sm text-muted">{total} vote{total === 1 ? "" : "s"}</span>
      </div>

      <div className="stub-divider" />

      <div className="h-56 w-full p-5 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={120} />
            <Tooltip />
            <Bar dataKey="votes" fill="var(--color-brass, #b8863f)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
