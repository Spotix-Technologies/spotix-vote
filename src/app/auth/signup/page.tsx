"use client"

/**
 * app/auth/signup/page.tsx
 *
 * Voter account creation. Signing up does NOT by itself accredit anyone
 * to vote anywhere — accreditation is the organiser uploading this
 * email into election_voters (see spotix-booker's voter list upload).
 * This just creates the Spotix Vote account a voter signs into.
 *
 * After signUp() succeeds, Supabase emails a 6-digit confirmation code
 * — we now send the candidate straight to /auth/otp to enter it,
 * instead of the old "check your email" dead end that never actually
 * linked anywhere. (This requires the Supabase project's "Confirm
 * signup" email template to use {{ .Token }}, not {{ .ConfirmationURL }}
 * — see /auth/otp/page.tsx's header comment.)
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/election/auth-client"
import { Button } from "@/components/Button"

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

    setLoading(false)
    if (signUpError) {
      setError(signUpError.message)
      return
    }
    router.push(`/auth/otp?email=${encodeURIComponent(email)}`)
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-sm flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-line bg-ink-2/90 p-6 backdrop-blur-md sm:p-8">
        <h1 className="font-display text-2xl text-paper">Create your account</h1>
        <p className="mt-2 text-sm text-muted">Use the same email address your election organiser has on file.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-paper">
            Full name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-paper outline-none focus:border-brass"
              placeholder="Jane Doe"
            />
          </label>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-paper outline-none focus:border-brass"
              placeholder="At least 8 characters"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-brass hover:text-brass-soft">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
