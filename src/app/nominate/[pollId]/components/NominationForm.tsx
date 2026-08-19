"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/Button"

export function NominationForm({
  pollId,
  categoryId,
  deviceId,
  initialName,
  onNominated,
}: {
  pollId: string
  categoryId: string
  deviceId: string | null
  /** Prefills the field — used when arriving via a shared nomination link (see lib/share.ts). */
  initialName?: string
  onNominated: (name: string) => void
}) {
  const [name, setName] = useState(initialName ?? "")

  // initialName resolves asynchronously (deep link -> nominees loaded ->
  // category matched), so sync it in once it arrives if the buyer hasn't
  // already started typing something else themselves.
  useEffect(() => {
    if (initialName && !name) setName(initialName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialName])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!deviceId) {
      setError("We are still setting things on our end. Try again in a moment.")
      return
    }
    if (name.trim().length < 2) {
      setError("Enter a full name.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/polls/nominate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, categoryId, name: name.trim(), deviceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Couldn't submit that nomination")
      setDone(true)
      onNominated(name.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-center text-sm text-success">
        Nomination recorded. Cheers!
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nominate someone by name"
        className="flex-1 rounded-lg border border-line bg-ink px-4 py-2.5 text-paper outline-none focus-visible:border-brass"
        maxLength={60}
      />
      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Nominate"}
      </Button>
      {error && <p className="text-sm text-danger sm:basis-full">{error}</p>}
    </form>
  )
}
