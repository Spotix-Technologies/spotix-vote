import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchNominationPoll, fetchTopNominees } from "@/lib/nomination-db"
import { NOMINEE_LIST_LIMIT } from "@/lib/nomination-config"
import NominateClient from "./NominateClient"

export const revalidate = 0

const FALLBACK_OG_IMAGE = "/OG.png" // public/OG.png — recommended 1200x630 (1.91:1)

type PageParams = { pollId: string }
type PageSearchParams = { cat?: string; nominee?: string }

/**
 * Per-nominee links (built by NomineeCard's ShareButton via
 * lib/share.ts's buildNominationShareUrl) carry ?cat=&nominee= on this
 * same route, so the right OG data for a shared link is resolved here
 * from those params. Open-nomination nominees never carry a photo (it's
 * a name-only submission), so a nominee-specific card always falls back
 * to /OG.png — there's no per-nominee image to prefer over it.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<PageParams>
  searchParams: Promise<PageSearchParams>
}): Promise<Metadata> {
  const { pollId } = await params
  const { cat, nominee } = await searchParams

  const poll = await fetchNominationPoll(pollId)
  if (!poll) return {}

  if (cat && nominee) {
    const category = poll.categories.find((c) => c.categoryId === cat)
    if (category) {
      const nominees = await fetchTopNominees(pollId, cat, NOMINEE_LIST_LIMIT)
      const match = nominees.find((n) => n.nomineeId === nominee || n.name === nominee)
      const name = match?.name ?? nominee

      const title = `Nominate ${name} in the ${poll.pollName} nomination poll`
      const description = `Nominate ${name} for ${category.name} in ${poll.pollName} on Spotix.`

      return {
        title,
        description,
        openGraph: { title, description, images: [{ url: FALLBACK_OG_IMAGE, width: 1200, height: 630 }] },
        twitter: { card: "summary_large_image", title, description, images: [FALLBACK_OG_IMAGE] },
      }
    }
  }

  const description = poll.pollDescription || `Nominate a contestant for ${poll.pollName} on Spotix.`
  const image = poll.pollImage?.trim() ? poll.pollImage : FALLBACK_OG_IMAGE

  return {
    title: poll.pollName,
    description,
    openGraph: { title: poll.pollName, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: poll.pollName, description, images: [image] },
  }
}

export default async function NominatePage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { pollId } = await params
  const poll = await fetchNominationPoll(pollId)

  if (!poll) notFound()

  return <NominateClient pollId={pollId} poll={poll} />
}
