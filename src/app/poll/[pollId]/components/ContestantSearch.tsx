"use client"

import { useMemo, useState } from "react"

/**
 * src/app/poll/[pollId]/components/ContestantSearch.tsx
 *
 * Searches across every contestant already loaded on the page (single
 * poll: poll.contestants; group poll: every leaf category's
 * contestants, flattened by PollClient before this receives them) — no
 * extra network round-trip, the whole poll's data is already client-side.
 *
 * Matching: a name match only kicks in once the query is at least
 * MIN_QUERY_LENGTH characters (avoids a 1–2 character query matching
 * half the list); an exact contestantId match works at ANY length,
 * since IDs are opaque strings a short prefix of wouldn't accidentally
 * collide with someone's name anyway.
 */

const MIN_QUERY_LENGTH = 3
const MAX_RESULTS = 20

export interface SearchableContestant {
  contestantId: string
  name: string
  categoryId?: string
  categoryName?: string
}

export interface ContestantSearchProps {
  contestants: SearchableContestant[]
  onSelect: (contestant: SearchableContestant) => void
  className?: string
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function ContestantSearch({ contestants, onSelect, className = "" }: ContestantSearchProps) {
  const [query, setQuery] = useState("")

  const trimmed = query.trim()
  const q = trimmed.toLowerCase()

  const results = useMemo(() => {
    if (!q) return []

    const idMatches = contestants.filter((c) => c.contestantId.toLowerCase() === q)
    if (q.length < MIN_QUERY_LENGTH) return idMatches

    const nameMatches = contestants.filter(
      (c) => c.contestantId.toLowerCase() !== q && c.name.toLowerCase().includes(q),
    )
    return [...idMatches, ...nameMatches].slice(0, MAX_RESULTS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestants, q])

  const showDropdown = trimmed.length > 0

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-full border border-line bg-ink-2 px-4 py-2.5">
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a contestant…"
          className="w-full bg-transparent text-sm text-paper outline-none placeholder:text-muted"
        />
        {trimmed.length > 0 && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="shrink-0 text-muted hover:text-paper"
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-line bg-ink-2 shadow-lg">
          {trimmed.length < MIN_QUERY_LENGTH && results.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted">
              Keep typing — at least {MIN_QUERY_LENGTH} characters, or paste an exact contestant ID.
            </p>
          ) : results.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted">No contestants found.</p>
          ) : (
            results.map((c) => (
              <button
                key={`${c.categoryId ?? "single"}-${c.contestantId}`}
                type="button"
                onClick={() => {
                  onSelect(c)
                  setQuery("")
                }}
                className="flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-ink-3"
              >
                <span className="truncate text-sm text-paper">{c.name}</span>
                {c.categoryName && <span className="truncate text-xs text-muted">{c.categoryName}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
