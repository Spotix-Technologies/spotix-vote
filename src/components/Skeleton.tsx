/**
 * src/components/Skeleton.tsx
 *
 * Shared pulsing placeholder block, built from the same surface tokens
 * as the rest of the theme (ink-2/ink-3) so it reads correctly in both
 * light and dark mode without any extra config. Used by the elections
 * list and election-ballot `loading.tsx` route skeletons.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-ink-3 ${className}`} />
}
