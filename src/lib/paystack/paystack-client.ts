/**
 * src/lib/paystack/paystack-client.ts
 *
 * Loads the Paystack inline checkout script and reports readiness.
 * Mirrors spotix-user's src/components/lib/paystack-shared.ts so this
 * app's Paystack behaviour matches the main checkout exactly — split
 * into its own file here (rather than one big shared file) per the
 * "smaller files" ask, since script-loading, customer registration and
 * the actual checkout builder are each independently reusable.
 */

declare global {
  interface Window {
    PaystackPop: any
  }
}

/** Whether the Paystack inline script has finished loading. */
export function isPaystackReady(): boolean {
  return typeof window !== "undefined" && !!window.PaystackPop
}

/**
 * Ensures https://js.paystack.co/v1/inline.js is present in the document,
 * reusing an existing <script> tag if one is already loading (e.g. a
 * previous poll visit in the same session). Resolves once
 * window.PaystackPop is available, or after `timeoutMs` elapses.
 */
export function ensurePaystackScriptLoaded(timeoutMs = 15000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isPaystackReady()) {
      resolve(true)
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.paystack.co/v1/inline.js"]',
    )

    const start = Date.now()
    const poll = () => {
      if (isPaystackReady()) {
        resolve(true)
        return
      }
      if (Date.now() - start > timeoutMs) {
        resolve(false)
        return
      }
      setTimeout(poll, 100)
    }

    if (existing) {
      poll()
      return
    }

    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}
