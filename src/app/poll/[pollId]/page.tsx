import { notFound } from "next/navigation"
import { getPollByFlatId } from "@/lib/voting-utils"
import { getScopeEligibility } from "@/lib/tie-breaker"
import PollClient from "./PollClient"

export const revalidate = 0

export default async function PollPage({
  params,
  searchParams,
}: {
  params: Promise<{ pollId: string }>
  searchParams: Promise<{ creatorId?: string }>
}) {
  const { pollId } = await params
  const { creatorId: creatorIdHint } = await searchParams
  const resolved = await getPollByFlatId(pollId, creatorIdHint)

  if (!resolved) notFound()

  const { pollData, creatorId } = resolved

  return (
    <PollClient
      pollId={pollId}
      creatorId={creatorId}
      poll={pollData}
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
