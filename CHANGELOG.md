# Changelog

## 2026-08-18 — Initial extraction

- New standalone Next.js 16.3 app, extracted from `spotix-user`'s poll
  voting and open-nomination code.
- Ported as-is: `redis.ts`, `voting-utils.ts`, `voting-helpers.ts`,
  `tie-breaker.ts`, `nomination-db.ts`, `nomination-config.ts`,
  `supabase.ts`, `firebase-admin.ts`, `dicebear.ts`, `reference-id.ts`,
  `request-ip.ts`, `share.ts`, `auth-tokens.ts`, `paymentMessages.ts`
  (renamed `payment-messages.ts`).
- Ported as-is: `/api/v1/polls/[pollId]`, `/api/v1/polls/verify`,
  `/api/v1/polls/nominate`, `/api/v1/polls/nominations/[pollId]`,
  `/api/v1/polls/nominations/[pollId]/nominees`, `/api/v1/vote/payref`,
  `/api/v1/vote/check-payment`.
- Fixed in the process: `/api/v1/polls/[pollId]` now uses the
  Redis-cached `getPollByFlatId()` instead of its own uncached Firestore
  read (this was the route causing spotix-user's Active CPU spike).
- New: clean "ballot stub" UI for both `/poll/[pollId]` and
  `/nominate/[pollId]` — see README for the design system and what was
  intentionally left out of this first pass.
