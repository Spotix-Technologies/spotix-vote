"use client"

/**
 * src/app/auth/layout.tsx
 *
 * Shared chrome for /auth/login, /auth/signup, and /auth/otp — the
 * SiteHeader (with the same logo/theme-toggle/UserMenu every other page
 * gets) plus a blurred full-bleed background photo (public/auth.jpg —
 * add that file; nothing renders behind the header/card without it,
 * just the plain ink background as a graceful fallback).
 *
 * Client component so the pill title can react to which auth page is
 * actually active — "Log in" / "Sign up" / "Verify email" — without
 * each page needing to pass its own title down through props.
 */

import { usePathname } from "next/navigation"
import { SiteHeader } from "@/components/SiteHeader"

function pillTitleFor(pathname: string | null) {
  if (pathname?.includes("/auth/signup")) return "Sign up"
  if (pathname?.includes("/auth/otp")) return "Verify email"
  return "Log in"
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="relative min-h-screen bg-ink">
      <div
        className="fixed inset-0 -z-10 scale-110 bg-cover bg-center blur-xl"
        style={{ backgroundImage: "url(/auth.jpg)" }}
        aria-hidden
      />
      <div className="fixed inset-0 -z-10 bg-ink/70" aria-hidden />

      <SiteHeader title={pillTitleFor(pathname)} />

      {children}
    </div>
  )
}
