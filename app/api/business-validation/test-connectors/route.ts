import { NextResponse } from 'next/server'
import {
  generateCompactSearchQueries,
  runBusinessValidationSearches,
} from '@/lib/business-validation/search-connectors'

export async function GET() {
  const testInput = {
    ideaName: 'startup collaboration platform for idea validation and contributor rewards',
    shortDescription: 'MVP test idea for validating compact external search queries.',
    problem: 'founders need to validate ideas and coordinate contributors before building MVPs',
    targetAudience: 'startup founders contributors innovation teams',
    proposedSolution: 'collaboration platform for idea validation, contributor rewards, and MVP tasks',
    declaredDifferentiators: 'transparent contribution scoring business validation and rewards',
    businessModel: 'SaaS',
    marketRegion: 'global',
    knownCompetitors: '',
  }
  const generatedCompactQueries = generateCompactSearchQueries(testInput)
  const result = await runBusinessValidationSearches(testInput)

  return NextResponse.json(
    {
      generatedCompactQueries,
      sourceStatuses: result.sourceStatuses,
      sampleCandidates: result.candidates.slice(0, 10),
      skippedQueries: result.skippedQueries,
    },
    { status: 200 },
  )
}
