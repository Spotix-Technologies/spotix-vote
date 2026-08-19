import Image from "next/image"

/**
 * src/components/CreateYours.tsx
 *
 * Bottom-of-page CTA shown on both the poll and nominate pages,
 * pointing visitors who came in just to vote/nominate back toward
 * signing up and creating their own poll on Spotix.
 *
 * CTA.svg is expected at /public/CTA.svg — referenced here but not
 * included in this change (added separately).
 */
export function CreateYours() {
  return (
    <section className="mx-auto mt-14 max-w-2xl rounded-2xl border border-line bg-ink-2 p-6 text-center sm:p-10">
      <div className="mx-auto w-full max-w-xs">
        <Image
          src="/CTA.svg"
          alt=""
          width={320}
          height={220}
          className="h-auto w-full"
          priority={false}
        />
      </div>

      <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted sm:text-base">
        Want something like this? Spotix makes polls and nominations fast and easy! Click the link below to
        signup and get started!
      </p>

      <a
        href="https://spotix.com.ng/auth/signup"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-brass px-6 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-brass-soft"
      >
        Get Started with Spotix
      </a>
    </section>
  )
}
