"use client"

/**
 * app/election/[electionId]/components/OfficeBallot.tsx
 *
 * One office's ballot: pick a candidate, cast the vote. Posts to the
 * modular /api/v1/election/vote endpoint — this component never talks
 * to Supabase directly, it's just the UI over that one route.
 *
 * Styling matches ContestantCard/PollClient (stub-divider, ink-2
 * surfaces, brass selection ring) so the elections feature reads as
 * the same product as the poll pages instead of a bare-bones form.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/Button"
import { Pill } from "@/components/Pill"
import { dicebearAvatarUrl } from "@/lib/dicebear"

interface Candidate {
  candidateId: string
  fullName: string
  photoUrl: string
}

export function OfficeBallot({
  electionId,
  officeId,
  officeName,
  candidates,
  hasVoted,
  votingClosed,
}: {
  electionId: string
  officeId: string
  officeName: string
  candidates: Candidate[]
  hasVoted: boolean
  votingClosed: boolean
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voted, setVoted] = useState(hasVoted)

  async function submitVote() {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/election/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId, officeId, candidateId: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Vote could not be registered")
      setVoted(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-ink-2">
      <div className="flex items-center justify-between p-5 pb-4">
        <h2 className="font-display text-lg text-paper">{officeName}</h2>
        {voted && <Pill tone="success">Voted</Pill>}
      </div>

      <div className="stub-divider" />

      <div className="p-5 pt-4">
        {candidates.length === 0 && <p className="text-sm text-muted">No candidates yet for this office.</p>}

        <div className="flex flex-col gap-2">
          {candidates.map((c) => {
            const src = c.photoUrl?.trim() ? c.photoUrl : dicebearAvatarUrl(c.fullName, { style: "avataaars" })
            const isSelected = selected === c.candidateId
            return (
              <label
                key={c.candidateId}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                  isSelected ? "border-brass bg-brass/5" : "border-line"
                } ${voted || votingClosed ? "opacity-60" : "cursor-pointer hover:border-brass/60"}`}
              >
                <input
                  type="radio"
                  name={`office-${officeId}`}
                  disabled={voted || votingClosed}
                  checked={isSelected}
                  onChange={() => setSelected(c.candidateId)}
                  className="accent-[var(--color-brass)]"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={c.fullName} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                <span className="text-sm text-paper">{c.fullName}</span>
              </label>
            )
          })}
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        {!voted && !votingClosed && candidates.length > 0 && (
          <Button onClick={submitVote} disabled={!selected || submitting} className="mt-4 w-full">
            {submitting ? "Casting vote…" : "Cast vote"}
          </Button>
        )}
      </div>
    </section>
  )
}
