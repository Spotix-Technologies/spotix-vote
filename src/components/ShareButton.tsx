"use client"

import { useState } from "react"
import { shareOrCopy } from "@/lib/share"

/**
 * src/components/ShareButton.tsx
 *
 * A single reusable share button — used on ContestantCard (poll) and
 * NomineeCard (nominate) alike, just fed a different url/text each time
 * from lib/share.ts's builders. Kept generic on purpose so it doesn't
 * need to know whether it's sharing a vote link or a nomination link.
 */

export interface ShareButtonProps {
  title?: string
  text: string
  url: string
  className?: string
  /** Compact = icon-only circular button (for overlaying on a photo). Default = labeled pill. */
  compact?: boolean
}

function ShareIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m20 6-11 11-5-5" />
    </svg>
  )
}

export function ShareButton({ title, text, url, className = "", compact = false }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const method = await shareOrCopy({ title, text, url })
    if (method === "clipboard") {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Share"
        title="Share"
        className={`flex h-8 w-8 items-center justify-center rounded-full border border-line bg-ink/85 text-paper backdrop-blur-sm transition-colors hover:border-brass ${className}`}
      >
        {copied ? <CheckIcon /> : <ShareIcon />}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-brass hover:text-paper ${className}`}
    >
      {copied ? <CheckIcon /> : <ShareIcon />}
      {copied ? "Copied" : "Share"}
    </button>
  )
}
