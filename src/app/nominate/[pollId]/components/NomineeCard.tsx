import Image from "next/image"
import { dicebearAvatarUrl } from "@/lib/dicebear"
import { ShareButton } from "@/components/ShareButton"

export interface NomineeCardProps {
  name: string
  count: number
  /** Deep link + prefilled message for this nominee — see lib/share.ts's buildNominationShareUrl/Message. */
  shareUrl?: string
  shareText?: string
}

export function NomineeCard({ name, count, shareUrl, shareText }: NomineeCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-2 p-3">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-line">
        <Image src={dicebearAvatarUrl(name, { style: "micah" })} alt="" fill className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-paper">{name}</p>
      </div>
      <span className="shrink-0 font-mono text-xs text-brass-soft">{count.toLocaleString()}</span>
      {shareUrl && <ShareButton compact title={name} text={shareText ?? `Nominate ${name}!`} url={shareUrl} className="shrink-0" />}
    </div>
  )
}
