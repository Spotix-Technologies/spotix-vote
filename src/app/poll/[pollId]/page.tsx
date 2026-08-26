import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPollByFlatId, findContestantInPoll } from "@/lib/voting-utils"
import { getScopeEligibility } from "@/lib/tie-breaker"
import { createSupabaseServerClient } from "@/lib/election/auth-server"
import { fetchVoterProfile } from "@/lib/election/voter-profile"
import PollClient from "./PollClient"

export const revalidate = 0

const FALLBACK_OG_IMAGE = "/OG.png" // public/OG.png — recommended 1200x630 (1.91:1)

type PageParams = { pollId: string }
type PageSearchParams = { creatorId?: string; contestant?: string; cat?: string }

/**
 * Per-contestant links (built by ContestantCard's ShareButton via
 * lib/share.ts's buildVotingShareUrl) carry ?contestant=&cat= on this
 * same route, so the right OG data for a shared link is resolved here
 * from those params — a contestant's own photo when they have one,
 * otherwise the poll image, otherwise /OG.png.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<PageParams>
  searchParams: Promise<PageSearchParams>
}): Promise<Metadata> {
  const { pollId } = await params
  const { creatorId, contestant, cat } = await searchParams

  const resolved = await getPollByFlatId(pollId, creatorId)
  if (!resolved) return {}

  const { pollData } = resolved

  if (contestant) {
    const found = findContestantInPoll(pollData, contestant)
    // Guard against a stale/foreign cat param pointing at the wrong
    // category — only trust it if it actually matches where the
    // contestant lives.
    if (found && (!cat || found.category === null || found.category.categoryId === cat)) {
      const title = `Vote for ${found.contestant.name} in ${pollData.pollName}`
      const description = `Vote for ${found.contestant.name} in the ${pollData.pollName} poll on Spotix.`
      const image = found.contestant.image?.trim() ? found.contestant.image : FALLBACK_OG_IMAGE

      return {
        title,
        description,
        openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
        twitter: { card: "summary_large_image", title, description, images: [image] },
      }
    }
  }

  const description = pollData.pollDescription || `Cast your vote in ${pollData.pollName} on Spotix.`
  const image = pollData.pollImage?.trim() ? pollData.pollImage : FALLBACK_OG_IMAGE

  return {
    title: pollData.pollName,
    description,
    openGraph: { title: pollData.pollName, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: pollData.pollName, description, images: [image] },
  }
}

export default async function PollPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>
  searchParams: Promise<PageSearchParams>
}) {
  const { pollId } = await params
  const { creatorId: creatorIdHint } = await searchParams
  const resolved = await getPollByFlatId(pollId, creatorIdHint)

  if (!resolved) notFound()

  const { pollData, creatorId } = resolved

  // Resolve the signed-in voter (if any) so VoteModal can skip asking for
  // name/email it already has — see VoteModal's `voter` prop.
  const supabaseServer = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  const voter = user?.email
    ? {
        email: user.email,
        name: (user.user_metadata?.full_name as string | undefined) ?? "Valued Customer",
        phone: (await fetchVoterProfile(user.id).catch(() => null))?.phone ?? null,
      }
    : null

  return (
    <PollClient
      pollId={pollId}
      creatorId={creatorId}
      poll={pollData}
      voter={voter}
      // Eligibility for the default scope is resolved server-side so the
      // first paint already knows whether voting/tie-breaker/closed state
      // applies, instead of flashing "open" then correcting client-side.
      singleScopeEligibility={
        pollData.pollType !== "group"
          ? getScopeEligibility(pollData, "single", new Date())
          : null
      }
    />
  )
}
