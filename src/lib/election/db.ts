/**
 * src/lib/election/db.ts
 *
 * Supabase query helpers for the elections feature (public/voter side of
 * spotix-vote). Organiser-side writes — creating elections/offices,
 * uploading voter lists, publishing results — live in spotix-booker's
 * app/lib/election-db.ts against the exact same tables. See
 * /supabase/election-schema.sql for the schema and cast_election_vote().
 */

import { supabaseAdmin } from "@/lib/supabase"

export interface ElectionRow {
  id: string
  organizerId: string
  name: string
  description: string
  image: string
  status: "draft" | "scheduled" | "active" | "ended"
  votingStartsAt: string | null
  votingEndsAt: string | null
  resultsPublished: boolean
  editGraceDays: number
}

export interface OfficeRow {
  officeId: string
  name: string
  description: string
  formFee: number
  seatsAvailable: number
  /** True when candidates must upload a qualifying document (see bioDataLabel) to contest this office. */
  bioDataRequired: boolean
  /** Organiser-written instructions for what the bio data upload should be (e.g. "Upload your matric ID card"). */
  bioDataLabel: string
  /** ISO timestamp, or null = sells endlessly. Candidate registration is blocked once this passes — see /api/v1/election/ref/route.ts. */
  formSaleEndsAt: string | null
}

/**
 * "select" = single choice (one option, rendered as a <select>).
 * "multi_select" = multiple choice (any number of options, rendered as checkboxes).
 * Kept as two distinct DB values rather than a single generic "choice" +
 * a separate multiple:boolean flag, so existing "select" rows never need
 * a migration — they're already correct as single-choice.
 */
export type OfficeQuestionType = "short_text" | "long_text" | "select" | "multi_select"

export interface OfficeQuestionRow {
  questionId: string
  questionText: string
  questionType: OfficeQuestionType
  options: string[] | null
  required: boolean
}

export interface CandidateRow {
  candidateId: string
  officeId: string
  fullName: string
  photoUrl: string
  /** Only populated when the election's results have been published. */
  voteCount: number | null
}

/** Answers can be a single string (short/long text, single choice) or a string array (multiple choice). */
export type CandidateAnswerValue = string | string[]

export async function fetchElection(electionId: string): Promise<ElectionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("elections")
    .select("id, organizer_id, name, description, image, status, voting_starts_at, voting_ends_at, results_published, edit_grace_days")
    .eq("id", electionId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    organizerId: data.organizer_id,
    name: data.name ?? "",
    description: data.description ?? "",
    image: data.image ?? "",
    status: data.status,
    votingStartsAt: data.voting_starts_at,
    votingEndsAt: data.voting_ends_at,
    resultsPublished: data.results_published ?? false,
    editGraceDays: data.edit_grace_days ?? 0,
  }
}

export async function fetchOffices(electionId: string): Promise<OfficeRow[]> {
  const { data, error } = await supabaseAdmin
    .from("election_offices")
    .select("id, name, description, form_fee, seats_available, bio_data_required, bio_data_label, form_sale_ends_at")
    .eq("election_id", electionId)
    .order("sort_order", { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => ({
    officeId: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    formFee: row.form_fee ?? 0,
    seatsAvailable: row.seats_available ?? 1,
    bioDataRequired: row.bio_data_required ?? false,
    bioDataLabel: row.bio_data_label ?? "",
    formSaleEndsAt: row.form_sale_ends_at ?? null,
  }))
}

export async function fetchOffice(officeId: string) {
  const { data, error } = await supabaseAdmin
    .from("election_offices")
    .select("id, election_id, name, form_fee, bio_data_required, bio_data_label, form_sale_ends_at")
    .eq("id", officeId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchOfficeQuestions(officeId: string): Promise<OfficeQuestionRow[]> {
  const { data, error } = await supabaseAdmin
    .from("election_office_questions")
    .select("id, question_text, question_type, options, required")
    .eq("office_id", officeId)
    .order("sort_order", { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => ({
    questionId: row.id,
    questionText: row.question_text,
    questionType: row.question_type,
    options: row.options ?? null,
    required: row.required ?? true,
  }))
}

/**
 * Candidates for an office. `voteCount` is stripped to null unless the
 * election's results have been published — this is the enforcement
 * point for "stats NEVER visible till Publish Results", not RLS (this
 * runs with the service-role key, so it's this application-layer check
 * that hides the number, not the database).
 */
export async function fetchCandidatesForOffice(officeId: string, resultsPublished: boolean): Promise<CandidateRow[]> {
  const { data, error } = await supabaseAdmin
    .from("election_candidates")
    .select("id, office_id, full_name, photo_url, vote_count")
    .eq("office_id", officeId)
    .order("full_name", { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => ({
    candidateId: row.id,
    officeId: row.office_id,
    fullName: row.full_name ?? "",
    photoUrl: row.photo_url ?? "",
    voteCount: resultsPublished ? (row.vote_count ?? 0) : null,
  }))
}

/** Looks up a voter's accreditation by their emailed/texted token. */
export async function fetchVoterByToken(voterToken: string) {
  const { data, error } = await supabaseAdmin
    .from("election_voters")
    .select("id, election_id, email, name")
    .eq("voter_token", voterToken)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Office ids this voter has already cast a ballot for, in this election. */
export async function fetchVotedOfficeIds(voterId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("election_voter_ballots")
    .select("office_id")
    .eq("voter_id", voterId)

  if (error) throw error
  return (data ?? []).map((row) => row.office_id)
}

/** Elections a signed-in voter (by email) is accredited in, with per-election voting progress. */
export async function fetchElectionsForVoterEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from("election_voters")
    .select(
      "id, election_id, voter_token, elections!inner(id, name, image, status, voting_starts_at, voting_ends_at, results_published)"
    )
    .ilike("email", email)

  if (error) throw error

  const rows = data ?? []

  const withProgress = await Promise.all(
    rows.map(async (row: any) => {
      const [offices, votedOfficeIds] = await Promise.all([
        fetchOffices(row.election_id),
        fetchVotedOfficeIds(row.id),
      ])
      return {
        electionId: row.election_id,
        voterToken: row.voter_token,
        votedOfficeCount: votedOfficeIds.length,
        totalOfficeCount: offices.length,
        hasVotedAll: offices.length > 0 && votedOfficeIds.length >= offices.length,
        election: {
          id: row.elections.id,
          name: row.elections.name,
          image: row.elections.image,
          status: row.elections.status,
          votingStartsAt: row.elections.voting_starts_at,
          votingEndsAt: row.elections.voting_ends_at,
          resultsPublished: row.elections.results_published,
        },
      }
    })
  )

  return withProgress
}

