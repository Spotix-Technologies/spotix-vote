"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import type { NominationPollRow } from "@/lib/nomination-db"
import { useDeviceId } from "./hooks/useDeviceId"
import { NomineeCard } from "./components/NomineeCard"
import { NominationForm } from "./components/NominationForm"
import { ShareButton } from "@/components/ShareButton"
import { CreateYours } from "@/components/CreateYours"
import { SiteHeader } from "@/components/SiteHeader"
import { Footer } from "@/components/Footer"
import { buildNominationShareUrl, buildNominationShareMessage } from "@/lib/share"

type Nominee = { nomineeId: string; name: string; count: number }

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 rounded-full border border-line bg-ink-2 px-4 py-2.5 ${className}`}>
      <SearchIcon />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-paper outline-none placeholder:text-muted"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="shrink-0 text-muted hover:text-paper"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export default function NominateClient({
  pollId,
  poll,
}: {
  pollId: string
  poll: NominationPollRow
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const deviceId = useDeviceId()

  // If arriving via a shared nomination link (?cat=&nominee=), start on
  // that category instead of the first one.
  const catParam = searchParams.get("cat")
  const [activeCategoryId, setActiveCategoryId] = useState(
    (catParam && poll.categories.some((c) => c.categoryId === catParam) ? catParam : poll.categories[0]?.categoryId),
  )
  const [nominees, setNominees] = useState<Nominee[]>([])
  const [loading, setLoading] = useState(true)
  const [prefillName, setPrefillName] = useState<string | undefined>()

  // Search: one bar filters which category chips are shown, the other
  // filters the currently-loaded nominee list (e.g. to check whether
  // someone's already been nominated before adding them again).
  const [categoryQuery, setCategoryQuery] = useState("")
  const [nomineeQuery, setNomineeQuery] = useState("")

  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase()
    if (!q) return poll.categories
    return poll.categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [poll.categories, categoryQuery])

  const filteredNominees = useMemo(() => {
    const q = nomineeQuery.trim().toLowerCase()
    if (!q) return nominees
    return nominees.filter((n) => n.name.toLowerCase().includes(q))
  }, [nominees, nomineeQuery])

  useEffect(() => {
    if (!activeCategoryId) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/v1/polls/nominations/${pollId}/nominees?categoryId=${activeCategoryId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setNominees(data.nominees ?? [])
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [pollId, activeCategoryId])

  // Deep-link handling: a shared link (see NomineeCard's ShareButton /
  // lib/share.ts's buildNominationShareUrl) carries ?cat=<id>&nominee=<name-or-id>.
  // There's no per-nominee modal here (nominating is just the form), so
  // the useful equivalent is prefilling the nomination field with that
  // name — one tap to add to the same nominee instead of typing it out.
  useEffect(() => {
    const nomineeParam = searchParams.get("nominee")
    if (!nomineeParam || loading) return

    const match = nominees.find((n) => n.nomineeId === nomineeParam || n.name === nomineeParam)
    setPrefillName(match?.name ?? nomineeParam)

    router.replace(`/nominate/${encodeURIComponent(pollId)}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  function handleSelectCategory(categoryId: string) {
    setActiveCategoryId(categoryId)
    setNomineeQuery("")
  }

  const closed = poll.status === "closed"
  const activeCategory = poll.categories.find((c) => c.categoryId === activeCategoryId)
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/nominate/${encodeURIComponent(pollId)}` : ""

  return (
    <main className="min-h-screen bg-ink">
      <SiteHeader title={poll.pollName} />

      <div className="relative h-48 w-full sm:h-64">
        {poll.pollImage ? (
          <Image src={poll.pollImage} alt={poll.pollName} fill className="object-cover" priority />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-purple/40 via-ink to-ink" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-3xl px-4 -mt-14 sm:px-6 pb-24">
        <div className="rounded-2xl border border-line bg-ink-2/90 p-6 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-brass-soft">Open nominations</p>
              <h1 className="mt-1 font-display text-3xl text-paper">{poll.pollName}</h1>
            </div>
            <ShareButton
              title={poll.pollName}
              text={`Come nominate someone for ${poll.pollName} on Spotix!`}
              url={shareUrl}
              className="mt-1 shrink-0"
            />
          </div>
          {poll.pollDescription && <p className="mt-3 text-sm text-muted">{poll.pollDescription}</p>}
        </div>

        {poll.categories.length > 1 && (
          <div className="mt-6">
            <SearchInput value={categoryQuery} onChange={setCategoryQuery} placeholder="Search categories…" />

            {/* Horizontally scrollable so a long category list stays one
                row instead of wrapping and pushing the form far down the
                page — swipe/scroll sideways to browse, or use the search
                bar above to jump straight to one. */}
            <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
              {filteredCategories.length === 0 ? (
                <p className="py-2 text-sm text-muted">No categories match "{categoryQuery}".</p>
              ) : (
                filteredCategories.map((c) => (
                  <button
                    key={c.categoryId}
                    onClick={() => handleSelectCategory(c.categoryId)}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
                      c.categoryId === activeCategoryId
                        ? "border-brass bg-brass/10 text-brass-soft"
                        : "border-line text-muted hover:text-paper"
                    }`}
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="mt-6">
          {closed ? (
            <div className="rounded-xl border border-line bg-ink-2 p-4 text-center text-sm text-muted">
              Nominations are closed
              {poll.linkedVotingPollName ? ` — voting is open for ${poll.linkedVotingPollName}.` : "."}
            </div>
          ) : (
            activeCategoryId && (
              <NominationForm
                pollId={pollId}
                categoryId={activeCategoryId}
                deviceId={deviceId}
                initialName={prefillName}
                onNominated={(name) =>
                  setNominees((prev) => {
                    const idx = prev.findIndex((n) => n.name.toLowerCase() === name.toLowerCase())
                    if (idx >= 0) {
                      const next = [...prev]
                      next[idx] = { ...next[idx], count: next[idx].count + 1 }
                      return next.sort((a, b) => b.count - a.count)
                    }
                    return [...prev, { nomineeId: name, name, count: 1 }].sort((a, b) => b.count - a.count)
                  })
                }
              />
            )
          )}
        </div>

        <div className="stub-divider my-8" />

        {activeCategory && (
          <p className="mb-3 text-sm font-medium text-muted">
            Category: <span className="text-paper">{activeCategory.name}</span>
          </p>
        )}

        {nominees.length > 1 && (
          <SearchInput
            value={nomineeQuery}
            onChange={setNomineeQuery}
            placeholder="Search nominees…"
            className="mb-4"
          />
        )}

        <div className="space-y-2">
          {loading ? (
            <p className="text-center text-sm text-muted">Loading nominees…</p>
          ) : nominees.length === 0 ? (
            <p className="text-center text-sm text-muted">No nominations yet — be the first.</p>
          ) : filteredNominees.length === 0 ? (
            <p className="text-center text-sm text-muted">No nominees match "{nomineeQuery}".</p>
          ) : (
            filteredNominees.map((n) => (
              <NomineeCard
                key={n.nomineeId}
                name={n.name}
                count={n.count}
                shareUrl={
                  activeCategoryId ? buildNominationShareUrl(pollId, activeCategoryId, n.nomineeId) : undefined
                }
                shareText={activeCategory ? buildNominationShareMessage(n.name, activeCategory.name) : undefined}
              />
            ))
          )}
        </div>

        <CreateYours />
      </div>

      <Footer />
    </main>
  )
}
