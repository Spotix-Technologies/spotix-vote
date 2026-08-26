"use client"

/**
 * app/auth/login/page.tsx
 *
 * Voter login for "Spotix Vote" accounts. Only signed-in users can vote
 * in an election (see app/elections/page.tsx) — this page is that gate.
 * Chrome (header + blurred background) comes from app/auth/layout.tsx;
 * this file is just the card.
 *
 * On "Email not confirmed" (an account that signed up but never entered
 * their OTP), we send them to /auth/otp instead of showing a raw
 * Supabase error — that's the missing link that made the OTP flow
 * unreachable before: OtpClient.tsx was fully built but nothing ever
 * navigated into it.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/election/auth-client"
import { Button } from "@/components/Button"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (signInError) {
      if (/email not confirmed/i.test(signInError.message)) {
        router.push(`/auth/otp?email=${encodeURIComponent(email)}&loggedInWaitingOTP=true`)
        return
      }
      setError(signInError.message)
      return
    }
    router.push("/elections")
    router.refresh()
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-sm flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-line bg-ink-2/90 p-6 backdrop-blur-md sm:p-8">
        <h1 className="font-display text-2xl text-paper">Sign in to vote</h1>
        <p className="mt-2 text-sm text-muted">Only accredited, signed-in voters can cast a ballot.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-paper">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-paper outline-none focus:border-brass"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-paper">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-paper outline-none focus:border-brass"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/auth/signup" className="text-brass hover:text-brass-soft">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}
