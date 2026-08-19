/**
 * src/lib/paystack/paystack-customer.ts
 *
 * Splits a full name into first/last for Paystack's checkout form, and
 * registers the payer as a Paystack Customer via the backend BEFORE the
 * checkout widget opens — the exact same call spotix-user's
 * upsertPaystackCustomer makes (src/components/lib/paystack-shared.ts).
 *
 * Paystack's inline checkout only uses `email` to identify/attach a
 * Customer record — the first_name/last_name/phone keys passed into
 * PaystackPop.setup() don't populate transaction.customer on their own.
 * Calling v1/customer/upsert first is what actually gets Paystack to
 * store the buyer's real name against that email.
 *
 * Deliberately fire-and-forget: never awaited by the caller, never
 * allowed to block or fail checkout — if it doesn't land in time, the
 * buyer's name is still preserved in metadata.custom_fields as a
 * fallback (see vote-checkout.ts).
 */

export interface SplitName {
  firstName: string
  lastName: string
}

/**
 * "John Michael Doe" -> { firstName: "John", lastName: "Michael" }
 * "John"              -> { firstName: "John", lastName: "John" }
 * ""                  -> { firstName: "",     lastName: "" }
 */
export function splitFullName(fullName?: string | null): SplitName {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? ""
  const lastName = parts[1] ?? firstName
  return { firstName, lastName }
}

export function upsertPaystackCustomer(
  email: string,
  firstName?: string,
  lastName?: string,
  phone?: string,
): void {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!backendUrl || !email) return

  fetch(`${backendUrl}/v1/customer/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, firstName, lastName, phone }),
  }).catch((err) => {
    console.warn("[upsertPaystackCustomer] Non-blocking failure:", err)
  })
}
