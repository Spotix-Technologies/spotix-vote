"use client"

import Image from "next/image"
import { dicebearAvatarUrl } from "@/lib/dicebear"
import { Button } from "@/components/Button"
import { ShareButton } from "@/components/ShareButton"

export interface ContestantCardProps {
  contestantId: string
  name: string
  image?: string
  votes: number
  statsVisible: boolean
  /** Has the poll's end date/time already passed? See lib/poll-status.ts. */
  pollEnded: boolean
  rank?: number
  disabled?: boolean
  disabledReason?: string
  /** Deep link + prefilled message for this contestant — see lib/share.ts's buildVotingShareUrl/Message. */
  shareUrl?: string
  shareText?: string
  onVote: () => void
}

export function ContestantCard({
  name,
  image,
  votes,
  statsVisible,
  pollEnded,
  rank,
  disabled,
  disabledReason,
  shareUrl,
  shareText,
  onVote,
}: ContestantCardProps) {
  const src = image?.trim() ? image : dicebearAvatarUrl(name, { style: "avataaars" })

  const isTopRank = rank === 1
  // The vote COUNT is only ever shown when the organiser has stats
  // turned on — that never changes just because the poll ended.
  //
  // The WINNER badge is different: once the poll has ended, who won is
  // no longer "live standings" that could sway an in-progress vote —
  // it's just the result. So it's shown either when stats are on
  // (as "Leading", same as before, while the poll's still running) OR
  // once the poll has ended (as "Winner"), even for an organiser who
  // kept stats hidden throughout — same numbers-hidden guarantee, just
  // a final answer instead of an ongoing tally.
  const showBadge = isTopRank && (statsVisible || pollEnded)
  const badgeLabel = pollEnded ? "WINNER" : "LEADING"

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink-2">
      <div className="relative aspect-[4/5] w-full">
        <Image src={src} alt={name} fill className="object-cover" sizes="(max-width: 640px) 50vw, 240px" />
        {showBadge && (
          <span className="absolute left-3 top-3 rounded-full bg-brass px-2.5 py-1 text-[11px] font-semibold text-on-accent font-mono">
            {badgeLabel}
          </span>
        )}
        {shareUrl && (
          <ShareButton compact title={name} text={shareText ?? `Vote for ${name}!`} url={shareUrl} className="absolute right-3 top-3" />
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display text-lg leading-tight text-paper">{name}</h3>

        {statsVisible && (
          <p className="mt-1 font-mono text-sm text-muted">
            {votes.toLocaleString()} vote{votes === 1 ? "" : "s"}
          </p>
        )}

        <div className="stub-divider my-4" />

        {pollEnded ? (
          <p className="text-xs text-muted">Voting has ended</p>
        ) : disabled ? (
          <p className="text-xs text-muted">{disabledReason ?? "Voting isn't open here."}</p>
        ) : (
          <Button className="w-full" onClick={onVote}>
            Vote
          </Button>
        )}
      </div>
    </div>
  )
}
