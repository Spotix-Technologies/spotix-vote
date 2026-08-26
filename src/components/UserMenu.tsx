"use client"

/**
 * src/components/UserMenu.tsx
 *
 * Lives in the header, next to ThemeToggle, on every page (SiteHeader
 * renders this globally — see that file). Two states:
 *
 *   signed out → a "Log in" pill linking to /auth/login
 *   signed in  → a round Dicebear avatar (michah style, seeded on the
 *                voter's email — same convention as
 *                dicebearAvatarUrl(seed, { style }) used for candidate
 *                photos elsewhere) that opens a dropdown with a link to
 *                /elections and a "Log out" action.
 *
 * Session comes straight from Supabase Auth's browser client — no prop
 * drilling needed since every page that renders SiteHeader gets this
 * for free. onAuthStateChange keeps it in sync the moment someone signs
 * in/out or the OTP flow finishes, without needing a page refresh.
 */

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/election/auth-client"
import { dicebearAvatarUrl } from "@/lib/dicebear"

export function UserMenu() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null | undefined>(undefined) // undefined = still checking
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push("/auth/login")
    router.refresh()
  }

  // Still resolving the session on first paint — reserve the avatar's
  // footprint so the header doesn't jump once we know either way.
  if (email === undefined) {
    return <div className="h-9 w-9 shrink-0 rounded-full" />
  }

  if (email === null) {
    return (
      <Link
        href="/auth/login"
        className="shrink-0 rounded-full bg-brass px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-brass-soft"
      >
        Log in
      </Link>
    )
  }

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={menuOpen}
        className="relative block h-9 w-9 overflow-hidden rounded-full border border-line bg-ink-2 transition-colors hover:border-brass"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dicebearAvatarUrl(email, { style: "micah" })} alt={email} className="h-full w-full object-cover" />
      </button>

      {/* Chevron badge — sits half off the avatar's bottom-right edge so
          it reads as "this opens something" without redrawing the whole
          button as an obvious dropdown trigger (avatars read as tap
          targets on their own; this is just a hint, not the affordance). */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-ink bg-ink-2 text-paper transition-transform ${
          menuOpen ? "rotate-180" : ""
        }`}
      >
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>

      {menuOpen && (
        <div className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-xl border border-line bg-ink-2 shadow-lg">
          <div className="truncate border-b border-line px-4 py-2.5 text-xs text-muted" title={email}>
            {email}
          </div>
          <Link
            href="/elections"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-2.5 text-sm text-paper hover:bg-brass/10"
          >
            Elections
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
