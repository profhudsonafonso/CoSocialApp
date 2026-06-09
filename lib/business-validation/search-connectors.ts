import {
  type BusinessValidationCandidate,
  type BusinessValidationInput,
  calculateRiskLevel,
  calculateSimilarityScore,
  isSelfCandidate,
  tokenize,
} from './scoring'

export interface BusinessValidationQuery {
  query_text: string
  language: string
  query_type: string
  source_target: string
}

interface ConnectorResult {
  sourceType: string
  candidates: BusinessValidationCandidate[]
  error?: string
}

export interface ConnectorStatus {
  source_type: string
  attempted: boolean
  success: boolean
  result_count: number
  error_message: string | null
}

export interface SkippedQuery {
  source_type: string
  query_text: string
  reason: string
}

function nowIso() {
  return new Date().toISOString()
}

function compact(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function uniqueWords(text: string) {
  const seen = new Set<string>()

  return tokenize(text)
    .filter((word) => {
      if (seen.has(word)) {
        return false
      }

      seen.add(word)
      return true
    })
}

function compactQuery(words: string[], maxWords = 8, maxLength = 120) {
  const query = words
    .filter(Boolean)
    .slice(0, maxWords)
    .join(' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return query.length <= maxLength
    ? query
    : query.slice(0, maxLength).split(' ').slice(0, -1).join(' ')
}

function sanitizeConnectorQuery(query: string, maxLength: number) {
  const sanitized = compact(query)
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (sanitized.length <= maxLength && new TextEncoder().encode(sanitized).length <= maxLength) {
    return sanitized
  }

  return ''
}

function candidateWithScore(
  input: BusinessValidationInput,
  candidate: Omit<BusinessValidationCandidate, 'similarity_score' | 'risk_level' | 'collected_at'>,
) {
  const similarityScore = calculateSimilarityScore(input, candidate)

  return {
    ...candidate,
    similarity_score: similarityScore,
    risk_level: calculateRiskLevel(similarityScore, candidate),
    collected_at: nowIso(),
  }
}

function logConnectorStatus(sourceType: string, query: string, status: number | null, resultCount: number, error?: string) {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  console.log('[business-validation]', {
    source: sourceType,
    query,
    httpStatus: status,
    resultCount,
    error: error || null,
  })
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ data: T, httpStatus: number }> {
  const response = await fetch(url, init)
  const text = await response.text()

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${text}`)
    ;(error as Error & { httpStatus?: number }).httpStatus = response.status
    throw error
  }

  return {
    data: text ? JSON.parse(text) : {},
    httpStatus: response.status,
  }
}

export function generateCompactSearchQueries(input: BusinessValidationInput): BusinessValidationQuery[] {
  const ideaWords = uniqueWords(input.ideaName)
  const problemWords = uniqueWords(input.problem)
  const audienceWords = uniqueWords(input.targetAudience)
  const solutionWords = uniqueWords(input.proposedSolution)
  const differentiatorWords = uniqueWords(input.declaredDifferentiators)
  const primary = [...ideaWords, ...solutionWords, ...problemWords].slice(0, 4)
  const domain = [...problemWords, ...audienceWords, ...differentiatorWords].slice(0, 3)
  const base = primary.length > 0 ? primary : ['startup', 'collaboration']

  const queries = [
    { words: [...base, 'platform'], language: 'en', query_type: 'competitors', source_target: 'web' },
    { words: ['startup', 'collaboration', 'platform'], language: 'en', query_type: 'competitors', source_target: 'web' },
    { words: ['cofounder', 'matching', 'platform'], language: 'en', query_type: 'similar_solutions', source_target: 'web' },
    { words: ['idea', 'validation', 'platform'], language: 'en', query_type: 'market_reference', source_target: 'wikipedia' },
    { words: ['open', 'innovation', 'platform'], language: 'en', query_type: 'market_reference', source_target: 'wikipedia' },
    { words: ['startup', 'task', 'marketplace'], language: 'en', query_type: 'demand_signals', source_target: 'hacker_news' },
    { words: ['collaborative', 'MVP', 'building'], language: 'en', query_type: 'demand_signals', source_target: 'hacker_news' },
    { words: [...domain, 'open', 'source', 'tool'], language: 'en', query_type: 'open_source', source_target: 'github' },
    { words: [...base, 'github'], language: 'en', query_type: 'open_source', source_target: 'github' },
    { words: [...domain, 'research', 'technology'], language: 'en', query_type: 'technical_evidence', source_target: 'openalex' },
    { words: ['plataforma', 'validação', 'ideias'], language: 'pt', query_type: 'competitors', source_target: 'web' },
    { words: ['plataforma', 'inovação', 'aberta'], language: 'pt', query_type: 'competitors', source_target: 'web' },
  ]

  const seen = new Set<string>()

  return queries
    .map((query) => ({
      query_text: compactQuery(query.words),
      language: query.language,
      query_type: query.query_type,
      source_target: query.source_target,
    }))
    .filter((query) => {
      if (!query.query_text || seen.has(query.query_text)) {
        return false
      }

      seen.add(query.query_text)
      return true
    })
    .slice(0, 12)
}

export const generateBusinessValidationQueries = generateCompactSearchQueries

export async function searchGitHub(query: string, input: BusinessValidationInput): Promise<ConnectorResult> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const { data, httpStatus } = await fetchJson<{ items?: Array<Record<string, any>> }>(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`,
    { headers },
  )
  const candidates = (data.items || []).map((repo) => candidateWithScore(input, {
    source_type: 'github',
    source_confidence: 0.82,
    raw_payload: repo,
    name: compact(repo.full_name) || 'GitHub repository',
    website_url: compact(repo.html_url) || null,
    description: compact(repo.description) || 'GitHub repository returned by repository search.',
    candidate_type: 'Projeto open-source relacionado',
    evidence_summary: `Stars: ${repo.stargazers_count || 0}; forks: ${repo.forks_count || 0}; language: ${repo.language || 'n/a'}; updated_at: ${repo.updated_at || 'n/a'}.`,
  }))

  logConnectorStatus('github', query, httpStatus, candidates.length)

  return {
    sourceType: 'github',
    candidates,
  }
}

export async function searchHackerNews(query: string, input: BusinessValidationInput): Promise<ConnectorResult> {
  const { data, httpStatus } = await fetchJson<{ hits?: Array<Record<string, any>> }>(
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5`,
  )
  const candidates = (data.hits || []).map((hit) => {
    const title = compact(hit.title) || compact(hit.story_title) || 'Hacker News story'
    const comments = Number(hit.num_comments || 0)
    const points = Number(hit.points || 0)

    return candidateWithScore(input, {
      source_type: 'hacker_news',
      source_confidence: 0.72,
      raw_payload: hit,
      name: title,
      website_url: compact(hit.url) || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      description: `${title}. Discussão ou lançamento encontrado no Hacker News.`,
      candidate_type: comments > 20 || points > 50 ? 'Sinal de demanda' : 'Referência de mercado',
      evidence_summary: `HN points: ${points}; comments: ${comments}; created_at: ${hit.created_at || 'n/a'}.`,
    })
  })

  logConnectorStatus('hacker_news', query, httpStatus, candidates.length)

  return {
    sourceType: 'hacker_news',
    candidates,
  }
}

export async function searchWikipedia(query: string, input: BusinessValidationInput): Promise<ConnectorResult> {
  const { data, httpStatus } = await fetchJson<[string, string[], string[], string[]]>(
    `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=${encodeURIComponent(query)}&limit=5`,
  )
  const titles = data[1] || []
  const snippets = data[2] || []
  const urls = data[3] || []
  const candidates = titles.map((title, index) => candidateWithScore(input, {
    source_type: 'wikipedia',
    source_confidence: 0.68,
    raw_payload: { title, snippet: snippets[index], url: urls[index] },
    name: title,
    website_url: urls[index] || null,
    description: compact(snippets[index]) || 'Wikipedia/OpenSearch result.',
    candidate_type: 'Referência de mercado',
    evidence_summary: 'Wikipedia/OpenSearch result related to the idea keywords.',
  }))

  logConnectorStatus('wikipedia', query, httpStatus, candidates.length)

  return {
    sourceType: 'wikipedia',
    candidates,
  }
}

export async function searchOpenAlex(query: string, input: BusinessValidationInput): Promise<ConnectorResult> {
  const { data, httpStatus } = await fetchJson<{ results?: Array<Record<string, any>> }>(
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=5`,
  )
  const candidates = (data.results || []).map((work) => {
    const source = work.primary_location?.source?.display_name || work.host_venue?.display_name || 'n/a'
    const doi = compact(work.doi)

    return candidateWithScore(input, {
      source_type: 'openalex',
      source_confidence: 0.74,
      raw_payload: work,
      name: compact(work.title) || 'OpenAlex work',
      website_url: doi || compact(work.id) || null,
      description: `Publication year: ${work.publication_year || 'n/a'}; venue: ${source}.`,
      candidate_type: 'Referência científica/técnica',
      evidence_summary: `Year: ${work.publication_year || 'n/a'}; cited_by_count: ${work.cited_by_count || 0}; source: ${source}.`,
    })
  })

  logConnectorStatus('openalex', query, httpStatus, candidates.length)

  return {
    sourceType: 'openalex',
    candidates,
  }
}

function classifyBraveResult(url: string) {
  const lowerUrl = url.toLowerCase()

  if (lowerUrl.includes('github.com')) return 'Projeto open-source relacionado'
  if (lowerUrl.includes('producthunt.com')) return 'Produto digital/SaaS'
  if (lowerUrl.includes('g2.com') || lowerUrl.includes('capterra.com')) return 'Produto digital/SaaS'
  if (lowerUrl.includes('patents.google.com')) return 'Patente ou registro relevante'
  return 'Concorrente ou referência de mercado'
}

export async function searchBrave(query: string, input: BusinessValidationInput): Promise<ConnectorResult> {
  if (!process.env.BRAVE_SEARCH_API_KEY) {
    return { sourceType: 'web', candidates: [] }
  }

  const { data, httpStatus } = await fetchJson<{ web?: { results?: Array<Record<string, any>> } }>(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY,
      },
    },
  )
  const candidates = (data.web?.results || []).map((result) => candidateWithScore(input, {
    source_type: 'web',
    source_confidence: 0.78,
    raw_payload: result,
    name: compact(result.title) || 'Web result',
    website_url: compact(result.url) || null,
    description: compact(result.description) || 'Web search result.',
    candidate_type: classifyBraveResult(compact(result.url)),
    evidence_summary: compact(result.description) || 'Brave Search result.',
  }))

  logConnectorStatus('web', query, httpStatus, candidates.length)

  return {
    sourceType: 'web',
    candidates,
  }
}

function fallbackCandidates(input: BusinessValidationInput): BusinessValidationCandidate[] {
  const competitors = input.knownCompetitors
    .split(/[,;\n]/)
    .map((value) => compact(value))
    .filter(Boolean)
    .slice(0, 5)

  const names = competitors.length > 0
    ? competitors
    : ['Solução similar a investigar', 'Alternativa manual/processo interno', 'Projeto open-source equivalente']

  return names.map((name, index) => candidateWithScore(input, {
    source_type: 'local_fallback',
    source_confidence: 0.25,
    raw_payload: { generated_locally: true },
    name,
    website_url: null,
    description: competitors.length > 0
      ? `Concorrente informado pelo usuário para investigação: ${name}.`
      : `Placeholder investigativo para orientar busca posterior: ${name}.`,
    candidate_type: 'Hipótese local',
    evidence_summary: 'Hipótese gerada localmente. Não é evidência externa real. Use apenas para orientar investigação manual.',
  }))
}

function dedupeCandidates(candidates: BusinessValidationCandidate[]) {
  const seen = new Set<string>()
  const deduped: BusinessValidationCandidate[] = []

  for (const candidate of candidates) {
    const key = candidate.website_url || `${candidate.source_type}:${candidate.name.toLowerCase()}`

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(candidate)
  }

  return deduped
}

export async function runBusinessValidationSearches(input: BusinessValidationInput) {
  const queries = generateCompactSearchQueries(input)
  const connectorErrors: string[] = []
  const sourceStatuses: ConnectorStatus[] = []
  const skippedQueries: SkippedQuery[] = []
  const maxLengthBySource: Record<string, number> = {
    github: 200,
    hacker_news: 200,
    wikipedia: 120,
    openalex: 200,
    web: 200,
  }
  const firstQueryForSource = (sourceType: string, fallback: string) => (
    queries.find((query) => query.source_target === sourceType)?.query_text || fallback
  )
  const connectorJobs = [
    {
      sourceType: 'github',
      query: firstQueryForSource('github', 'startup collaboration open source'),
      configured: true,
      run: searchGitHub,
    },
    {
      sourceType: 'hacker_news',
      query: firstQueryForSource('hacker_news', 'startup collaboration platform'),
      configured: true,
      run: searchHackerNews,
    },
    {
      sourceType: 'wikipedia',
      query: firstQueryForSource('wikipedia', 'innovation management platform'),
      configured: true,
      run: searchWikipedia,
    },
    {
      sourceType: 'openalex',
      query: firstQueryForSource('openalex', 'collaboration technology research'),
      configured: true,
      run: searchOpenAlex,
    },
    {
      sourceType: 'web',
      query: firstQueryForSource('web', 'startup collaboration platform'),
      configured: Boolean(process.env.BRAVE_SEARCH_API_KEY),
      run: searchBrave,
    },
  ]

  const connectorResults = await Promise.all(
    connectorJobs.map(async (job) => {
      if (!job.configured) {
        const status = {
          source_type: job.sourceType,
          attempted: false,
          success: false,
          result_count: 0,
          error_message: 'Não configurada',
        }
        sourceStatuses.push(status)
        logConnectorStatus(job.sourceType, job.query, null, 0, status.error_message)
        return { candidates: [] as BusinessValidationCandidate[] }
      }

      const sanitizedQuery = sanitizeConnectorQuery(job.query, maxLengthBySource[job.sourceType] || 120)

      if (!sanitizedQuery) {
        const reason = 'Skipped query because it is too long.'
        skippedQueries.push({
          source_type: job.sourceType,
          query_text: job.query,
          reason,
        })
        sourceStatuses.push({
          source_type: job.sourceType,
          attempted: false,
          success: false,
          result_count: 0,
          error_message: reason,
        })
        logConnectorStatus(job.sourceType, job.query, null, 0, reason)
        return { candidates: [] as BusinessValidationCandidate[] }
      }

      try {
        const result = await job.run(sanitizedQuery, input)
        sourceStatuses.push({
          source_type: job.sourceType,
          attempted: true,
          success: true,
          result_count: result.candidates.length,
          error_message: null,
        })
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connector failed.'
        connectorErrors.push(errorMessage)
        sourceStatuses.push({
          source_type: job.sourceType,
          attempted: true,
          success: false,
          result_count: 0,
          error_message: errorMessage,
        })
        logConnectorStatus(
          job.sourceType,
          job.query,
          error instanceof Error ? (error as Error & { httpStatus?: number }).httpStatus || null : null,
          0,
          errorMessage,
        )
        return { candidates: [] as BusinessValidationCandidate[] }
      }
    }),
  )

  const candidates = connectorResults.flatMap((result) => result.candidates)
  const realCandidates = dedupeCandidates(
    candidates.filter((candidate) => (
      candidate.source_type !== 'local_fallback' &&
      !isSelfCandidate(candidate, input)
    )),
  )
  const usedFallback = realCandidates.length === 0
  const finalCandidates = usedFallback ? fallbackCandidates(input) : realCandidates

  if (usedFallback) {
    sourceStatuses.push({
      source_type: 'local_fallback',
      attempted: true,
      success: true,
      result_count: finalCandidates.length,
      error_message: null,
    })
  }

  return {
    queries,
    candidates: finalCandidates,
    connectorErrors,
    sourceStatuses,
    skippedQueries,
    sourcesUsed: Array.from(new Set(finalCandidates.map((candidate) => candidate.source_type))),
    usedFallback,
    realExternalCandidateCount: realCandidates.length,
  }
}

// TODO: Add Product Hunt GraphQL connector.
// TODO: Add Google Patents connector through web search or official/allowed source.
// TODO: Add app store search connector.
// TODO: Add LLM-based candidate classification with citations.
// TODO: Add source confidence calibration.
// TODO: Add manual reviewer validation of candidates.
