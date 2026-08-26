/**
 * src/lib/election/paystack/election-checkout.ts
 *
 * Pure "logic" layer for opening the Paystack inline checkout for an
 * electoral form fee — same shape as lib/paystack/vote-checkout.ts,
 * different metadata and transactionType so spotix-backend's webhook
 * can route it to v1/lib/election/index.js instead of the voting
 * pipeline.
 */

import { splitFullName } from "@/lib/paystack/paystack-customer"

export interface ElectionCheckoutMetadata {
  electionId: string
  electionName: string
  officeId: string
  officeName: string
}

export interface OpenElectionCheckoutParams {
  paystackKey: string
  email: string
  /** Naira, not kobo — converted internally. This must be the server-computed totalAmount (formFee + serviceFee), never a client guess. */
  amount: number
  reference: string
  fullName: string
  phone: string
  /** From PAYMENT_METHOD_OPTIONS[x].channels (src/lib/paystack/payment-channels.ts) — narrows the Paystack widget straight to the method the candidate picked. Omit to show every channel. */
  channels?: string[]
  metadata: ElectionCheckoutMetadata
  onSuccess: (reference: string) => void
  onClose: () => void
}

export function openElectionCheckout(params: OpenElectionCheckoutParams) {
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
        { display_name: "Transaction Type", variable_name: "type", value: "election_form_purchase" },
        { display_name: "Full Name", variable_name: "full_name", value: params.fullName ?? "" },
        { display_name: "Phone", variable_name: "phone_number", value: params.phone ?? "" },
        { display_name: "Election", variable_name: "election_name", value: params.metadata.electionName },
        { display_name: "Office", variable_name: "office_name", value: params.metadata.officeName },
        { display_name: "Election ID", variable_name: "election_id", value: params.metadata.electionId },
        { display_name: "Office ID", variable_name: "office_id", value: params.metadata.officeId },
      ],
    },

    callback: (response: any) => params.onSuccess(response.reference),
    onClose: () => params.onClose(),
  })

  handler.openIframe()
  return handler
}
