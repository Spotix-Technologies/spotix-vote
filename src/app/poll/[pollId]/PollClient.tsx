"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import type { VoteData, ContestantData, CategoryData } from "@/lib/voting-utils"
import type { ScopeEligibility } from "@/lib/tie-breaker"
import { ContestantCard } from "./components/ContestantCard"
import { VoteModal } from "./components/VoteModal"
import { Pill } from "@/components/Pill"
import { ShareButton } from "@/components/ShareButton"
import { CreateYours } from "@/components/CreateYours"
import { SiteHeader } from "@/components/SiteHeader"
import { Footer } from "@/components/Footer"
import { CountdownTimer } from "@/components/CountdownTimer"
import { LinkedEventBadge } from "@/components/LinkedEventBadge"
import { buildVotingShareUrl, buildVotingShareMessage } from "@/lib/share"

type PendingVote = { contestantId: string; contestantName: string; categoryId?: string }

function rankContestants(contestants: ContestantData[]) {
  return [...contestants].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))
}

function findLeafCategories(categories: CategoryData[]): CategoryData[] {
  return categories.flatMap((c) =>
    c.subcategories?.length ? findLeafCategories(c.subcategories) : [c],
  )
}

export default function PollClient({
  pollId,
  creatorId,
  poll,
  singleScopeEligibility,
}: {
  pollId: string
  creatorId: string
  poll: VoteData
  singleScopeEligibility: ScopeEligibility | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const leafCategories = useMemo(
    () => (poll.pollType === "group" ? findLeafCategories(poll.categories ?? []) : []),
    [poll],
  )
  const [activeCategoryId, setActiveCategoryId] = useState(leafCategories[0]?.categoryId)
  const [pendingVote, setPendingVote] = useState<PendingVote | null>(null)

  const activeCategory = leafCategories.find((c) => c.categoryId === activeCategoryId)

  // Deep-link handling: a shared link (see ContestantCard's ShareButton /
  // lib/share.ts's buildVotingShareUrl) carries ?contestant=<id>&cat=<id>.
  // On load, jump straight to the right category (group polls) and pop
  // the vote modal open for that contestant — no intermediate screen,
  // exactly the "share a link that just brings up the vote modal" ask.
  useEffect(() => {
    const contestantParam = searchParams.get("contestant")
    if (!contestantParam) return

    const catParam = searchParams.get("cat")
    let match: ContestantData | undefined
    let matchCategoryId: string | undefined

    if (poll.pollType === "group") {
      const category = catParam ? leafCategories.find((c) => c.categoryId === catParam) : undefined
      const scope = category ? [category] : leafCategories
      for (const c of scope) {
        const found = c.contestants.find((ct) => ct.contestantId === contestantParam)
        if (found) {
          match = found
          matchCategoryId = c.categoryId
          break
        }
      }
    } else {
      match = poll.contestants.find((ct) => ct.contestantId === contestantParam)
    }

    if (match) {
      if (matchCategoryId) setActiveCategoryId(matchCategoryId)
      setPendingVote({ contestantId: match.contestantId, contestantName: match.name, categoryId: matchCategoryId })
    }

    // Strip the query params once resolved so refreshing/closing the
    // modal doesn't immediately reopen it, and so the URL bar doesn't
    // keep advertising a stale deep link.
    router.replace(`/poll/${encodeURIComponent(pollId)}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (poll.suspended) {
    return (
      <Shell poll={poll} pollId={pollId}>
        <div className="rounded-2xl border border-danger/40 bg-danger/10 p-6 text-center">
          <p className="text-danger">This poll has been suspended and isn&apos;t accepting votes.</p>
        </div>
      </Shell>
    )
  }

  if (poll.contestantsTBD) {
    return (
      <Shell poll={poll} pollId={pollId}>
        <div className="rounded-2xl border border-line bg-ink-2 p-8 text-center">
          <p className="text-muted">Contestants aren&apos;t announced yet — check back soon.</p>
        </div>
      </Shell>
    )
  }

  const contestantsForScope =
    poll.pollType === "group" ? activeCategory?.contestants ?? [] : poll.contestants
  const scopeKey = poll.pollType === "group" ? activeCategoryId ?? "" : "single"
  const eligibility =
    poll.pollType === "group"
      ? getGroupEligibility(poll, scopeKey)
      : singleScopeEligibility

  const ranked = rankContestants(contestantsForScope)

  return (
    <Shell poll={poll} pollId={pollId}>
      {poll.pollType === "group" && leafCategories.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {leafCategories.map((c) => (
            <button
              key={c.categoryId}
              onClick={() => setActiveCategoryId(c.categoryId)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                c.categoryId === activeCategoryId
                  ? "border-brass bg-brass/10 text-brass-soft"
                  : "border-line text-muted hover:text-paper"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {eligibility?.mode === "closed" && (
        <div className="mb-6">
          <Pill tone="muted">Voting closed for this {poll.pollType === "group" ? "category" : "poll"}</Pill>
        </div>
      )}
      {eligibility?.mode === "tiebreaker" && (
        <div className="mb-6">
          <Pill tone="brass">
            Tie-breaker round {eligibility.round} — only tied contestants can receive votes
          </Pill>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {ranked.map((c, i) => {
          const isEligible =
            !eligibility ||
            eligibility.mode === "open" ||
            (eligibility.mode === "tiebreaker" && eligibility.contestantIds.includes(c.contestantId))
          const categoryId = poll.pollType === "group" ? activeCategoryId : undefined
          return (
            <ContestantCard
              key={c.contestantId}
              contestantId={c.contestantId}
              name={c.name}
              image={c.image}
              votes={c.votes ?? 0}
              statsVisible={poll.statsVisible ?? true}
              rank={i === 0 ? 1 : undefined}
              disabled={!isEligible}
              disabledReason={eligibility?.mode === "closed" ? "Closed" : "Not in this round"}
              shareUrl={buildVotingShareUrl(pollId, c.contestantId, categoryId)}
              shareText={buildVotingShareMessage(c.name, poll.pollName)}
              onVote={() =>
                setPendingVote({
                  contestantId: c.contestantId,
                  contestantName: c.name,
                  categoryId,
                })
              }
            />
          )
        })}
      </div>

      {pendingVote && (
        <VoteModal
          pollId={pollId}
          creatorId={creatorId}
          pollName={poll.pollName}
          pollPrice={poll.pollType === "group" ? activeCategory?.pollPrice ?? 0 : poll.pollPrice}
          buyerBearsBurden={poll.buyerBearsBurden ?? true}
          contestantId={pendingVote.contestantId}
          contestantName={pendingVote.contestantName}
          categoryId={pendingVote.categoryId}
          onClose={() => setPendingVote(null)}
        />
      )}

      <CreateYours />
    </Shell>
  )
}

// Group polls store tie-breaker state per leaf category, keyed by
// categoryId — see tie-breaker.ts's TieBreakerMap.
function getGroupEligibility(poll: VoteData, categoryId: string): ScopeEligibility {
  const tb = poll.tieBreakers?.[categoryId]
  const now = new Date()
  const endTime = new Date(`${poll.pollEndDate}T${poll.pollEndTime || "23:59"}`)
  if (now.getTime() < endTime.getTime()) return { mode: "open" }
  if (tb && (tb.status === "active" || tb.status === "fptp")) {
    return { mode: "tiebreaker", contestantIds: tb.contestantIds, round: tb.round, status: tb.status }
  }
  return { mode: "closed" }
}

function Shell({ poll, pollId, children }: { poll: VoteData; pollId: string; children: React.ReactNode }) {
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/poll/${encodeURIComponent(pollId)}` : ""

  return (
    <main className="min-h-screen bg-ink">
      <SiteHeader title={poll.pollName} />

      <div className="relative h-56 w-full sm:h-72">
        {poll.pollImage ? (
          <Image src={poll.pollImage} alt={poll.pollName} fill className="object-cover" priority />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-purple/40 via-ink to-ink" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-5xl px-4 -mt-16 sm:px-6">
        <div className="rounded-2xl border border-line bg-ink-2/90 p-6 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-brass-soft">Ballot</p>
              <h1 className="mt-1 font-display text-3xl text-paper sm:text-4xl">{poll.pollName}</h1>
            </div>
            <ShareButton
              title={poll.pollName}
              text={`Come vote in ${poll.pollName} on Spotix!`}
              url={shareUrl}
              className="mt-1 shrink-0"
            />
          </div>
          {poll.pollDescription && (
            <p className="mt-3 max-w-2xl text-sm text-muted">{poll.pollDescription}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <LinkedEventBadge linkedEventId={poll.linkedEventId} linkedEventName={poll.linkedEventName} />
            {poll.pollEndDate && !poll.suspended && (
              <CountdownTimer endDate={poll.pollEndDate} endTime={poll.pollEndTime} />
            )}
          </div>
        </div>

        <div className="mt-8 pb-24">{children}</div>
      </div>

      <Footer />
    </main>
  )
}
