/**
 * src/app/api/v1/polls/[pollId]/route.ts
 *
 * GET /api/v1/polls/:pollId
 *
 * Fetches a single poll from the FLAT voting/{pollId} collection.
 * Public endpoint — no auth required (polls are publicly viewable).
 *
 * Supports both single and group polls (including nested subcategories).
 * Returns statsVisible, suspended, flagged, pollType, categories tree.
 *
 * CHANGELOG 2026-08-17: was doing its own uncached adminDb.get() on every
 * call. This is the route event/[eventId]/voting.tsx calls on mount, which
 * means it fired on EVERY event page view that has a poll attached — the
 * single highest fan-out read in the app — while never touching the
 * Redis-backed getPollByFlatId()/single-flight cache that voting-utils.ts
 * already built for this exact read pattern (see lib/redis.ts,
 * lib/eventCache.ts, and the [poll-name]/page.tsx server component, which
 * already went through getPollByName()). Routed through getPollByFlatId()
 * instead so this path gets the same cache hit rate, single-flight
 * de-dupe on concurrent misses, and tie-breaker ticking as the rest of
 * the voting system. Response shape (poll.contestants/categories/etc.) is
 * unchanged, so no frontend changes were needed.
 * CHANGELOG 2026-08-18: added an optional ?creatorId= hint, forwarded to
 * getPollByFlatId() so legacy nested polls (voting/{creatorId}/votes/{id})
 * resolve here too, not just flat top-level ones. See voting-utils.ts for
 * why the hint is required (a flat-collection miss alone can't reverse a
 * nested doc's parent). spotix-user's redirect passes this automatically.
 */

import { NextRequest, NextResponse } from "next/server"
import { getPollByFlatId } from "@/lib/voting-utils"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> },
) {
  const { pollId } = await params
  const creatorIdHint = req.nextUrl.searchParams.get("creatorId") ?? undefined

  if (!pollId?.trim()) {
    return NextResponse.json({ error: "pollId is required" }, { status: 400 })
  }

  try {
    const result = await getPollByFlatId(pollId, creatorIdHint)

    if (!result) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, poll: result.pollData, pollId }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/v1/polls/[pollId]] Error:", err)
    return NextResponse.json({ error: "Failed to fetch poll" }, { status: 500 })
  }
}
