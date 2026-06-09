export interface BusinessValidationInput {
  ideaId?: string
  ideaName: string
  shortDescription: string
  problem: string
  targetAudience: string
  proposedSolution: string
  declaredDifferentiators: string
  businessModel: string
  marketRegion: string
  knownCompetitors: string
  ownProjectUrls?: string[]
  ownValidationRunIds?: string[]
}

export interface BusinessValidationCandidate {
  name: string
  website_url: string | null
  description: string
  candidate_type: string
  similarity_score: number
  risk_level: string
  evidence_summary: string
  source_type: string
  source_confidence: number
  raw_payload: unknown
  collected_at: string
}

function isRealExternalCandidate(candidate: BusinessValidationCandidate) {
  return !['local_fallback', 'unknown'].includes(candidate.source_type)
}

export function isSelfCandidate(
  candidate: Partial<BusinessValidationCandidate> & { idea_id?: string | null, validation_run_id?: string | null },
  currentIdea: Pick<BusinessValidationInput, 'ideaId' | 'ideaName' | 'ownProjectUrls' | 'ownValidationRunIds'>,
) {
  if (candidate.idea_id && currentIdea.ideaId && candidate.idea_id === currentIdea.ideaId) {
    return true
  }

  if (
    candidate.validation_run_id &&
    currentIdea.ownValidationRunIds?.includes(candidate.validation_run_id)
  ) {
    return true
  }

  const candidateUrl = candidate.website_url?.trim().toLowerCase()
  const ownUrls = (currentIdea.ownProjectUrls || []).map((url) => url.trim().toLowerCase()).filter(Boolean)

  if (candidateUrl && ownUrls.includes(candidateUrl)) {
    return true
  }

  const candidateName = candidate.name?.trim().toLowerCase()
  const ideaName = currentIdea.ideaName.trim().toLowerCase()

  if (
    candidateName &&
    ideaName &&
    candidateName === ideaName &&
    ['local_fallback', 'internal', 'unknown'].includes(candidate.source_type || 'unknown')
  ) {
    return true
  }

  return false
}

const stopWords = new Set([
  'a', 'as', 'o', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'por',
  'com', 'sem', 'um', 'uma', 'the', 'and', 'or', 'for', 'with', 'from', 'to',
  'solution', 'software', 'startup', 'sistema', 'solucao', 'solução',
])

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token))
}

export function keywordOverlapScore(ideaText: string, candidateText: string) {
  const ideaTokens = new Set(tokenize(ideaText))
  const candidateTokens = new Set(tokenize(candidateText))

  if (ideaTokens.size === 0 || candidateTokens.size === 0) {
    return 0
  }

  const overlap = Array.from(ideaTokens).filter((token) => candidateTokens.has(token)).length
  const coverage = overlap / Math.max(ideaTokens.size, 1)
  const density = overlap / Math.max(candidateTokens.size, 1)

  return Math.max(0, Math.min(100, Math.round((coverage * 75 + density * 25) * 100)))
}

export function calculateSimilarityScore(
  input: BusinessValidationInput,
  candidate: Pick<BusinessValidationCandidate, 'name' | 'description' | 'evidence_summary'> & { source_type?: string },
) {
  const ideaText = [
    input.ideaName,
    input.problem,
    input.targetAudience,
    input.proposedSolution,
    input.declaredDifferentiators,
    input.marketRegion,
  ].join(' ')
  const candidateText = [candidate.name, candidate.description, candidate.evidence_summary].join(' ')

  const score = keywordOverlapScore(ideaText, candidateText)

  if (candidate.source_type === 'local_fallback') {
    return Math.min(50, score)
  }

  return score
}

export function calculateRiskLevel(
  similarityScore: number,
  candidate: Pick<BusinessValidationCandidate, 'source_type' | 'evidence_summary'>,
) {
  const engagementText = candidate.evidence_summary.toLowerCase()
  const hasStrongEngagement = /\b(stars?|points?|comments?|citations?|cited)\b/.test(engagementText)

  if (candidate.source_type === 'local_fallback') {
    return similarityScore >= 35 ? 'medio' : 'baixo'
  }

  if (similarityScore >= 81 || (similarityScore >= 70 && hasStrongEngagement)) {
    return 'alto'
  }

  if (similarityScore >= 46 || candidate.source_type === 'web') {
    return 'medio'
  }

  return 'baixo'
}

export function calculateNoveltyScore(candidates: BusinessValidationCandidate[]) {
  const realCandidates = candidates.filter(isRealExternalCandidate)

  if (realCandidates.length === 0) {
    return null
  }

  const maxSimilarity = Math.max(...realCandidates.map((candidate) => candidate.similarity_score))
  const highSimilarityCount = realCandidates.filter((candidate) => candidate.similarity_score >= 61).length

  return Math.max(5, Math.min(95, Math.round(88 - maxSimilarity * 0.55 - highSimilarityCount * 7)))
}

export function calculateRiskScore(candidates: BusinessValidationCandidate[]) {
  const realCandidates = candidates.filter(isRealExternalCandidate)

  if (realCandidates.length === 0) {
    return null
  }

  const highRiskCount = realCandidates.filter((candidate) => candidate.risk_level === 'alto').length
  const mediumRiskCount = realCandidates.filter((candidate) => candidate.risk_level === 'medio').length
  const avgSimilarity = realCandidates.reduce((total, candidate) => total + candidate.similarity_score, 0) / realCandidates.length

  return Math.max(5, Math.min(95, Math.round(avgSimilarity * 0.65 + highRiskCount * 14 + mediumRiskCount * 5)))
}

export function calculateDifferentiationScore(
  input: BusinessValidationInput,
  candidates: BusinessValidationCandidate[],
) {
  const realCandidates = candidates.filter(isRealExternalCandidate)

  if (realCandidates.length === 0) {
    return null
  }

  const differentiatorTokens = tokenize(input.declaredDifferentiators)
  const hasClearDifferentiators = differentiatorTokens.length >= 5
  const directCompetition = realCandidates.filter((candidate) => candidate.similarity_score >= 70).length
  const baseScore = hasClearDifferentiators ? 70 : 42

  return Math.max(5, Math.min(95, Math.round(baseScore - directCompetition * 8 + Math.min(differentiatorTokens.length, 15))))
}

export function getOverallRecommendation(
  noveltyScore: number | null,
  riskScore: number | null,
  differentiationScore: number | null,
  candidates: BusinessValidationCandidate[] = [],
) {
  const realCandidates = candidates.filter(isRealExternalCandidate)
  const hasHighSimilarityRealCandidate = realCandidates.some(
    (candidate) => candidate.similarity_score >= 81 || candidate.risk_level === 'alto',
  )

  if (realCandidates.length === 0 || noveltyScore === null || riskScore === null || differentiationScore === null) {
    return 'validar mais'
  }

  if (riskScore >= 80 && differentiationScore < 45) {
    return hasHighSimilarityRealCandidate ? 'pivotar' : 'validar mais'
  }

  if (riskScore >= 70) {
    return 'validar mais'
  }

  if (differentiationScore < 45) {
    return 'nichar'
  }

  if (noveltyScore < 40) {
    return 'ajustar'
  }

  return 'continuar'
}
