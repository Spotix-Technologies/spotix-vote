/**
 * src/lib/election/fees.ts
 *
 * Mirrors spotix-backend's v1/lib/election/fees.js — keep both in sync.
 * The api/v1/election/ref route is the authoritative source of the
 * charged amount (it recomputes this server-side from the office's
 * form_fee, never trusting a client-supplied total); this copy exists
 * for display estimates on the candidate form before checkout opens.
 */

export const ELECTION_ROYALTY_PERCENT = 5
export const ELECTION_FLAT_FEE = 100

export function calcElectionServiceFee(formFee: number): number {
  return Math.round(formFee * (ELECTION_ROYALTY_PERCENT / 100)) + ELECTION_FLAT_FEE
}

export interface ElectionFormFee {
  serviceFee: number
  totalAmount: number
  netAmount: number
}

export function computeElectionFormFee(formFee: number): ElectionFormFee {
  const serviceFee = calcElectionServiceFee(formFee)
  return { serviceFee, totalAmount: formFee + serviceFee, netAmount: formFee }
}
