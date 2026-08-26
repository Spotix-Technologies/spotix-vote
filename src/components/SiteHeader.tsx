"use client"

import Image from "next/image"
import Link from "next/link"
import { ThemeToggle } from "./ThemeToggle"
import { UserMenu } from "./UserMenu"

/**
 * src/components/SiteHeader.tsx
 *
 * Sticky top bar used across the app (poll, nominate, elections,
 * election ballot, and now auth pages). Client component because
 * UserMenu needs the browser Supabase session to decide between a
 * "Log in" button and the signed-in avatar dropdown — see that file.
 */
export function SiteHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="https://spotix.com.ng" className="shrink-0" aria-label="Spotix">
          <Image src="/logo.png" alt="Spotix" width={112} height={30} className="h-7 w-auto object-contain" priority />
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">
          <span
            title={title}
            className="max-w-[65vw] truncate rounded-full border border-line/70 bg-ink-2/70 px-4 py-1.5 text-xs font-medium text-paper shadow-sm backdrop-blur-md sm:max-w-md sm:text-sm"
          >
            {title}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
