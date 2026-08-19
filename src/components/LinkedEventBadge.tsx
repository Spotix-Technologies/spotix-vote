/**
 * src/components/LinkedEventBadge.tsx
 *
 * Mirrors spotix-user's old voting-poll page: if a poll was created from
 * spotix-booker's event dashboard (linking it to a real Spotix event —
 * see linkedEventId/linkedEventName on VoteData), show that link on the
 * poll page instead of leaving it looking unaffiliated.
 *
 * ASSUMPTION: links to spotix.com.ng/events/{linkedEventId} — that's the
 * event-detail URL pattern used elsewhere in the Spotix ecosystem as far
 * as this app can tell, but this app has no direct visibility into
 * spotix-user's actual event-page routing. If that's wrong, this is the
 * one place to fix it.
 */
export function LinkedEventBadge({
  linkedEventId,
  linkedEventName,
}: {
  linkedEventId?: string | null
  linkedEventName?: string | null
}) {
  if (!linkedEventId || !linkedEventName) return null

  return (
    <a
      href={`https://spotix.com.ng/events/${encodeURIComponent(linkedEventId)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-2 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-brass hover:text-paper"
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
        <path d="M16 3v4M8 3v4M4 11h16" />
      </svg>
      Voting for {linkedEventName}
    </a>
  )
}
