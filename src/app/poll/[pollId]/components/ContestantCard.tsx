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
  rank,
  disabled,
  disabledReason,
  shareUrl,
  shareText,
  onVote,
}: ContestantCardProps) {
  const src = image?.trim() ? image : dicebearAvatarUrl(name, { style: "avataaars" })

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink-2">
      <div className="relative aspect-[4/5] w-full">
        <Image src={src} alt={name} fill className="object-cover" sizes="(max-width: 640px) 50vw, 240px" />
        {rank === 1 && statsVisible && (
          <span className="absolute left-3 top-3 rounded-full bg-brass px-2.5 py-1 text-[11px] font-semibold text-on-accent font-mono">
            LEADING
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

        {disabled ? (
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
