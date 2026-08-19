"use client"

import { useEffect, useState } from "react"

const KEY = "spotix-vote-device-id"

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Persists a per-browser device id in localStorage, used as one of the
 *  nomination-guard signals on /api/v1/polls/nominate. */
export function useDeviceId(): string | null {
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    try {
      let existing = localStorage.getItem(KEY)
      if (!existing) {
        existing = makeId()
        localStorage.setItem(KEY, existing)
      }
      setId(existing)
    } catch {
      setId(makeId())
    }
  }, [])

  return id
}
