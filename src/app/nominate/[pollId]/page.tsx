import { notFound } from "next/navigation"
import { fetchNominationPoll } from "@/lib/nomination-db"
import NominateClient from "./NominateClient"

export const revalidate = 0

export default async function NominatePage({
  params,
}: {
  params: Promise<{ pollId: string }>
}) {
  const { pollId } = await params
  const poll = await fetchNominationPoll(pollId)

  if (!poll) notFound()

  return <NominateClient pollId={pollId} poll={poll} />
}
