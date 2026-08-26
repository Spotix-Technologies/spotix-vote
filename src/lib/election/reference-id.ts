/**
 * src/lib/election/reference-id.ts
 *
 * Reference generator for electoral form-fee purchases, following the
 * exact same {prefix}-{timestampMs}-{2 random letters} shape as
 * buildTicketReference/buildVoteReference in lib/reference-id.ts.
 *
 *   SPTX-ELE-{timestampMs}-{AA}   e.g. SPTX-ELE-1755100000000-QK
 */

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function randomLetters(length = 2): string {
  let out = ""
  const cryptoObj: Crypto | undefined = typeof globalThis !== "undefined" ? globalThis.crypto : undefined

  for (let i = 0; i < length; i++) {
    let idx: number
    if (cryptoObj?.getRandomValues) {
      const arr = new Uint32Array(1)
      cryptoObj.getRandomValues(arr)
      idx = arr[0] % ALPHA.length
    } else {
      idx = Math.floor(Math.random() * ALPHA.length)
    }
    out += ALPHA[idx]
  }
  return out
}

/** Builds an electoral-form-fee payment reference: SPTX-ELE-{timestamp}-{AA} */
export function buildElectionReference(timestamp: number = Date.now()): string {
  return `SPTX-ELE-${timestamp}-${randomLetters(2)}`
}
