import {
  type BusinessValidationInput,
  calculateSimilarityScore,
  tokenize,
} from './scoring'

export interface InvestmentSignal {
  source_platform: string
  source_category: string
  startup_name: string | null
  source_url: string
  title: string
  snippet: string
  sector: string | null
  problem: string | null
  solution: string | null
  target_audience: string | null
  business_model: string | null
  investment_thesis: string | null
  traction: string | null
  customers: string | null
  revenue_indicators: string | null
  amount_raised: string | null
  target_fundraising_amount: string | null
  ticket_size: string | null
  valuation: string | null
  round_status: string | null
  investment_instrument: string | null
  use_of_funds: string | null
  risk_notes: string | null
  similarity_score: number
  investment_signal_score: number
  market_validation_signal: boolean
  innovation_penalty: number
  source_confidence: number
  raw_payload: unknown
  collected_at: string
}

export interface InvestmentSignalSearchResult {
  queries: Array<{
    query_text: string
    language: string
    query_type: string
    source_target: string
  }>
  signals: InvestmentSignal[]
  status: {
    source_type: string
    attempted: boolean
    success: boolean
    result_count: number
    error_message: string | null
  }
  connectorErrors: string[]
  innovationPenaltyApplied: number
  sourcesConsulted: string[]
}

interface BraveResult {
  title?: string
  url?: string
  description?: string
  extra_snippets?: string[]
}

const categoryWeights: Record<string, number> = {
  equity_crowdfunding: 1,
  startup_database: 0.9,
  venture_capital: 0.9,
  accelerator: 0.8,
  angel_network: 0.8,
  market_intelligence: 0.8,
  startup_media: 0.6,
  public_registry: 0.5,
  startup_ecosystem: 0.6,
}

function nowIso() {
  return new Date().toISOString()
}

function compact(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function compactQuery(words: string[], maxWords = 8, maxLength = 120) {
  const query = words
    .filter(Boolean)
    .slice(0, maxWords)
    .join(' ')
    .replace(/[^\p{L}\p{N}\s:.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return query.length <= maxLength
    ? query
    : query.slice(0, maxLength).split(' ').slice(0, -1).join(' ')
}

function uniqueQueries(queries: string[]) {
  const seen = new Set<string>()

  return queries
    .map((query) => compact(query))
    .filter((query) => {
      if (!query || query.length > 120 || seen.has(query.toLowerCase())) {
        return false
      }

      seen.add(query.toLowerCase())
      return true
    })
}

function primaryTokens(input: BusinessValidationInput) {
  const tokens = [
    ...tokenize(input.ideaName),
    ...tokenize(input.proposedSolution),
    ...tokenize(input.problem),
    ...tokenize(input.businessModel),
  ]
  const seen = new Set<string>()

  return tokens.filter((token) => {
    if (seen.has(token)) return false
    seen.add(token)
    return true
  })
}

export function generateInvestmentSignalQueries(input: BusinessValidationInput) {
  const tokens = primaryTokens(input)
  const concept = tokens.slice(0, 3)
  const business = tokenize(input.businessModel).slice(0, 2)
  const base = concept.length > 0 ? concept : ['startup', 'collaboration']

  const queries = [
    compactQuery([...base, 'startup', 'funding']),
    compactQuery([...base, 'startup', 'investment']),
    compactQuery([...base, ...business, 'funding']),
    'startup collaboration funding',
    'cofounder matching investment',
    'idea validation startup funding',
    'open innovation startup investment',
    'startup task marketplace funding',
    'contributor marketplace startup investment',
    'business validation platform funding',
    'plataforma validação ideias investimento',
    'marketplace colaboradores startup investimento',
    `site:captable.com.br ${compactQuery([...base, 'startup'])}`,
    `site:eqseed.com ${compactQuery([...base, 'startup'])}`,
    `site:anjosdobrasil.net ${compactQuery([...base, 'startup'])}`,
    `site:wiztartup.com ${compactQuery([...base, 'startup'])}`,
    `site:bossainvest.com ${compactQuery([...base, 'SaaS'])}`,
    `site:acestartups.com.br ${compactQuery([...base, 'startup'])}`,
    `site:distrito.me ${compactQuery([...base, 'startup'])}`,
    `site:startse.com ${compactQuery([...base, 'startup'])}`,
    `site:latitud.com ${compactQuery([...base, 'platform'])}`,
    `site:abstartups.com.br ${compactQuery([...base, 'startup'])}`,
    `site:abvcap.com.br ${compactQuery([...base, 'investimento'])}`,
    `site:crunchbase.com ${compactQuery([...base, 'startup'])}`,
    `site:dealroom.co ${compactQuery([...base, 'startup'])}`,
    `site:cbinsights.com ${compactQuery([...base, 'startup'])}`,
    `site:tracxn.com ${compactQuery([...base, 'startup'])}`,
  ]

  return uniqueQueries(queries)
    .slice(0, 12)
    .map((query) => ({
      query_text: query,
      language: /[ãçáéíóú]/i.test(query) ? 'pt' : 'en',
      query_type: 'investment_signals',
      source_target: 'investment_signals',
    }))
}

export function classifyInvestmentSource(url: string, title = '', snippet = '') {
  const haystack = `${url} ${title} ${snippet}`.toLowerCase()

  if (haystack.includes('captable.com.br')) return { platform: 'Captable', category: 'equity_crowdfunding', confidence: 0.9 }
  if (haystack.includes('eqseed.com')) return { platform: 'EqSeed', category: 'equity_crowdfunding', confidence: 0.9 }
  if (haystack.includes('startmeup') || haystack.includes('smu.com.br')) return { platform: 'SMU / StartMeUp', category: 'equity_crowdfunding', confidence: 0.82 }
  if (haystack.includes('kria.vc') || haystack.includes('kria.com.br')) return { platform: 'Kria', category: 'equity_crowdfunding', confidence: 0.88 }
  if (haystack.includes('wiztartup.com')) return { platform: 'Wiztartup', category: 'equity_crowdfunding', confidence: 0.82 }
  if (haystack.includes('anjosdobrasil.net')) return { platform: 'Anjos do Brasil', category: 'angel_network', confidence: 0.8 }
  if (haystack.includes('bossainvest.com')) return { platform: 'Bossa Invest', category: 'venture_capital', confidence: 0.82 }
  if (haystack.includes('acestartups.com.br') || haystack.includes('aceventures.com.br')) return { platform: 'ACE', category: 'accelerator', confidence: 0.8 }
  if (haystack.includes('wow.ac')) return { platform: 'WOW Aceleradora', category: 'accelerator', confidence: 0.78 }
  if (haystack.includes('distrito.me')) return { platform: 'Distrito', category: 'startup_database', confidence: 0.86 }
  if (haystack.includes('startse.com')) return { platform: 'StartSe', category: 'startup_media', confidence: 0.7 }
  if (haystack.includes('latitud.com')) return { platform: 'Latitud', category: 'accelerator', confidence: 0.78 }
  if (haystack.includes('abstartups.com.br')) return { platform: 'ABStartups', category: 'startup_ecosystem', confidence: 0.7 }
  if (haystack.includes('abvcap.com.br')) return { platform: 'ABVCAP', category: 'venture_capital', confidence: 0.72 }
  if (haystack.includes('cvm.gov.br')) return { platform: 'CVM', category: 'public_registry', confidence: 0.7 }
  if (haystack.includes('slinghub.io') || haystack.includes('slinghub.com')) return { platform: 'Sling Hub', category: 'startup_database', confidence: 0.82 }
  if (haystack.includes('crunchbase.com')) return { platform: 'Crunchbase', category: 'startup_database', confidence: 0.88 }
  if (haystack.includes('pitchbook.com')) return { platform: 'PitchBook', category: 'startup_database', confidence: 0.84 }
  if (haystack.includes('cbinsights.com')) return { platform: 'CB Insights', category: 'market_intelligence', confidence: 0.82 }
  if (haystack.includes('dealroom.co')) return { platform: 'Dealroom', category: 'startup_database', confidence: 0.86 }
  if (haystack.includes('tracxn.com')) return { platform: 'Tracxn', category: 'startup_database', confidence: 0.84 }

  return { platform: 'Web pública', category: 'startup_media', confidence: 0.5 }
}

function extractPattern(text: string, pattern: RegExp) {
  return text.match(pattern)?.[0] || null
}

export function extractInvestmentSignalFields(result: BraveResult) {
  const title = compact(result.title)
  const snippet = compact([result.description, ...(result.extra_snippets || [])].join(' '))
  const text = `${title} ${snippet}`
  const amountPattern = /(?:R\$|\$|US\$|USD|BRL|€)\s?\d+(?:[.,]\d+)?\s?(?:milhões|milhao|milhão|million|mi|m|k|mil)?/i

  return {
    startup_name: title.split(/[|-]/)[0]?.trim() || title || null,
    title,
    snippet,
    amount_raised: /\b(raised|captou|levantou|arrecadou|funding|investimento)\b/i.test(text)
      ? extractPattern(text, amountPattern)
      : null,
    target_fundraising_amount: /\b(meta|target|captacao|captação|raise)\b/i.test(text)
      ? extractPattern(text, amountPattern)
      : null,
    ticket_size: /\b(ticket|investimento mínimo|minimum investment)\b/i.test(text)
      ? extractPattern(text, amountPattern)
      : null,
    valuation: /\b(valuation|valued at|avaliada em)\b/i.test(text)
      ? extractPattern(text, amountPattern)
      : null,
    traction: extractPattern(text, /\b(?:clientes|customers|users|usuários|MRR|ARR|receita|revenue|growth|crescimento)[^.]{0,90}/i),
    customers: extractPattern(text, /\b(?:clientes|customers|users|usuários)[^.]{0,90}/i),
    revenue_indicators: extractPattern(text, /\b(?:receita|revenue|MRR|ARR|faturamento)[^.]{0,90}/i),
    round_status: extractPattern(text, /\b(?:seed|pre-seed|series [abc]|rodada|captação|crowdfunding|equity crowdfunding|open round|raising)[^.]{0,80}/i),
    investment_instrument: extractPattern(text, /\b(?:equity|SAFE|mútuo conversível|convertible note|crowdfunding|debênture)[^.]{0,80}/i),
    use_of_funds: extractPattern(text, /\b(?:use of funds|uso dos recursos|recursos serão usados)[^.]{0,120}/i),
    investment_thesis: extractPattern(text, /\b(?:investment thesis|tese|thesis|invests in|investe em)[^.]{0,120}/i),
  }
}

function tractionTermScore(signal: Pick<InvestmentSignal, 'snippet' | 'title'>) {
  const text = `${signal.title} ${signal.snippet}`.toLowerCase()
  const terms = [
    'raised', 'funding', 'investment', 'investimento', 'captou', 'captação',
    'rodada', 'seed', 'series', 'valuation', 'revenue', 'receita',
    'clientes', 'customers', 'mrr', 'arr', 'crowdfunding',
  ]
  const matches = terms.filter((term) => text.includes(term)).length

  return Math.min(100, matches * 18)
}

export function calculateInvestmentSignalScore(signal: Pick<InvestmentSignal, 'similarity_score' | 'source_category' | 'source_confidence' | 'title' | 'snippet'>) {
  const categoryWeight = categoryWeights[signal.source_category] ?? 0.5
  return clampScore(
    signal.similarity_score * 0.5 +
    categoryWeight * 100 * 0.25 +
    signal.source_confidence * 100 * 0.15 +
    tractionTermScore(signal) * 0.1,
  )
}

export function calculateInnovationPenaltyFromInvestmentSignal(signal: Pick<InvestmentSignal, 'investment_signal_score'>) {
  if (signal.investment_signal_score >= 80) return 25
  if (signal.investment_signal_score >= 60) return 15
  if (signal.investment_signal_score >= 40) return 8
  return 0
}

function logInvestmentConnector(query: string, status: number | null, resultCount: number, error?: string) {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  console.log('[business-validation-investment]', {
    source: 'investment_signals',
    query,
    httpStatus: status,
    resultCount,
    error: error || null,
  })
}

async function searchBraveInvestmentQuery(query: string) {
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY || '',
      },
    },
  )
  const text = await response.text()

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${text}`)
    ;(error as Error & { httpStatus?: number }).httpStatus = response.status
    throw error
  }

  return {
    data: text ? JSON.parse(text) as { web?: { results?: BraveResult[] } } : {},
    httpStatus: response.status,
  }
}

export async function searchInvestmentSignalsWithBrave(
  input: BusinessValidationInput,
  queries = generateInvestmentSignalQueries(input),
): Promise<InvestmentSignalSearchResult> {
  if (!process.env.BRAVE_SEARCH_API_KEY) {
    return {
      queries,
      signals: [],
      status: {
        source_type: 'investment_signals',
        attempted: false,
        success: false,
        result_count: 0,
        error_message: 'BRAVE_SEARCH_API_KEY not configured',
      },
      connectorErrors: [],
      innovationPenaltyApplied: 0,
      sourcesConsulted: [],
    }
  }

  const connectorErrors: string[] = []
  const rawResults: BraveResult[] = []

  for (const query of queries.slice(0, 12)) {
    try {
      const { data, httpStatus } = await searchBraveInvestmentQuery(query.query_text)
      const results = (data.web?.results || []).slice(0, 5)
      rawResults.push(...results)
      logInvestmentConnector(query.query_text, httpStatus, results.length)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Investment signal search failed.'
      connectorErrors.push(message)
      logInvestmentConnector(
        query.query_text,
        error instanceof Error ? (error as Error & { httpStatus?: number }).httpStatus || null : null,
        0,
        message,
      )
    }
  }

  const seenUrls = new Set<string>()
  const signals: InvestmentSignal[] = rawResults
    .flatMap((result) => {
      const sourceUrl = compact(result.url)
      const fields = extractInvestmentSignalFields(result)

      if (!sourceUrl || (!fields.title && !fields.snippet) || seenUrls.has(sourceUrl)) {
        return []
      }

      seenUrls.add(sourceUrl)
      const source = classifyInvestmentSource(sourceUrl, fields.title, fields.snippet)
      const similarityScore = calculateSimilarityScore(input, {
        name: fields.startup_name || fields.title || 'Investment signal',
        description: fields.snippet || fields.title,
        evidence_summary: fields.snippet || fields.title,
        candidate_type: 'Sinal de investimento/captação',
        website_url: sourceUrl,
        source_type: 'web',
      })
      const baseSignal: InvestmentSignal = {
        source_platform: source.platform,
        source_category: source.category,
        startup_name: fields.startup_name,
        source_url: sourceUrl,
        title: fields.title || 'Resultado público',
        snippet: fields.snippet || '',
        sector: null,
        problem: null,
        solution: null,
        target_audience: null,
        business_model: null,
        investment_thesis: fields.investment_thesis,
        traction: fields.traction,
        customers: fields.customers,
        revenue_indicators: fields.revenue_indicators,
        amount_raised: fields.amount_raised,
        target_fundraising_amount: fields.target_fundraising_amount,
        ticket_size: fields.ticket_size,
        valuation: fields.valuation,
        round_status: fields.round_status,
        investment_instrument: fields.investment_instrument,
        use_of_funds: fields.use_of_funds,
        risk_notes: 'Sinal de mercado/investimento; não prova sucesso da startup.',
        similarity_score: similarityScore,
        investment_signal_score: 0,
        market_validation_signal: true,
        innovation_penalty: 0,
        source_confidence: source.confidence,
        raw_payload: result,
        collected_at: nowIso(),
      }
      const investmentSignalScore = calculateInvestmentSignalScore(baseSignal)
      const signal: InvestmentSignal = {
        ...baseSignal,
        investment_signal_score: investmentSignalScore,
        innovation_penalty: calculateInnovationPenaltyFromInvestmentSignal({ investment_signal_score: investmentSignalScore }),
      }

      return [signal]
    })
    .sort((a, b) => b.investment_signal_score - a.investment_signal_score)

  return {
    queries,
    signals,
    status: {
      source_type: 'investment_signals',
      attempted: true,
      success: connectorErrors.length < queries.length,
      result_count: signals.length,
      error_message: connectorErrors.length > 0 ? connectorErrors.slice(0, 3).join(' | ') : null,
    },
    connectorErrors,
    innovationPenaltyApplied: Math.min(35, Math.max(0, ...signals.map((signal) => signal.innovation_penalty))),
    sourcesConsulted: Array.from(new Set(signals.map((signal) => signal.source_platform))),
  }
}
