// Utility functions for voting operations
//
// SERVER-ONLY — this file imports firebase-admin, which requires Node
// builtins (fs, child_process) that don't exist in the browser. NEVER
// import a VALUE from this file into a "use client" component — it will
// break the build ("Module not found: Can't resolve 'child_process'")
// because bundlers pull in this file's entire import graph the moment
// any value (not just a type) is imported from it, even from a client
// component that only wanted one small function.
//
// The pure, dependency-free helpers (getPollStatus, generateContestantId,
// generateCategoryId, pollNameToKey, plus the PollType/PollStatus types)
// live in ./voting-helpers instead — that file has zero server
// dependencies and is safe to import as values from client components.
// This file re-exports them so existing server-side and TYPE-only
// imports (`import type {...} from "./voting-utils"` — always erased at
// compile time, never a bundling risk regardless of what this file
// imports) don't need to change.
//
// Was previously built on the CLIENT Firebase SDK (`firebase/firestore`)
// even though every function here runs server-side (either in a Server
// Component or another server-side helper) — the rest of Spotix uses the
// Admin SDK server-side and the client SDK only for Auth. Migrated to
// `adminDb` to match that, and to unlock Redis caching on the read path
// `getPollByName()` — which is the ACTUAL function the public voting-poll
// page (`spotix-user/src/app/polls/[poll-name]/page.tsx`) calls on every
// single page view, with up to 3 sequential Firestore reads in the worst
// case (direct doc get, a `where("pollName","==",...)` query, then a
// pollKey lookup + nested doc get) and zero caching. That's the page
// every voter lands on before paying — the actual highest-traffic,
// highest-stakes read in the app.
//
// Caching note: pollAmount/pollCount/pollEntries change on real
// successful payments. spotix-backend's voting.js calls
// invalidatePollCache() (see v1/redis.js there) right after crediting a
// vote, so this is normally fresh within moments — the 15s TTL below is
// just the worst-case fallback if that call ever fails or is skipped.
import { adminDb } from "./firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { cacheGet, cacheSet } from "./redis"
import {
  type PollType,
  type PollStatus,
  getPollStatus,
  generateContestantId,
  generateCategoryId,
  pollNameToKey,
  findContestantInPoll,
} from "./voting-helpers"
import { tickTieBreakers, type TieBreakerMap } from "./tie-breaker"

// Re-exported so anything already importing these from voting-utils.ts
// (server code, or TYPE-only imports from client components — those are
// erased at compile time and never pull in this file's runtime code
// either way) keeps working unchanged. Anything importing these as
// VALUES from a client component must import from ./voting-helpers
// directly instead — see that file's header comment for why.
export type { PollType, PollStatus }
export { getPollStatus, generateContestantId, generateCategoryId, pollNameToKey }

// Poll Types

export interface ContestantData {
  contestantId: string
  name: string
  image: string
  votes?: number
}

/**
 * A category in a group poll.
 * Categories can be nested: each category may contain subcategories
 * (which themselves can have subcategories) AND/OR direct contestants.
 * A category that has subcategories acts as a "folder"; one with only
 * contestants is a "leaf".
 */
export interface CategoryData {
  categoryId:     string
  name:           string
  pollPrice:      number              // per-category price
  contestants:    ContestantData[]    // leaf contestants (empty if subcategories exist)
  subcategories?: CategoryData[]      // nested sub-categories (optional)
}

export interface VoteEntry {
  uid:            string
  voteCount:      number
  price:          number
  contestantId:   string
  contestantName: string
  categoryId?:    string              // leaf category that received the vote
  date:           string
  reference:      string
  isGuest:        boolean
}

export interface VoteData {
  pollName:        string
  pollImage:       string
  pollDescription: string
  pollStartDate:   string
  pollStartTime:   string
  pollEndDate:     string
  pollEndTime:     string
  pollAmount:      number
  pollPrice:       number             // single poll price; 0 for group polls
  pollCount:       number
  pollCreation:    string
  pollEntries:     VoteEntry[]
  contestants:     ContestantData[]   // single poll contestants
  categories?:     CategoryData[]     // group poll Tier-1 categories (nested)
  creatorId:       string
  pollType?:       PollType           // "single" | "group" — defaults to "single"
  buyerBearsBurden?: boolean          // true = buyer pays royalty; false = seller absorbs
  statsVisible?:   boolean            // organiser controls vote-count visibility
  suspended?:      boolean            // admin can suspend a poll
  flagged?:        boolean            // admin flag disables payouts
  /** The event (if any) this poll was created from spotix-booker's event dashboard
   *  to link back to — see spotix-booker/app/api/polls/create/route.ts. Shown on
   *  the poll page as "Voting for {linkedEventName}" when present. */
  linkedEventId?:   string | null
  linkedEventName?: string | null
  /**
   * When true, this poll's contestants/categories aren't finalised yet —
   * the organiser created it (name + image already set) but is waiting
   * on an open-nomination poll to close before adding real contestants.
   * The public page shows "Voting Poll coming soon" instead of an empty
   * contestant list. Set at creation, cleared once real contestants are
   * added. See spotix-booker/app/api/polls/create/route.ts.
   */
  contestantsTBD?: boolean
  /**
   * Tie-breaker configuration, set by the organiser via booker's
   * TieBreakerPanel (spotix-booker/app/polls/[pollId]/settings/components/TieBreakerPanel.tsx)
   * and persisted through /api/polls/tiebreaker. tieBreakerRounds of
   * null/undefined means "1 round, then first-past-the-post" — see
   * ./tie-breaker.ts for the full state machine this config drives.
   */
  enabledTieBreaker?: boolean
  tieBreakerDuration?: number | null
  tieBreakerRounds?: number | null
  /** Live tie-breaker round state, keyed by scope ("single" or a leaf categoryId). */
  tieBreakers?: TieBreakerMap
}

// findContestantInPoll lives in ./voting-helpers (it's pure — no
// firebase-admin dependency) and is re-exported below so pollClient.tsx
// (a "use client" component) can import it as a VALUE without pulling
// this file's server-only import graph into the browser bundle.
export { findContestantInPoll }

// Serialisation helpers

function tsToIso(v: unknown): string {
  if (!v) return new Date().toISOString()
  if (v instanceof Timestamp) return v.toDate().toISOString()
  if (typeof v === "object" && v !== null && "seconds" in (v as any))
    return new Date((v as any).seconds * 1000).toISOString()
  if (typeof v === "string" || typeof v === "number") return new Date(v).toISOString()
  return new Date().toISOString()
}

/** Recursively serialize a category tree, ensuring votes default to 0. */
function serializeCategories(cats: any[]): CategoryData[] {
  return (cats || []).map((cat: any) => ({
    ...cat,
    contestants: (cat.contestants || []).map((c: any) => ({ ...c, votes: c.votes ?? 0 })),
    subcategories: cat.subcategories ? serializeCategories(cat.subcategories) : undefined,
  }))
}

// ─── Category subcollection (group polls) ──────────────────────────────────
//
// A group poll's categories live in voting/{pollId}/categories — one doc
// per category node (root or nested) — instead of a `categories` array
// field on the poll doc. See spotix-booker's app/lib/poll-categories.ts
// for the full schema and why: that field could carry 2000+ elements
// once a large tree's contestants were counted too, past what the
// Firestore console could even render, and every vote had to rewrite the
// ENTIRE tree, which raced against votes landing on other categories of
// the same poll at the same moment.
//
// Applies to flat top-level polls (voting/{pollId}) only — a poll still
// living at the legacy nested path (voting/{creatorId}/votes/{voteId})
// predates this and stays on its array field, same as the rest of this
// codebase's existing flat/nested split (see the "Normalize" migration
// referenced throughout spotix-booker).

const CATEGORY_TREE_CACHE_TTL_SECONDS = 60 * 60 // 1hr safety net

function categoryTreeCacheKey(pollId: string): string {
  return `poll-categories:${pollId}`
}

interface RawCategoryDoc {
  categoryId: string
  name: string
  pollPrice: number
  parentId: string | null
  contestants: any[]
}

function buildCategoryTreeFromDocs(docs: RawCategoryDoc[]): CategoryData[] {
  const byParent = new Map<string | null, RawCategoryDoc[]>()
  for (const d of docs) {
    const list = byParent.get(d.parentId) ?? []
    list.push(d)
    byParent.set(d.parentId, list)
  }
  function build(parentId: string | null): CategoryData[] {
    return (byParent.get(parentId) ?? []).map((d) => ({
      categoryId: d.categoryId,
      name: d.name,
      pollPrice: d.pollPrice,
      contestants: (d.contestants ?? []).map((c: any) => ({ ...c, votes: c.votes ?? 0 })),
      subcategories: build(d.categoryId),
    }))
  }
  return build(null)
}

/**
 * Fetches a group poll's category tree — subcollection first, falling
 * back to the legacy `categories` array field only if the subcollection
 * is still empty (poll hasn't been migrated/re-saved since this change).
 *
 * Cached under the SAME Redis key (and matching 1hr safety-net TTL) that
 * booker's fetchCategoryTree() populates and spotix-backend's
 * allocate-vote.js invalidates on every credited vote — all three share
 * one Upstash instance, so a vote from moments ago is already reflected
 * here without this file needing its own invalidation hook.
 */
async function fetchCategoryTreeForPoll(pollId: string, legacyCategories: any[]): Promise<CategoryData[]> {
  const cacheKey = categoryTreeCacheKey(pollId)
  const cached = await cacheGet<CategoryData[]>(cacheKey)
  if (cached) return cached

  try {
    const snap = await adminDb.collection("voting").doc(pollId).collection("categories").get()
    const tree = snap.empty
      ? serializeCategories(legacyCategories ?? [])
      : buildCategoryTreeFromDocs(snap.docs.map((d) => d.data() as RawCategoryDoc))

    await cacheSet(cacheKey, tree, CATEGORY_TREE_CACHE_TTL_SECONDS)
    return tree
  } catch (err) {
    console.error(`[voting-utils] fetchCategoryTreeForPoll failed for ${pollId}:`, err)
    return serializeCategories(legacyCategories ?? [])
  }
}

function serializePollData(data: any): VoteData {
  return {
    ...data,
    pollCreation: tsToIso(data.pollCreation ?? data.createdAt),
    createdAt:    tsToIso(data.createdAt),
    updatedAt:
      typeof data.updatedAt === "string" ? data.updatedAt : tsToIso(data.updatedAt),
    pollEntries: (data.pollEntries || []).map((entry: any) => ({
      ...entry,
      date:
        entry.date instanceof Timestamp
          ? entry.date.toDate().toISOString()
          : typeof entry.date === "object" && entry.date !== null && "seconds" in entry.date
            ? new Date(entry.date.seconds * 1000).toISOString()
            : entry.date,
    })),
    contestants: (data.contestants || []).map((c: any) => ({ ...c, votes: c.votes ?? 0 })),
    categories:
      data.categories ? serializeCategories(data.categories) : undefined,
    linkedEventId:   data.linkedEventId   ?? null,
    linkedEventName: data.linkedEventName ?? null,
    pollType:         data.pollType          ?? "single",
    buyerBearsBurden: data.buyerBearsBurden  ?? true,
    statsVisible:     data.statsVisible      ?? true,
    suspended:        data.suspended         ?? false,
    flagged:          data.flagged           ?? false,
    contestantsTBD:   data.contestantsTBD    ?? false,
    enabledTieBreaker:  data.enabledTieBreaker  ?? false,
    tieBreakerDuration: data.tieBreakerDuration ?? null,
    tieBreakerRounds:   data.tieBreakerRounds   ?? null,
    tieBreakers:        data.tieBreakers        ?? {},
  }
}

/**
 * Rolls a poll's tie-breaker state forward to "now" and persists any
 * transition (round expired → resolved/next round/FPTP) before the poll
 * is served or cached. Cheap no-op for polls without tie-breaker enabled.
 * This is the read-path "tick" — spotix-backend's voting.js does the same
 * thing right before crediting a vote (see v1/lib/tie-breaker.js).
 */
async function tickAndPersistTieBreakers(pollId: string, rawData: any): Promise<any> {
  if (!rawData?.enabledTieBreaker) return rawData
  try {
    const { tieBreakers, changed } = tickTieBreakers(rawData, new Date())
    if (!changed) return rawData
    await adminDb.collection("voting").doc(pollId).update({
      tieBreakers,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { ...rawData, tieBreakers }
  } catch (err) {
    console.error(`[tie-breaker] tick failed for poll ${pollId}:`, err)
    return rawData
  }
}

// Database helpers

export async function checkUserVotingProfile(userId: string): Promise<boolean> {
  try {
    const snap = await adminDb.collection("voting").doc(userId).get()
    return snap.exists
  } catch { return false }
}

export async function createUserVotingProfile(userId: string): Promise<void> {
  await adminDb.collection("voting").doc(userId).set({
    createdAt:     FieldValue.serverTimestamp(),
    totalEarnings: 0,
    totalPolls:    0,
  })
}

export async function getAllUserPolls(
  userId: string,
): Promise<Array<{ id: string; data: VoteData }>> {
  try {
    const snap = await adminDb.collection("voting").doc(userId).collection("votes").get()
    return snap.docs.map((d) => ({ id: d.id, data: serializePollData(d.data()) }))
  } catch { return [] }
}

export async function createVote(
  userId: string,
  voteData: Omit<VoteData, "pollCreation" | "pollCount" | "pollEntries">,
): Promise<string> {
  const userVotesRef = adminDb.collection("voting").doc(userId).collection("votes")
  const voteRef      = userVotesRef.doc()
  const voteId       = voteRef.id

  await voteRef.set({
    ...voteData,
    contestants:  (voteData.contestants || []).map((c) => ({ ...c, votes: 0 })),
    pollCreation: FieldValue.serverTimestamp(),
    pollCount:    0,
    pollAmount:   0,
    pollEntries:  [],
  })

  const pollKey = pollNameToKey(voteData.pollName)
  await adminDb.collection("pollKey").doc(pollKey).set({
    creatorId:       userId,
    voteId,
    pollImage:       voteData.pollImage,
    pollDescription: voteData.pollDescription,
    pollName:        voteData.pollName,
    createdAt:       FieldValue.serverTimestamp(),
  })

  await adminDb.collection("voting").doc(userId).update({ totalPolls: FieldValue.increment(1) })
  return voteId
}

export async function getPollDetails(
  userId: string,
  voteId: string,
): Promise<VoteData | null> {
  try {
    const snap = await adminDb.collection("voting").doc(userId).collection("votes").doc(voteId).get()
    return snap.exists ? serializePollData(snap.data()) : null
  } catch { return null }
}

type ResolvedPoll = { voteId: string; creatorId: string; pollData: VoteData }

/**
 * Shared cache namespace for the two public lookup functions below.
 * Keyed by whatever string the caller passed in (pollId OR pollName) —
 * that's the actual repeat-traffic pattern (the same shared link/URL
 * gets hit over and over), so caching at this level means a repeat view
 * of the same URL costs zero Firestore reads within the TTL window,
 * regardless of which of the 3 lookup strategies resolved it originally.
 *
 * Short TTL (see file header) because there's no write-side invalidation
 * hook into this from the vote-crediting webhook.
 */
const POLL_LOOKUP_CACHE_TTL_SECONDS = 15
function pollLookupCacheKey(input: string): string {
  return `voting-poll-lookup:${input}`
}

/**
 * Resolves a poll by its flat voting/{pollId} doc ID.
 *
 * Most polls live at the top level of the `voting` collection and are
 * found on the first try. A minority of older polls, though, still live
 * nested at voting/{creatorId}/votes/{voteId} — spotix-user's
 * getPollByName() resolves those via its pollKey-lookup fallback (see that
 * file), and the voteId it returns for those polls is a nested subcollection
 * doc ID, NOT a flat top-level one. Without creatorIdHint, a flat lookup on
 * that ID always misses and this returns null even though the poll exists.
 *
 * creatorIdHint (passed as ?creatorId= on the redirect from spotix-user —
 * see spotix-user's polls/[poll-name]/page.tsx) lets us fall back to the
 * nested path on a flat miss, so old shared links keep resolving here too.
 */
export async function getPollByFlatId(
  pollId: string,
  creatorIdHint?: string,
): Promise<ResolvedPoll | null> {
  const cacheKey = pollLookupCacheKey(creatorIdHint ? `${creatorIdHint}:${pollId}` : pollId)
  const cached = await cacheGet<ResolvedPoll>(cacheKey)
  if (cached) return cached

  try {
    // 1. Flat top-level doc — the common case.
    const snap = await adminDb.collection("voting").doc(pollId).get()
    if (snap.exists) {
      let d = snap.data()!
      if (d.pollName) {
        d = await tickAndPersistTieBreakers(pollId, d)
        const creatorId = d.creatorId ?? d.organizerId ?? ""
        const result: ResolvedPoll = { voteId: pollId, creatorId, pollData: serializePollData({ ...d, creatorId }) }
        if (result.pollData.pollType === "group") {
          result.pollData.categories = await fetchCategoryTreeForPoll(pollId, d.categories ?? [])
        }
        await cacheSet(cacheKey, result, POLL_LOOKUP_CACHE_TTL_SECONDS)
        return result
      }
    }

    // 2. Legacy nested poll — only reachable if the caller told us who the
    // creator is, since the flat miss above gives no way to reverse-lookup
    // a nested doc's parent on its own.
    if (creatorIdHint) {
      const nestedSnap = await adminDb
        .collection("voting").doc(creatorIdHint)
        .collection("votes").doc(pollId).get()
      if (nestedSnap.exists) {
        const d = nestedSnap.data()!
        if (d.pollName) {
          const result: ResolvedPoll = {
            voteId: pollId,
            creatorId: creatorIdHint,
            pollData: serializePollData({ ...d, creatorId: creatorIdHint }),
          }
          await cacheSet(cacheKey, result, POLL_LOOKUP_CACHE_TTL_SECONDS)
          return result
        }
      }
    }

    return null
  } catch { return null }
}

export async function getPollByName(
  pollNameOrId: string,
): Promise<ResolvedPoll | null> {
  const cacheKey = pollLookupCacheKey(pollNameOrId)
  const cached = await cacheGet<ResolvedPoll>(cacheKey)
  if (cached) return cached

  try {
    // 1. Try as direct flat pollId
    try {
      const directSnap = await adminDb.collection("voting").doc(pollNameOrId).get()
      if (directSnap.exists) {
        let d = directSnap.data()!
        if (d.pollName) {
          d = await tickAndPersistTieBreakers(directSnap.id, d)
          const creatorId = d.creatorId ?? d.organizerId ?? ""
          const result: ResolvedPoll = { voteId: directSnap.id, creatorId, pollData: serializePollData({ ...d, creatorId }) }
          if (result.pollData.pollType === "group") {
            result.pollData.categories = await fetchCategoryTreeForPoll(directSnap.id, d.categories ?? [])
          }
          await cacheSet(cacheKey, result, POLL_LOOKUP_CACHE_TTL_SECONDS)
          return result
        }
      }
    } catch { /* continue */ }

    // 2. Try flat query by pollName
    try {
      const flatSnap = await adminDb
        .collection("voting")
        .where("pollName", "==", pollNameOrId)
        .limit(1)
        .get()
      if (!flatSnap.empty) {
        const flatDoc   = flatSnap.docs[0]
        let d           = flatDoc.data()
        d = await tickAndPersistTieBreakers(flatDoc.id, d)
        const creatorId = d.creatorId ?? d.organizerId ?? ""
        const result: ResolvedPoll = { voteId: flatDoc.id, creatorId, pollData: serializePollData({ ...d, creatorId }) }
        if (result.pollData.pollType === "group") {
          result.pollData.categories = await fetchCategoryTreeForPoll(flatDoc.id, d.categories ?? [])
        }
        await cacheSet(cacheKey, result, POLL_LOOKUP_CACHE_TTL_SECONDS)
        return result
      }
    } catch { /* continue */ }

    // 3. pollKey lookup (legacy nested voting/{userId}/votes/{voteId} polls)
    const pollKey    = pollNameToKey(pollNameOrId)
    const pollKeyDoc = await adminDb.collection("pollKey").doc(pollKey).get()
    if (!pollKeyDoc.exists) return null
    const { creatorId, voteId } = pollKeyDoc.data()!
    const pollData = await getPollDetails(creatorId, voteId)
    if (!pollData) return null

    const result: ResolvedPoll = { voteId, creatorId, pollData }
    await cacheSet(cacheKey, result, POLL_LOOKUP_CACHE_TTL_SECONDS)
    return result
  } catch { return null }
}
