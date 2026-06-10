import {
  type ConfiguredWebSearchProvider,
  type NormalizedWebSearchResult,
  getConfiguredWebSearchProvider,
  runConfiguredWebSearch,
} from './web-search-providers'
import {
  MAX_INVESTMENT_QUERIES_PER_RUN,
  MAX_TOTAL_INVESTMENT_RESULTS,
} from './business-validation-config'
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
  provider: string
  display_name: string
  domain: string
  result_kind: string
  relevance_level: 'forte' | 'médio' | 'fraco' | 'irrelevante'
  evidence_strength: 'alta' | 'média' | 'baixa'
  is_actual_investment_signal: boolean
  is_specific_startup_or_product: boolean
  matched_problem: string[]
  matched_audience: string[]
  matched_solution: string[]
  matched_business_model: string[]
  matched_differentiators: string[]
  similarity_reason: string
  novelty_impact_reason: string
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
  configuredProvider: ConfiguredWebSearchProvider
  queriesGenerated: number
  queriesExecuted: number
  rawResultsBeforeDedup: number
  resultsAfterDedup: number
  requestBudgetUsed: string
}

const categoryWeights: Record<string, number> = {
  equity_crowdfunding: 1,
  startup_database: 0.9,
  venture_capital: 0.9,
  accelerator: 0.8,
  angel_network: 0.8,
  market_intelligence: 0.8,
  startup_media: 0.6,
  startup_article: 0.35,
  market_reference: 0.25,
  public_registry: 0.5,
  startup_ecosystem: 0.6,
  unrelated_or_weak: 0.1,
}

const genericInvestmentWords = new Set([
  'innovation', 'inovacao', 'inovação', 'startup', 'business', 'platform',
  'software', 'solution', 'solucao', 'solução', 'idea', 'ideia', 'validation',
  'validacao', 'validação', 'tecnologia', 'technology', 'negocio', 'negócio',
  'projeto', 'project', 'market', 'mercado', 'ferramenta', 'ferramentas',
])

const meaningfulFocusTerms = new Set([
  'collaboration', 'colaboracao', 'colaboração', 'cofounder', 'marketplace',
  'contributor', 'colaborador', 'colaboradores', 'reward', 'rewards',
  'recompensa', 'recompensas', 'task', 'tasks', 'tarefa', 'tarefas', 'mvp',
  'github', 'colabscore', 'crowdfunding', 'accelerator', 'aceleradora',
  'funding', 'investment', 'investimento', 'captacao', 'captação',
  'portfolio', 'database', 'venture', 'angel', 'anjo',
])

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

function selectInvestmentQueriesForRun(
  queries: ReturnType<typeof generateInvestmentSignalQueries>,
  input: BusinessValidationInput,
) {
  const selected: typeof queries = []
  const add = (query: (typeof queries)[number] | undefined) => {
    if (!query || selected.some((item) => item.query_text === query.query_text)) {
      return
    }

    selected.push(query)
  }
  const hasPortugueseContext = /brasil|latam|portugu|inova|valida|ideia|plataforma/i.test([
    input.ideaName,
    input.problem,
    input.proposedSolution,
    input.marketRegion,
  ].join(' '))

  add(queries.find((query) => (
    !query.query_text.startsWith('site:') &&
    /\bfunding\b|\binvestment\b/i.test(query.query_text) &&
    !/[ãçáéíóú]/i.test(query.query_text)
  )))
  add(queries.find((query) => (
    !query.query_text.startsWith('site:') &&
    (hasPortugueseContext ? /investimento|captação|captacao/i.test(query.query_text) : /investment|funding/i.test(query.query_text))
  )))
  add(
    queries.find((query) => /site:captable\.com\.br|site:eqseed\.com|site:crunchbase\.com|site:distrito\.me/i.test(query.query_text)) ||
    queries.find((query) => query.query_text.startsWith('site:')),
  )

  for (const query of queries) {
    add(query)

    if (selected.length >= MAX_INVESTMENT_QUERIES_PER_RUN) {
      break
    }
  }

  return selected.slice(0, MAX_INVESTMENT_QUERIES_PER_RUN)
}

export function classifyInvestmentSource(url: string, title = '', snippet = '') {
  const haystack = `${url} ${title} ${snippet}`.toLowerCase()
  const domain = extractDomain(url)
  const kind = classifyResultKind(haystack)

  if (haystack.includes('captable.com.br')) return { platform: 'Captable', category: 'equity_crowdfunding', resultKind: kind || 'fundraising_campaign', confidence: 0.9 }
  if (haystack.includes('eqseed.com')) return { platform: 'EqSeed', category: 'equity_crowdfunding', resultKind: kind || 'fundraising_campaign', confidence: 0.9 }
  if (haystack.includes('startmeup') || haystack.includes('smu.com.br')) return { platform: 'SMU / StartMeUp', category: 'equity_crowdfunding', resultKind: kind || 'fundraising_campaign', confidence: 0.82 }
  if (haystack.includes('kria.vc') || haystack.includes('kria.com.br')) return { platform: 'Kria', category: 'equity_crowdfunding', resultKind: kind || 'fundraising_campaign', confidence: 0.88 }
  if (haystack.includes('wiztartup.com')) return { platform: 'Wiztartup', category: 'equity_crowdfunding', resultKind: kind || 'fundraising_campaign', confidence: 0.82 }
  if (haystack.includes('anjosdobrasil.net')) return { platform: 'Anjos do Brasil', category: 'angel_network', resultKind: kind || 'investor_page', confidence: 0.8 }
  if (haystack.includes('bossainvest.com')) return { platform: 'Bossa Invest', category: 'venture_capital', resultKind: kind || 'investor_page', confidence: 0.82 }
  if (haystack.includes('acestartups.com.br') || haystack.includes('aceventures.com.br')) return { platform: 'ACE Startups', category: 'accelerator', resultKind: kind || 'accelerator_portfolio', confidence: 0.8 }
  if (haystack.includes('wow.ac')) return { platform: 'WOW Aceleradora', category: 'accelerator', resultKind: kind || 'accelerator_portfolio', confidence: 0.78 }
  if (haystack.includes('distrito.me')) return { platform: 'Distrito', category: 'startup_database', resultKind: kind || 'startup_database_entry', confidence: 0.86 }
  if (haystack.includes('startse.com')) return { platform: 'StartSe', category: 'startup_media', resultKind: kind || 'market_article', confidence: 0.7 }
  if (haystack.includes('latitud.com')) return { platform: 'Latitud', category: 'accelerator', resultKind: kind || 'accelerator_portfolio', confidence: 0.78 }
  if (haystack.includes('abstartups.com.br')) return { platform: 'ABStartups', category: 'startup_ecosystem', resultKind: kind || 'startup_database_entry', confidence: 0.7 }
  if (haystack.includes('abvcap.com.br')) return { platform: 'ABVCAP', category: 'venture_capital', resultKind: kind || 'investor_page', confidence: 0.72 }
  if (haystack.includes('cvm.gov.br')) return { platform: 'CVM', category: 'public_registry', resultKind: kind || 'generic_content', confidence: 0.7 }
  if (haystack.includes('slinghub.io') || haystack.includes('slinghub.com')) return { platform: 'Sling Hub', category: 'startup_database', resultKind: kind || 'startup_database_entry', confidence: 0.82 }
  if (haystack.includes('crunchbase.com')) return { platform: 'Crunchbase', category: 'startup_database', resultKind: kind || 'startup_database_entry', confidence: 0.88 }
  if (haystack.includes('pitchbook.com')) return { platform: 'PitchBook', category: 'startup_database', resultKind: kind || 'startup_database_entry', confidence: 0.84 }
  if (haystack.includes('cbinsights.com')) return { platform: 'CB Insights', category: 'market_intelligence', resultKind: kind || 'startup_database_entry', confidence: 0.82 }
  if (haystack.includes('dealroom.co')) return { platform: 'Dealroom', category: 'startup_database', resultKind: kind || 'startup_database_entry', confidence: 0.86 }
  if (haystack.includes('tracxn.com')) return { platform: 'Tracxn', category: 'startup_database', resultKind: kind || 'startup_database_entry', confidence: 0.84 }

  return {
    platform: domain || 'Tavily Web Result',
    category: kind === 'tool_list_article' ? 'startup_article' : kind === 'generic_content' ? 'market_reference' : 'unrelated_or_weak',
    resultKind: kind || 'generic_content',
    confidence: 0.45,
  }
}

function extractDomain(url: string | null | undefined) {
  if (!url) return ''

  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0]?.replace(/^www\./, '') || ''
  }
}

function classifyResultKind(text: string) {
  if (/\b(raised|raises|captou|levantou|funding round|rodada|series [abc]|pre-seed|seed round)\b/i.test(text)) return 'funding_round'
  if (/\b(crowdfunding|equity crowdfunding|captação|captacao|oferta pública|investir a partir)\b/i.test(text)) return 'fundraising_campaign'
  if (/\b(portfolio|portfólio|batch|acelerad[ao]|accelerator|startup selecionada)\b/i.test(text)) return 'accelerator_portfolio'
  if (/\b(crunchbase|dealroom|tracxn|sling hub|startup database|company profile|perfil da startup)\b/i.test(text)) return 'startup_database_entry'
  if (/\b(vc|venture capital|investor|investidora|anjos|angel|fundo de investimento)\b/i.test(text)) return 'investor_page'
  if (/\b(top|melhores|lista|ferramentas|tools|alternativas|software para)\b/i.test(text)) return 'tool_list_article'
  if (/\b(article|artigo|blog|guia|guide|como validar|how to validate)\b/i.test(text)) return 'market_article'
  return 'generic_content'
}

export function extractCandidateIdentity(result: NormalizedWebSearchResult) {
  const title = compact(result.title) || 'Untitled result'
  const domain = extractDomain(result.url)
  const snippet = compact(result.snippet)
  const source = classifyInvestmentSource(result.url || '', title, snippet)
  const titlePieces = title.split(/\s[-|–]\s|:/).map((piece) => piece.trim()).filter(Boolean)
  const candidatePiece = titlePieces.find((piece) => (
    piece.length >= 2 &&
    piece.length <= 80 &&
    !/^(top|melhores|lista|guia|como|how|what|por que|why)\b/i.test(piece)
  ))
  const displayName = candidatePiece || title.slice(0, 80)

  return {
    display_name: displayName,
    domain,
    source_platform: source.platform,
    result_kind: source.resultKind,
    short_summary: snippet.slice(0, 280),
  }
}

function extractPattern(text: string, pattern: RegExp) {
  return text.match(pattern)?.[0] || null
}

function meaningfulInvestmentTokens(text: string) {
  const baseTokens = tokenize(text).filter((token) => !genericInvestmentWords.has(token))
  const phraseMatches = [
    ['business validation', 'validação de negócios', 'validacao de negocios'],
    ['idea validation', 'validação de ideias', 'validacao de ideias'],
    ['open innovation', 'inovação aberta', 'inovacao aberta'],
    ['task marketplace', 'marketplace de tarefas'],
    ['startup collaboration', 'colaboração entre startups', 'colaboracao entre startups'],
  ].flatMap((phrases) => (
    phrases.some((phrase) => text.toLowerCase().includes(phrase))
      ? [phrases[0].replace(/\s+/g, ' ')]
      : []
  ))

  return Array.from(new Set([...baseTokens, ...phraseMatches].filter((token) => (
    meaningfulFocusTerms.has(token) ||
    token.includes('validation') ||
    token.includes('validacao') ||
    token.includes('validação') ||
    token.length >= 5
  ))))
}

function matchingTerms(sourceText: string, resultText: string) {
  const result = resultText.toLowerCase()

  return meaningfulInvestmentTokens(sourceText)
    .filter((token) => result.includes(token.toLowerCase()))
    .slice(0, 8)
}

export function explainInvestmentSimilarity(
  signal: Pick<InvestmentSignal, 'title' | 'snippet' | 'result_kind' | 'source_category' | 'similarity_score' | 'is_actual_investment_signal' | 'is_specific_startup_or_product'>,
  input: BusinessValidationInput,
) {
  const resultText = `${signal.title} ${signal.snippet}`.toLowerCase()
  const matchedProblem = matchingTerms(input.problem, resultText)
  const matchedAudience = matchingTerms(input.targetAudience, resultText)
  const matchedSolution = matchingTerms(input.proposedSolution, resultText)
  const matchedBusinessModel = matchingTerms(input.businessModel, resultText)
  const matchedDifferentiators = matchingTerms(input.declaredDifferentiators, resultText)
  const matches = [
    ...matchedProblem,
    ...matchedAudience,
    ...matchedSolution,
    ...matchedBusinessModel,
    ...matchedDifferentiators,
  ]
  const uniqueMatches = Array.from(new Set(matches)).slice(0, 8)
  const hasSpecificMatch = uniqueMatches.length >= 2 || /idea validation|business validation|open innovation|task marketplace|startup collaboration/i.test(resultText)
  const similarityReason = hasSpecificMatch
    ? `Combina com: ${uniqueMatches.join(', ')}.`
    : 'Sem correspondência específica suficiente; resultado tratado como referência fraca.'
  const noveltyImpactReason = signal.is_actual_investment_signal || signal.is_specific_startup_or_product
    ? signal.similarity_score >= 45 && hasSpecificMatch
      ? 'Pode reduzir novidade porque apresenta startup/produto/modelo público com semelhança relevante.'
      : 'Sinal específico, mas sem correspondência suficiente para reduzir fortemente a novidade.'
    : 'Não reduz novidade: referência genérica ou artigo sem sinal claro de startup/produto semelhante.'

  return {
    matched_problem: matchedProblem,
    matched_audience: matchedAudience,
    matched_solution: matchedSolution,
    matched_business_model: matchedBusinessModel,
    matched_differentiators: matchedDifferentiators,
    similarity_reason: similarityReason,
    novelty_impact_reason: noveltyImpactReason,
  }
}

export function extractInvestmentSignalFields(result: NormalizedWebSearchResult) {
  const title = compact(result.title)
  const snippet = compact(result.snippet)
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

function calculateRelevanceAndStrength(signal: Pick<InvestmentSignal, 'similarity_score' | 'investment_signal_score' | 'source_category' | 'result_kind' | 'title' | 'snippet' | 'source_confidence'>) {
  const text = `${signal.title} ${signal.snippet}`.toLowerCase()
  const specificStartupOrProduct = /\b(profile|company|startup|produto|product|app|saas|platform|plataforma)\b/i.test(text) &&
    !['tool_list_article', 'market_article', 'generic_content', 'unrelated'].includes(signal.result_kind)
  const actualInvestmentSignal = /\b(raised|raises|funding|investment|investimento|captou|captação|captacao|rodada|seed|series|crowdfunding|portfolio|accelerator|venture|anjos)\b/i.test(text) ||
    ['equity_crowdfunding', 'venture_capital', 'accelerator', 'angel_network', 'startup_database', 'market_intelligence'].includes(signal.source_category)
  const generic = ['tool_list_article', 'market_article', 'generic_content'].includes(signal.result_kind)

  if (signal.similarity_score >= 60 && (actualInvestmentSignal || specificStartupOrProduct) && !generic) {
    return {
      relevanceLevel: 'forte' as const,
      evidenceStrength: signal.source_confidence >= 0.75 ? 'alta' as const : 'média' as const,
      isActualInvestmentSignal: actualInvestmentSignal,
      isSpecificStartupOrProduct: specificStartupOrProduct,
    }
  }

  if (signal.similarity_score >= 40 && (actualInvestmentSignal || specificStartupOrProduct)) {
    return {
      relevanceLevel: 'médio' as const,
      evidenceStrength: actualInvestmentSignal ? 'média' as const : 'baixa' as const,
      isActualInvestmentSignal: actualInvestmentSignal,
      isSpecificStartupOrProduct: specificStartupOrProduct,
    }
  }

  if (signal.similarity_score >= 20 || generic) {
    return {
      relevanceLevel: 'fraco' as const,
      evidenceStrength: 'baixa' as const,
      isActualInvestmentSignal: actualInvestmentSignal && !generic,
      isSpecificStartupOrProduct: specificStartupOrProduct && !generic,
    }
  }

  return {
    relevanceLevel: 'irrelevante' as const,
    evidenceStrength: 'baixa' as const,
    isActualInvestmentSignal: false,
    isSpecificStartupOrProduct: false,
  }
}

export function calculateInnovationPenaltyFromInvestmentSignal(
  signal: Pick<InvestmentSignal, 'investment_signal_score' | 'relevance_level' | 'is_actual_investment_signal' | 'is_specific_startup_or_product'>,
) {
  if (
    !['forte', 'médio'].includes(signal.relevance_level) ||
    (!signal.is_actual_investment_signal && !signal.is_specific_startup_or_product)
  ) {
    return signal.relevance_level === 'fraco' ? Math.min(5, signal.investment_signal_score >= 40 ? 5 : 0) : 0
  }

  if (signal.investment_signal_score >= 80) return 25
  if (signal.investment_signal_score >= 60) return 15
  if (signal.investment_signal_score >= 40) return 8
  return 0
}

function logInvestmentConnector(provider: ConfiguredWebSearchProvider, query: string, resultCount: number, error?: string) {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  console.log('[business-validation-investment]', {
    source: 'investment_signals',
    configuredProvider: provider,
    query,
    resultCount,
    error: error || null,
  })
}

export async function searchInvestmentSignals(
  input: BusinessValidationInput,
  queries = generateInvestmentSignalQueries(input),
): Promise<InvestmentSignalSearchResult> {
  const configuredProvider = getConfiguredWebSearchProvider()

  if (configuredProvider === 'not_configured') {
    return {
      queries: [],
      signals: [],
      status: {
        source_type: 'investment_signals',
        attempted: false,
        success: false,
        result_count: 0,
        error_message: 'No web search provider configured',
      },
      connectorErrors: [],
      innovationPenaltyApplied: 0,
      sourcesConsulted: [],
      configuredProvider,
      queriesGenerated: queries.length,
      queriesExecuted: 0,
      rawResultsBeforeDedup: 0,
      resultsAfterDedup: 0,
      requestBudgetUsed: `0/${MAX_INVESTMENT_QUERIES_PER_RUN}`,
    }
  }

  const connectorErrors: string[] = []
  const rawResults: NormalizedWebSearchResult[] = []
  const queryCache = new Map<string, NormalizedWebSearchResult[]>()
  const selectedQueries = selectInvestmentQueriesForRun(queries, input)

  for (const query of selectedQueries) {
    try {
      const cachedResults = queryCache.get(query.query_text)
      const results = cachedResults || (await runConfiguredWebSearch(query.query_text)).results

      if (!cachedResults) {
        queryCache.set(query.query_text, results)
      }

      rawResults.push(...results)
      logInvestmentConnector(configuredProvider, query.query_text, results.length)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Investment signal search failed.'
      connectorErrors.push(message)
      logInvestmentConnector(
        configuredProvider,
        query.query_text,
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
      const identity = extractCandidateIdentity(result)
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
        snippet: (fields.snippet || '').slice(0, 900),
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
        provider: result.provider,
        display_name: identity.display_name,
        domain: identity.domain,
        result_kind: source.resultKind,
        relevance_level: 'fraco',
        evidence_strength: 'baixa',
        is_actual_investment_signal: false,
        is_specific_startup_or_product: false,
        matched_problem: [],
        matched_audience: [],
        matched_solution: [],
        matched_business_model: [],
        matched_differentiators: [],
        similarity_reason: '',
        novelty_impact_reason: '',
        raw_payload: result.raw,
        collected_at: nowIso(),
      }
      const investmentSignalScore = calculateInvestmentSignalScore(baseSignal)
      const relevance = calculateRelevanceAndStrength({
        ...baseSignal,
        investment_signal_score: investmentSignalScore,
      })
      const explanation = explainInvestmentSimilarity({
        ...baseSignal,
        is_actual_investment_signal: relevance.isActualInvestmentSignal,
        is_specific_startup_or_product: relevance.isSpecificStartupOrProduct,
      }, input)
      const signal: InvestmentSignal = {
        ...baseSignal,
        investment_signal_score: investmentSignalScore,
        relevance_level: relevance.relevanceLevel,
        evidence_strength: relevance.evidenceStrength,
        is_actual_investment_signal: relevance.isActualInvestmentSignal,
        is_specific_startup_or_product: relevance.isSpecificStartupOrProduct,
        matched_problem: explanation.matched_problem,
        matched_audience: explanation.matched_audience,
        matched_solution: explanation.matched_solution,
        matched_business_model: explanation.matched_business_model,
        matched_differentiators: explanation.matched_differentiators,
        similarity_reason: explanation.similarity_reason,
        novelty_impact_reason: explanation.novelty_impact_reason,
        innovation_penalty: 0,
      }

      return [
        {
          ...signal,
          innovation_penalty: calculateInnovationPenaltyFromInvestmentSignal(signal),
        },
      ]
    })
    .sort((a, b) => b.investment_signal_score - a.investment_signal_score)
    .slice(0, MAX_TOTAL_INVESTMENT_RESULTS)

  return {
    queries: selectedQueries,
    signals,
    status: {
      source_type: 'investment_signals',
      attempted: true,
      success: connectorErrors.length < selectedQueries.length,
      result_count: signals.length,
      error_message: connectorErrors.length > 0 ? connectorErrors.slice(0, 3).join(' | ') : null,
    },
    connectorErrors,
    innovationPenaltyApplied: Math.min(35, Math.max(0, ...signals.map((signal) => signal.innovation_penalty))),
    sourcesConsulted: Array.from(new Set(signals.map((signal) => signal.source_platform))),
    configuredProvider,
    queriesGenerated: queries.length,
    queriesExecuted: selectedQueries.length,
    rawResultsBeforeDedup: rawResults.length,
    resultsAfterDedup: signals.length,
    requestBudgetUsed: `${selectedQueries.length}/${MAX_INVESTMENT_QUERIES_PER_RUN}`,
  }
}

export const searchInvestmentSignalsWithBrave = searchInvestmentSignals
