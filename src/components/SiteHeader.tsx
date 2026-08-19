import Image from "next/image"
import Link from "next/link"
import { ThemeToggle } from "./ThemeToggle"

/**
 * src/components/SiteHeader.tsx
 *
 * Sticky top bar used on both the poll and nominate pages — replaces
 * the old "ThemeToggle floating over the hero image" placement, which
 * scrolled away with the hero instead of staying put.
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

        <ThemeToggle className="shrink-0" />
      </div>
    </header>
  )
}
