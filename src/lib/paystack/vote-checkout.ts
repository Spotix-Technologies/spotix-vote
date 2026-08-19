/**
 * src/lib/paystack/vote-checkout.ts
 *
 * Pure "logic" layer for opening the Paystack inline checkout for a vote
 * purchase — no React state. Mirrors spotix-user's
 * src/components/lib/vote-payment-utility.ts, with one addition: a
 * `channels` array so the pre-selected payment method (see
 * payment-channels.ts) skips Paystack's own method picker and opens
 * straight into that flow.
 */

import { splitFullName } from "./paystack-customer"

export interface VoteCheckoutMetadata {
  pollId: string
  pollName: string
  contestantId: string
  contestantName: string
  voteCount: number
  organizerId: string
  categoryId?: string | null
}

export interface OpenVoteCheckoutParams {
  paystackKey: string
  email: string
  /** Naira, not kobo — converted internally. */
  amount: number
  reference: string
  fullName: string
  phone: string
  /** Paystack channels to restrict checkout to, e.g. ["card"]. Empty/omitted = Paystack's default full picker. */
  channels?: string[]
  metadata: VoteCheckoutMetadata
  onSuccess: (reference: string) => void
  /** Fires when the buyer closes the widget without completing payment. */
  onClose: () => void
}

/**
 * Builds and opens the Paystack inline checkout for a voting purchase.
 * Returns the Paystack handler instance, or null if window.PaystackPop
 * isn't ready yet.
 */
export function openVoteCheckout(params: OpenVoteCheckoutParams) {
  const PS = (window as any).PaystackPop
  if (!PS) return null

  const { firstName, lastName } = splitFullName(params.fullName)

  const handler = PS.setup({
    key: params.paystackKey,
    email: params.email,
    amount: Math.round(params.amount * 100), // kobo
    currency: "NGN",
    ref: params.reference,
    ...(params.channels && params.channels.length > 0 ? { channels: params.channels } : {}),

    first_name: firstName,
    last_name: lastName,
    phone: params.phone ?? "",

    metadata: {
      custom_fields: [
        { display_name: "Transaction Type", variable_name: "type", value: "voting_purchase" },
        { display_name: "Full Name", variable_name: "full_name", value: params.fullName ?? "" },
        { display_name: "Phone", variable_name: "phone_number", value: params.phone ?? "" },
        { display_name: "Poll", variable_name: "poll_name", value: params.metadata.pollName },
        { display_name: "Contestant", variable_name: "contestant_name", value: params.metadata.contestantName },
        { display_name: "Vote Count", variable_name: "vote_count", value: String(params.metadata.voteCount) },
        { display_name: "Poll ID", variable_name: "poll_id", value: params.metadata.pollId },
        { display_name: "Organizer ID", variable_name: "organizer_id", value: params.metadata.organizerId },
        { display_name: "Contestant ID", variable_name: "contestant_id", value: params.metadata.contestantId },
        ...(params.metadata.categoryId
          ? [{ display_name: "Category ID", variable_name: "category_id", value: params.metadata.categoryId }]
          : []),
      ],
    },

    callback: (response: any) => params.onSuccess(response.reference),
    onClose: () => params.onClose(),
  })

  return handler
}
