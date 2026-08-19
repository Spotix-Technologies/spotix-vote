# Spotix Vote

A standalone Next.js app for Spotix's poll voting and open-nomination flows,
extracted from `spotix-user` into its own project so it can ship its own UI
and its own Vercel deployment (separate build/Active CPU meter) without
touching the main app.

**Talks to the exact same Firebase, Supabase, and Upstash Redis projects as
spotix-user** — this is not a data migration, just a second frontend/API
surface in front of the same backends. Deploy it as its own Vercel project
with the env vars below pointed at those same projects.

## Routes

- `/poll/[pollId]` — the voting page. Single-poll and group-poll (nested
  category) support, tie-breaker eligibility, guest checkout via Paystack,
  and live payment status polling.
- `/nominate/[pollId]` — the open-nomination page. Category tabs, a live
  top-nominee leaderboard, and the nomination form (one nomination per
  device+IP per category, same guard as before).

## What was ported as-is (backend)

Everything under `src/lib/` and `src/app/api/v1/` is the same logic that
runs in spotix-user today — caching, rate limiting, tie-breaker state
machine, Paystack reference creation, and the Supabase nomination RPC —
just with import paths adjusted (`@/app/lib/*` → `@/lib/*`).

One thing was fixed in the process: the original `polls/[pollId]/route.ts`
re-implemented its own uncached Firestore read instead of using the
Redis-cached `getPollByFlatId()` that already existed. This copy uses the
cached version from the start.

## What's simplified (frontend, intentionally)

This is a UI rebuild, not a 1:1 port of every screen. Kept the full voting
and nomination flow; did not port:

- Logged-in Spotix account voting (skip-the-guest-form path) — the API
  routes still accept a Bearer token if you want to wire this back in, but
  the new UI only exposes the guest-checkout form.
- Report-poll modal, fullscreen image viewer, and a few other secondary
  modals from the original UI.
- Contestants without an uploaded image now fall back to a Dicebear avatar
  (same as nominees) instead of a static placeholder graphic, so the app
  ships with zero placeholder image assets.

## Design

A "ballot stub" system — Spotix already prints paper ticket stubs for
events, so the signature element (`.stub-divider` in `globals.css`) is a
perforated stub edge between a contestant's photo and their vote button,
the same visual language as a raffle ticket. Deep purple-black canvas,
brass/gold accent, a serif display face (Fraunces) for names and headings
against an Inter body face, IBM Plex Mono for vote counts and references.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in with the SAME values spotix-user uses
npm run dev
```

Built on Next.js 16.3 (latest stable as of writing).

## Deploying

New Vercel project → same env vars as above → point DNS/subdomain at it
(e.g. `vote.spotix.ng`). Because this is a separate project, its Active CPU
usage is tracked independently of spotix-user's.
