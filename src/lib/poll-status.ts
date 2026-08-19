/**
 * src/lib/poll-status.ts
 *
 * hasPollEnded() — client-only (relies on Date.now()), deliberately kept
 * as a tiny standalone function rather than folded into CountdownTimer
 * so PollClient can compute the same "has this poll ended?" answer for
 * its own winner-reveal logic (see ContestantCard's statsVisible +
 * pollEnded handling) without needing to reach into that component.
 */
export function hasPollEnded(endDate?: string, endTime?: string): boolean {
  if (!endDate) return false
  const target = new Date(`${endDate}T${endTime || "23:59"}`).getTime()
  if (Number.isNaN(target)) return false
  return Date.now() >= target
}
