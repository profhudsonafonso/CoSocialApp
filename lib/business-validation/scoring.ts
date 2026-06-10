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
  'of', 'in', 'on', 'at', 'by', 'an', 'is', 'are', 'be', 'this', 'that', 'it',
])

const genericWords = new Set([
  'innovation', 'inovacao', 'inovação', 'startup', 'business', 'negocio', 'negócio',
  'platform', 'plataforma', 'software', 'solucao', 'solução', 'solution',
  'technology', 'tecnologia', 'project', 'projeto', 'idea', 'ideia',
  'market', 'mercado', 'validation', 'validacao', 'validação',
])

const sourceWeights: Record<string, number> = {
  web: 1,
  github: 0.9,
  product_hunt: 1,
  g2_capterra: 1,
  hacker_news: 0.5,
  wikipedia: 0.3,
  openalex: 0.2,
  local_fallback: 0,
}

const candidateTypeWeights: Record<string, number> = {
  'Concorrente direto': 1,
  'Concorrente indireto': 0.8,
  Substituto: 0.7,
  'Produto digital/SaaS': 0.8,
  'Projeto open-source relacionado': 0.6,
  'Sinal de demanda': 0.4,
  'Referência de mercado': 0.3,
  'Referência científica/técnica': 0.15,
  'Hipótese local': 0,
}

const coreConcepts = [
  ['idea', 'validation'],
  ['business', 'validation'],
  ['startup', 'collaboration'],
  ['cofounder', 'matching'],
  ['open', 'innovation'],
  ['contributor', 'marketplace'],
  ['task', 'marketplace'],
  ['collaborative', 'mvp'],
  ['contribution', 'rewards'],
  ['project', 'rewards'],
  ['github', 'task', 'tracking'],
  ['innovation', 'guide'],
  ['colabscore'],
  ['portfolio', 'contribution'],
]

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

function meaningfulTokens(text: string) {
  return tokenize(text).filter((token) => !genericWords.has(token))
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function keywordOverlapScore(ideaText: string, candidateText: string) {
  const ideaTokens = new Set(meaningfulTokens(ideaText))
  const candidateTokens = new Set(meaningfulTokens(candidateText))

  if (ideaTokens.size === 0 || candidateTokens.size === 0) {
    return 0
  }

  const overlap = Array.from(ideaTokens).filter((token) => candidateTokens.has(token)).length
  const coverage = overlap / Math.max(ideaTokens.size, 1)
  const density = overlap / Math.max(candidateTokens.size, 1)

  return clampScore((coverage * 75 + density * 25) * 100)
}

function containsCoreConcepts(text: string) {
  const tokens = new Set(tokenize(text))
  return coreConcepts.filter((concept) => concept.every((token) => tokens.has(token))).length
}

function hasSpecificCompanyOrProduct(candidate: Pick<BusinessValidationCandidate, 'name' | 'website_url'>) {
  const name = candidate.name.trim()
  return Boolean(candidate.website_url) || /[A-Z][a-z]+[A-Z][a-z]+/.test(name) || name.split(/\s+/).length <= 3
}

function hasOnlyGenericOverlap(input: BusinessValidationInput, candidateText: string) {
  const ideaGenericTokens = new Set(tokenize([
    input.ideaName,
    input.problem,
    input.targetAudience,
    input.proposedSolution,
    input.declaredDifferentiators,
  ].join(' ')).filter((token) => genericWords.has(token)))
  const candidateTokens = new Set(tokenize(candidateText))
  const overlap = Array.from(ideaGenericTokens).filter((token) => candidateTokens.has(token))
  const meaningfulOverlap = meaningfulTokens([
    input.ideaName,
    input.problem,
    input.targetAudience,
    input.proposedSolution,
    input.declaredDifferentiators,
  ].join(' ')).filter((token) => candidateTokens.has(token))

  return overlap.length > 0 && meaningfulOverlap.length === 0
}

export function calculateCandidateRelevance(
  input: BusinessValidationInput,
  candidate: Pick<BusinessValidationCandidate, 'name' | 'description' | 'evidence_summary' | 'candidate_type' | 'website_url'> & { source_type?: string },
) {
  const candidateText = [candidate.name, candidate.description, candidate.evidence_summary].join(' ')
  const weightedScore =
    keywordOverlapScore(input.problem, candidateText) * 0.25 +
    keywordOverlapScore(input.targetAudience, candidateText) * 0.2 +
    keywordOverlapScore(input.proposedSolution, candidateText) * 0.3 +
    keywordOverlapScore(input.businessModel, candidateText) * 0.1 +
    keywordOverlapScore(input.declaredDifferentiators, candidateText) * 0.15
  const candidateTokens = tokenize(candidateText)
  let score = clampScore(weightedScore)

  if (candidate.source_type === 'local_fallback') {
    return Math.min(50, score)
  }

  if (candidateTokens.length <= 8) {
    score = Math.min(60, score)
  }

  if (!candidate.description.trim()) {
    score = Math.min(40, score)
  }

  if (hasOnlyGenericOverlap(input, candidateText)) {
    score = Math.min(40, score)
  }

  const coreConceptMatches = containsCoreConcepts(candidateText)

  if (candidate.source_type === 'openalex' && coreConceptMatches < 2) {
    score = Math.min(40, score)
  }

  if (candidate.source_type === 'wikipedia' && !hasSpecificCompanyOrProduct(candidate)) {
    score = Math.min(50, score)
  }

  if (candidate.source_type === 'hacker_news') {
    const points = Number(candidate.evidence_summary.match(/points:\s*(\d+)/i)?.[1] || 0)
    const comments = Number(candidate.evidence_summary.match(/comments:\s*(\d+)/i)?.[1] || 0)

    if (points <= 3 && comments <= 2) {
      score = Math.min(60, score)
    }
  }

  return clampScore(score)
}

export function calculateSimilarityScore(
  input: BusinessValidationInput,
  candidate: Pick<BusinessValidationCandidate, 'name' | 'description' | 'evidence_summary' | 'candidate_type' | 'website_url'> & { source_type?: string },
) {
  return calculateCandidateRelevance(input, candidate)
}

export function calculateEvidenceConfidence(candidate: Pick<BusinessValidationCandidate, 'source_type' | 'source_confidence' | 'evidence_summary'>) {
  const baseConfidence = Number.isFinite(Number(candidate.source_confidence))
    ? Number(candidate.source_confidence)
    : sourceWeights[candidate.source_type] || 0.3
  const evidenceText = candidate.evidence_summary.toLowerCase()
  const hasEngagement = /\b(stars?|forks?|points?|comments?|cited_by_count|citations?|updated_at)\b/.test(evidenceText)
  const confidence = baseConfidence + (hasEngagement ? 0.08 : 0)

  if (candidate.source_type === 'local_fallback') {
    return 0
  }

  if (candidate.source_type === 'openalex') {
    return Math.min(0.55, confidence)
  }

  return Math.max(0, Math.min(1, confidence))
}

export function calculateMarketThreatScore(candidate: BusinessValidationCandidate) {
  const sourceWeight = sourceWeights[candidate.source_type] ?? 0.3
  const candidateTypeWeight = candidateTypeWeights[candidate.candidate_type] ?? 0.4
  const evidenceConfidence = calculateEvidenceConfidence(candidate)

  return clampScore(candidate.similarity_score * sourceWeight * candidateTypeWeight * evidenceConfidence)
}

export function calculateRiskLevel(
  similarityScore: number,
  candidate: Pick<BusinessValidationCandidate, 'source_type' | 'evidence_summary' | 'candidate_type' | 'source_confidence'>,
) {
  const engagementText = candidate.evidence_summary.toLowerCase()
  const hasStrongEngagement = /\b(stars?|points?|comments?|citations?|cited)\b/.test(engagementText)

  if (candidate.source_type === 'local_fallback') {
    return similarityScore >= 35 ? 'medio' : 'baixo'
  }

  const marketThreatScore = calculateMarketThreatScore({
    ...candidate,
    name: '',
    website_url: null,
    description: '',
    similarity_score: similarityScore,
    risk_level: '',
    raw_payload: null,
    collected_at: '',
  })

  if (marketThreatScore >= 65 || (similarityScore >= 80 && hasStrongEngagement)) {
    return 'alto'
  }

  if (marketThreatScore >= 30 || similarityScore >= 55 || candidate.source_type === 'web') {
    return 'medio'
  }

  return 'baixo'
}

export function calculateNoveltyScore(candidates: BusinessValidationCandidate[]) {
  const realCandidates = candidates.filter(isRealExternalCandidate)

  if (realCandidates.length === 0) {
    return null
  }

  const threats = realCandidates
    .map(calculateMarketThreatScore)
    .filter((score) => score > 0)
    .sort((a, b) => b - a)

  if (threats.length === 0) {
    return 75
  }

  const maxThreat = threats[0]
  const top3 = threats.slice(0, 3)
  const avgTop3Threat = top3.reduce((total, score) => total + score, 0) / top3.length
  const weakOnly = maxThreat < 25
  const differentiatorBonus = candidates.some((candidate) => calculateMarketThreatScore(candidate) >= 40)
    ? 0
    : 10
  const novelty = 100 - (0.7 * maxThreat + 0.3 * avgTop3Threat) + differentiatorBonus

  return weakOnly
    ? Math.max(60, Math.min(85, Math.round(novelty)))
    : Math.max(0, Math.min(100, Math.round(novelty)))
}

export function calculateRiskScore(candidates: BusinessValidationCandidate[]) {
  const realCandidates = candidates.filter(isRealExternalCandidate)

  if (realCandidates.length === 0) {
    return null
  }

  const threats = realCandidates
    .map(calculateMarketThreatScore)
    .sort((a, b) => b - a)
  const maxThreat = threats[0] || 0
  const mediumThreats = threats.filter((score) => score >= 30).length
  const openAlexOnly = realCandidates.every((candidate) => candidate.source_type === 'openalex')

  if (openAlexOnly) {
    return Math.min(35, Math.round(maxThreat))
  }

  return Math.max(5, Math.min(95, Math.round(maxThreat * 0.75 + mediumThreats * 7)))
}

export function calculateDifferentiationScore(
  input: BusinessValidationInput,
  candidates: BusinessValidationCandidate[],
) {
  const realCandidates = candidates.filter(isRealExternalCandidate)

  if (realCandidates.length === 0) {
    return null
  }

  const differentiatorTokens = meaningfulTokens(input.declaredDifferentiators)
  const specificDifferentiators = [
    'colabscore', 'github', 'gitlab', 'trello', 'jira', 'notion', 'rewards',
    'reward', 'portfolio', 'contribution', 'contributors', 'evidence', 'tracking',
    'guide', 'validation',
  ]
  const specificMatches = specificDifferentiators.filter((token) => tokenize(input.declaredDifferentiators).includes(token)).length
  const hasClearDifferentiators = differentiatorTokens.length >= 4 || specificMatches >= 2
  const strongThreats = realCandidates.filter((candidate) => calculateMarketThreatScore(candidate) >= 55).length
  const baseScore = hasClearDifferentiators ? 72 : 48

  return Math.max(5, Math.min(95, Math.round(baseScore - strongThreats * 10 + Math.min(specificMatches * 4, 16))))
}

export function getOverallRecommendation(
  noveltyScore: number | null,
  riskScore: number | null,
  differentiationScore: number | null,
  candidates: BusinessValidationCandidate[] = [],
) {
  const realCandidates = candidates.filter(isRealExternalCandidate)
  const hasHighSimilarityRealCandidate = realCandidates.some(
    (candidate) => calculateMarketThreatScore(candidate) >= 65 || candidate.risk_level === 'alto',
  )
  const maxThreat = realCandidates.length > 0
    ? Math.max(...realCandidates.map(calculateMarketThreatScore))
    : 0

  if (realCandidates.length === 0 || noveltyScore === null || riskScore === null || differentiationScore === null) {
    return 'validar mais'
  }

  if (maxThreat < 30) {
    return 'continuar com validação'
  }

  if (riskScore >= 75 && differentiationScore < 45) {
    return hasHighSimilarityRealCandidate ? 'pivotar' : 'validar mais'
  }

  if (riskScore >= 55 && differentiationScore >= 60) {
    return 'ajustar'
  }

  if (riskScore >= 55 && differentiationScore < 60) {
    return 'nichar'
  }

  if (noveltyScore < 50) {
    return 'ajustar'
  }

  return 'continuar com validação'
}
