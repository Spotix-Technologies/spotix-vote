"use client"

import { useEffect, useMemo, useRef, useState } from "react"

/**
 * src/components/CountdownTimer.tsx
 *
 * Counts down from now to a poll's end date/time. When it hits zero
 * while someone's actively on the page, forces a full page reload —
 * the simplest way to guarantee they see the real "voting has ended"
 * state (closed/tie-breaker eligibility, disabled Vote buttons, etc.)
 * straight from the server instead of this component trying to
 * reproduce that logic client-side and risk drifting out of sync with
 * PollClient's own eligibility checks.
 */

export interface CountdownTimerProps {
  endDate: string // "YYYY-MM-DD"
  endTime: string // "HH:mm"
  className?: string
}

interface Remaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  msLeft: number
}

function getRemaining(targetMs: number): Remaining {
  const msLeft = Math.max(0, targetMs - Date.now())
  const totalSeconds = Math.floor(msLeft / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    msLeft,
  }
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <span className="tabular-nums text-paper">
      {String(value).padStart(2, "0")}
      <span className="ml-0.5 text-[10px] text-muted">{label}</span>
    </span>
  )
}

export function CountdownTimer({ endDate, endTime, className = "" }: CountdownTimerProps) {
  const targetMs = useMemo(() => {
    const t = new Date(`${endDate}T${endTime || "23:59"}`).getTime()
    return Number.isNaN(t) ? Date.now() : t
  }, [endDate, endTime])

  const [remaining, setRemaining] = useState<Remaining | null>(null)
  const hasReloadedRef = useRef(false)

  // Computed after mount only (not during SSR) — Date.now() at render time
  // would otherwise differ between server and client and trigger a
  // hydration mismatch.
  useEffect(() => {
    const initial = getRemaining(targetMs)
    setRemaining(initial)

    // Already over (or endDate/endTime didn't parse, in which case
    // targetMs above fell back to "now") by the time this mounted —
    // there's nothing to count down, and definitely nothing to force a
    // reload over. Without this guard, the interval below sees msLeft
    // <= 0 on its very first tick, reloads, the fresh page mounts this
    // component again, sees the same already-ended state, and reloads
    // again — a loop that reloads roughly once a second forever, for as
    // long as anyone stays on an already-ended poll's page.
    if (initial.msLeft <= 0) {
      hasReloadedRef.current = true
    }

    const interval = setInterval(() => {
      const next = getRemaining(targetMs)
      setRemaining(next)

      if (next.msLeft <= 0 && !hasReloadedRef.current) {
        hasReloadedRef.current = true
        clearInterval(interval)
        window.location.reload()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [targetMs])

  if (!remaining) {
    // Nothing rendered until mount — avoids a flash of a wrong countdown
    // before the interval above has run once.
    return null
  }

  if (remaining.msLeft <= 0) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-line bg-ink-2 px-4 py-2 font-mono text-xs text-muted ${className}`}
      >
        Voting has ended
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-2xl border border-line bg-ink-2 px-4 py-2.5 ${className}`}
    >
      <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted sm:inline">
        Ends in
      </span>
      <div className="flex items-center gap-1.5 font-mono text-sm">
        {remaining.days > 0 && (
          <>
            <TimeUnit value={remaining.days} label="d" />
            <span className="text-brass-soft">:</span>
          </>
        )}
        <TimeUnit value={remaining.hours} label="h" />
        <span className="text-brass-soft">:</span>
        <TimeUnit value={remaining.minutes} label="m" />
        <span className="text-brass-soft">:</span>
        <TimeUnit value={remaining.seconds} label="s" />
      </div>
    </div>
  )
}
