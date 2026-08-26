/**
 * src/app/api/v1/vote/payref/route.ts
 *
 * POST /api/v1/vote/payref
 *
 * Creates a Paystack payment reference for a voting purchase and stores a
 * pending document in the `Reference` collection (same collection used by
 * ticket purchases — see backend v1/ticket.js).
 *
 * Reference format : sptx-vt-{timestamp}-{2 random letters}
 * transactionType  : voting_purchase
 *
 * Supports both single and group polls (categoryId is optional but
 * required for group polls so the webhook knows which category to update).
 * Also stores buyerBearsBurden + serviceFee for payout calculations.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { getScopeEligibility } from "@/lib/tie-breaker"
import { buildVoteReference } from "@/lib/reference-id"
import { createSupabaseServerClient } from "@/lib/election/auth-server"
import { fetchVoterProfile, upsertVoterPhone } from "@/lib/election/voter-profile"

export async function POST(request: NextRequest) {
  let body: Record<string, any>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) }

  const {
    pollId,
    voteId,          // legacy alias
    creatorId,
    contestantId,
    contestantName,
    pollPrice,
    voteCount,
    totalAmount,
    pollName,
    categoryId,      // group polls
    buyerBearsBurden,
    serviceFee,
    // Identity — guestName/guestEmail only used when nobody's signed in.
    // guestPhone doubles as "the phone number typed at checkout" for BOTH
    // guests and signed-in voters — see the signed-in branch below, which
    // writes it back to voter_profiles when it's new/changed.
    guestName,
    guestEmail,
    guestPhone,
  } = body

  const resolvedPollId = pollId ?? voteId

  // Small helper so a blank/whitespace-only stored value (e.g. fullName: "")
  // falls through to the next option, same as the ticket flow's `||` chains —
  // `??` alone only catches null/undefined, not "".
  const firstNonBlank = (...vals: (string | null | undefined)[]): string | null => {
    for (const v of vals) {
      if (v && v.trim()) return v.trim()
    }
    return null
  }

  // ── Validate required fields ───────────────────────────────────────────────
  if (!resolvedPollId || !creatorId || !contestantId || !contestantName) {
    return NextResponse.json({ error: "Missing required poll/contestant fields" }, { status: 400 })
  }
  if (pollPrice === undefined || voteCount === undefined || totalAmount === undefined) {
    return NextResponse.json({ error: "Missing pricing fields" }, { status: 400 })
  }
  if (Number(voteCount) < 1) {
    return NextResponse.json({ error: "voteCount must be at least 1" }, { status: 400 })
  }

  // ── Poll existence, suspension & voting-eligibility check ─────────────────
  // This is the real gate for tie-breaker eligibility — reject BEFORE money
  // changes hands rather than after (the webhook only re-checks defensively).
  try {
    const pollSnap = await adminDb.collection("voting").doc(resolvedPollId).get()
    if (!pollSnap.exists) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })
    }
    const pd = pollSnap.data()!
    if (pd.suspended === true) {
      return NextResponse.json({ error: "This poll has been suspended and is not accepting votes" }, { status: 403 })
    }

    const scopeKey = pd.pollType === "group" ? categoryId : "single"
    const eligibility = getScopeEligibility(pd as any, scopeKey, new Date())

    if (eligibility.mode === "closed") {
      return NextResponse.json(
        { error: "Voting has ended for this poll and there's nothing left to decide here." },
        { status: 403 },
      )
    }
    if (eligibility.mode === "tiebreaker" && !eligibility.contestantIds.includes(contestantId)) {
      return NextResponse.json(
        {
          error: eligibility.status === "fptp"
            ? "This category is down to a first-past-the-post tie-breaker between the tied contestants only."
            : `A tie-breaker round (round ${eligibility.round}) is open between the tied contestants only.`,
        },
        { status: 403 },
      )
    }
  } catch (err) {
    console.error("[vote/payref] Poll fetch error:", err)
    return NextResponse.json({ error: "Failed to verify poll" }, { status: 500 })
  }

  // ── Resolve payer identity ─────────────────────────────────────────────────
  // Spotix Vote's voter accounts live in Supabase Auth (see lib/election/
  // auth-server.ts / auth-client.ts) — the httpOnly session cookie rides
  // along automatically on this same-origin fetch, so we read it directly
  // instead of expecting the client to attach a bearer token. See
  // lib/auth-tokens.ts's "spotix-vote" audience note for why this app
  // doesn't use the jose-JWT path the other Spotix portals use.
  let verifiedUserId: string | null = null
  let payerEmail: string | null = null
  let payerName:  string | null = null
  let payerPhone: string | null = null

  const supabaseServer = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (user?.email) {
    verifiedUserId = user.id
    payerEmail = firstNonBlank(user.email)
    // Logged-in voters skip the "details" form entirely (see VoteModal),
    // so this is the ONLY place a name gets set for them — unlike the
    // guest path, there's no form to fall back to. Never let this end up
    // null/empty, or upsertPaystackCustomer ends up sending no
    // first_name/last_name to Paystack at all.
    payerName = firstNonBlank(user.user_metadata?.full_name) ?? "Valued Customer"

    // Phone: voter_profiles is the source of truth (kept fresh here);
    // fall back to whatever was captured at signup if the profile row
    // is somehow missing it.
    const profile = await fetchVoterProfile(verifiedUserId).catch(() => null)
    payerPhone = firstNonBlank(profile?.phone, user.user_metadata?.phone)

    // "If they fill in their number, store it back" — a signed-in voter
    // typing a new/changed phone at checkout updates their profile for
    // next time, fire-and-forget so it never blocks the vote.
    const typedPhone = guestPhone?.trim()
    if (typedPhone && typedPhone !== payerPhone) {
      payerPhone = typedPhone
      upsertVoterPhone(verifiedUserId, payerEmail, typedPhone).catch((err) =>
        console.error("[vote/payref] Failed to save phone back to voter_profiles:", err),
      )
    }
  } else {
    if (!guestEmail?.trim() || !guestName?.trim()) {
      return NextResponse.json(
        { error: "Guest name and email are required for non-authenticated users" },
        { status: 400 },
      )
    }
    payerEmail = guestEmail.trim()
    payerName  = guestName.trim()
    payerPhone = guestPhone?.trim() ?? null
  }

  // ── Amount sanity check ────────────────────────────────────────────────────
  // totalAmount already includes service fee if buyerBearsBurden=true
  // We verify the base amount is correct; service fee is passed separately
  const baseExpected = Number(pollPrice) * Number(voteCount)
  const feeAmount    = Number(serviceFee ?? 0)
  const fullExpected = baseExpected + feeAmount
  if (Math.round(fullExpected) !== Math.round(Number(totalAmount))) {
    return NextResponse.json({ error: "Amount mismatch — recalculate and retry" }, { status: 400 })
  }

  // ── Reference generation ───────────────────────────────────────────────────
  // 2 random letters appended after the timestamp so two votes landing in
  // the same millisecond can't collide on the same Reference doc ID — see
  // src/app/lib/reference-id.ts.
  const timestamp = Date.now()
  const reference = buildVoteReference(timestamp)

  // ── Store in Reference collection ──────────────────────────────────────────
  const refDoc: Record<string, any> = {
    reference,
    transactionType: "voting_purchase",

    // Poll details — both field name aliases for backward compat
    pollId:         resolvedPollId,
    voteId:         resolvedPollId,
    organizerId:    creatorId,
    creatorId,
    contestantId,
    contestantName: contestantName ?? "",
    pollName:       pollName ?? "",
    pollPrice:      Number(pollPrice),
    voteCount:      Number(voteCount),
    totalAmount:    fullExpected,

    // Royalty / fee tracking
    buyerBearsBurden: buyerBearsBurden ?? true,
    serviceFee:       feeAmount,

    // Payer
    userId:     verifiedUserId ?? null,
    isGuest:    !verifiedUserId,
    payerName:  payerName  ?? null,
    payerEmail: payerEmail ?? null,
    payerPhone: payerPhone ?? null,
    guestName:  !verifiedUserId ? payerName  : null,
    guestEmail: !verifiedUserId ? payerEmail : null,

    status:  "pending",
    vendor:  "paystack",

    createdAt:                new Date().toISOString(),
    updatedAt:                new Date().toISOString(),
    paymentCreationTimestamp: timestamp,

    metadata: {
      pollId:        resolvedPollId,
      contestantId,
      contestantName,
      pollName,
      voteCount:     Number(voteCount),
      userType:      verifiedUserId ? "registered" : "guest",
    },
  }

  // Only add categoryId to the ref if this is a group poll vote
  if (categoryId) {
    refDoc.categoryId              = categoryId
    refDoc.metadata.categoryId     = categoryId
  }

  try {
    await adminDb.collection("Reference").doc(reference).set(refDoc)
  } catch (err) {
    console.error("[vote/payref] Firestore write error:", err)
    return NextResponse.json({ error: "Failed to store payment reference" }, { status: 500 })
  }

  return NextResponse.json(
    {
      success:    true,
      reference,
      payerName:  payerName  ?? null,
      payerEmail: payerEmail ?? null,
      payerPhone: payerPhone ?? null,
    },
    { status: 201 },
  )
}
