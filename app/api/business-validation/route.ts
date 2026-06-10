import { NextResponse } from 'next/server'
import {
  type InvestmentSignal,
  searchInvestmentSignals,
} from '@/lib/business-validation/investment-signals'
import { MAX_INVESTMENT_QUERIES_PER_RUN } from '@/lib/business-validation/business-validation-config'
import { generateBusinessValidationMarkdown } from '@/lib/business-validation/report'
import { runBusinessValidationSearches } from '@/lib/business-validation/search-connectors'
import {
  calculateDifferentiationScore,
  calculateNoveltyScore,
  calculateRiskScore,
  getOverallRecommendation,
} from '@/lib/business-validation/scoring'
import { supabaseAdmin } from '@/lib/supabase'

interface ValidationRunRecord {
  id: string
  idea_id: string
  status: string | null
  idea_name: string | null
  short_description: string | null
  problem: string | null
  target_audience: string | null
  proposed_solution: string | null
  declared_differentiators: string | null
  business_model: string | null
  market_region: string | null
  known_competitors: string | null
  novelty_score: number | null
  risk_score: number | null
  differentiation_score: number | null
  overall_recommendation: string | null
  created_at: string | null
  completed_at: string | null
}

interface ValidationChildRecord {
  validation_run_id: string
}

interface ConnectorStatusRecord extends ValidationChildRecord {
  source_type: string
  attempted: boolean | null
  success: boolean | null
  result_count: number | null
  error_message: string | null
}

interface InvestmentSignalRecord extends ValidationChildRecord {
  source_platform: string | null
  source_category: string | null
  startup_name: string | null
  source_url: string | null
  title: string | null
  snippet: string | null
  similarity_score: number | null
  investment_signal_score: number | null
  innovation_penalty: number | null
  source_confidence: number | null
  provider: string | null
}

interface IdeaRecord {
  id: string
  nome_projeto: string | null
  github_repo_url: string | null
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function logDev(label: string, payload: unknown) {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  console.error(`[business-validation] ${label}`, payload)
}

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro desconhecido.'
}

function finiteNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function clampNumber(value: unknown, min: number, max: number, fallback = 0) {
  return Math.max(min, Math.min(max, finiteNumber(value, fallback)))
}

function safeJson(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value ?? null))
  } catch {
    return null
  }
}

function sanitizeInvestmentSignalForInsert(signal: InvestmentSignal, validationRunId: string) {
  return {
    ...signal,
    validation_run_id: validationRunId,
    source_url: typeof signal.source_url === 'string' ? signal.source_url : null,
    similarity_score: clampNumber(signal.similarity_score, 0, 100),
    investment_signal_score: clampNumber(signal.investment_signal_score, 0, 100),
    innovation_penalty: clampNumber(signal.innovation_penalty, 0, 35),
    source_confidence: clampNumber(signal.source_confidence, 0, 1, 0.5),
    raw_payload: safeJson(signal.raw_payload),
  }
}

function summarizeInvestmentSignals(signals: InvestmentSignal[]) {
  const strongCount = signals.filter((signal) => signal.relevance_level === 'forte').length
  const mediumCount = signals.filter((signal) => signal.relevance_level === 'médio').length
  const weakCount = signals.filter((signal) => ['fraco', 'irrelevante'].includes(signal.relevance_level)).length
  const domainsFound = Array.from(new Set(signals.map((signal) => signal.domain).filter(Boolean)))
  const platformsFound = Array.from(new Set(signals
    .filter((signal) => signal.source_platform && signal.source_platform !== signal.domain)
    .map((signal) => signal.source_platform)))

  return {
    strongCount,
    mediumCount,
    weakCount,
    domainsFound,
    platformsFound,
  }
}

async function safeInsertMany<T>(
  label: string,
  action: () => PromiseLike<{ data: T[] | null, error: { message: string } | null }>,
  warnings: string[],
) {
  try {
    const result = await action()

    if (result.error) {
      logDev(`${label} insert failed`, result.error)
      warnings.push(`${label}: ${result.error.message}`)
      return []
    }

    return result.data || []
  } catch (error) {
    const message = asErrorMessage(error)
    logDev(`${label} insert threw`, error)
    warnings.push(`${label}: ${message}`)
    return []
  }
}

async function loadValidationHistory(ideaId: string) {
  const { data: runs, error: runsError } = await supabaseAdmin
    .from('business_validation_runs')
    .select('*')
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false })
    .returns<ValidationRunRecord[]>()

  if (runsError) {
    throw new Error(runsError.message)
  }

  const runIds = (runs || []).map((run) => run.id)

  if (runIds.length === 0) {
    return []
  }

  const [queriesResult, candidatesResult, reportsResult, connectorStatusResult, investmentSignalsResult] = await Promise.all([
    supabaseAdmin
      .from('business_validation_queries')
      .select('*')
      .in('validation_run_id', runIds)
      .returns<ValidationChildRecord[]>(),
    supabaseAdmin
      .from('business_validation_candidates')
      .select('*')
      .in('validation_run_id', runIds)
      .returns<ValidationChildRecord[]>(),
    supabaseAdmin
      .from('business_validation_reports')
      .select('*')
      .in('validation_run_id', runIds)
      .returns<ValidationChildRecord[]>(),
    supabaseAdmin
      .from('business_validation_connector_status')
      .select('*')
      .in('validation_run_id', runIds)
      .returns<ConnectorStatusRecord[]>(),
    supabaseAdmin
      .from('business_validation_investment_signals')
      .select('*')
      .in('validation_run_id', runIds)
      .returns<InvestmentSignalRecord[]>(),
  ])

  const firstError = [
    queriesResult.error,
    candidatesResult.error,
    reportsResult.error,
    connectorStatusResult.error,
    investmentSignalsResult.error,
  ].find(Boolean)

  if (firstError) {
    throw new Error(firstError.message)
  }

  const groupByRunId = <T extends ValidationChildRecord>(items: T[] | null) => {
    const grouped = new Map<string, T[]>()

    for (const item of items || []) {
      const runItems = grouped.get(item.validation_run_id) || []
      runItems.push(item)
      grouped.set(item.validation_run_id, runItems)
    }

    return grouped
  }

  const queriesByRunId = groupByRunId(queriesResult.data)
  const candidatesByRunId = groupByRunId(candidatesResult.data)
  const reportsByRunId = groupByRunId(reportsResult.data)
  const connectorStatusesByRunId = groupByRunId(connectorStatusResult.data)
  const investmentSignalsByRunId = groupByRunId(investmentSignalsResult.data)

  return (runs || []).map((run) => ({
    ...run,
    queries: queriesByRunId.get(run.id) || [],
    candidates: candidatesByRunId.get(run.id) || [],
    reports: reportsByRunId.get(run.id) || [],
    sourceStatuses: connectorStatusesByRunId.get(run.id) || [],
    investmentSignals: investmentSignalsByRunId.get(run.id) || [],
  }))
}

function applyInvestmentNoveltyPenalty(baseNoveltyScore: number | null, investmentSignals: InvestmentSignal[]) {
  if (investmentSignals.length === 0) {
    return baseNoveltyScore
  }

  const penalty = Math.min(35, Math.max(0, ...investmentSignals.map((signal) => signal.innovation_penalty || 0)))
  const base = baseNoveltyScore ?? 80

  return Math.max(0, Math.min(100, base - penalty))
}

function getRecommendationWithInvestmentSignals({
  noveltyScore,
  riskScore,
  differentiationScore,
  candidates,
  investmentSignals,
}: {
  noveltyScore: number | null
  riskScore: number | null
  differentiationScore: number | null
  candidates: Parameters<typeof getOverallRecommendation>[3]
  investmentSignals: InvestmentSignal[]
}) {
  const baseRecommendation = getOverallRecommendation(noveltyScore, riskScore, differentiationScore, candidates)
  const strongSignals = investmentSignals.filter((signal) => signal.investment_signal_score >= 70 && signal.similarity_score >= 55)
  const weakDifferentiation = differentiationScore === null || differentiationScore < 55

  if (strongSignals.length >= 2 && weakDifferentiation) {
    return 'pivotar'
  }

  if (strongSignals.length >= 1 && weakDifferentiation) {
    return 'nichar'
  }

  if (strongSignals.length >= 1) {
    return 'ajustar'
  }

  return baseRecommendation
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ideaId = searchParams.get('ideaId')

  if (!ideaId) {
    return NextResponse.json({ error: 'ideaId é obrigatório.' }, { status: 400 })
  }

  try {
    const runs = await loadValidationHistory(ideaId)
    return NextResponse.json({ runs }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar histórico.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const ideaId = normalizeText(body.ideaId)

  if (!ideaId) {
    return NextResponse.json({ error: 'ideaId é obrigatório.' }, { status: 400 })
  }

  const input = {
    ideaName: normalizeText(body.ideaName),
    shortDescription: normalizeText(body.shortDescription),
    problem: normalizeText(body.problem),
    targetAudience: normalizeText(body.targetAudience),
    proposedSolution: normalizeText(body.proposedSolution),
    declaredDifferentiators: normalizeText(body.declaredDifferentiators),
    businessModel: normalizeText(body.businessModel),
    marketRegion: normalizeText(body.marketRegion),
    knownCompetitors: normalizeText(body.knownCompetitors),
  }

  if (!input.ideaName || !input.problem || !input.proposedSolution) {
    return NextResponse.json(
      { error: 'Preencha pelo menos nome da ideia, problema e solução proposta.' },
      { status: 400 },
    )
  }

  const { data: idea, error: ideaError } = await supabaseAdmin
    .from('ideas')
    .select('id, nome_projeto, github_repo_url')
    .eq('id', ideaId)
    .single<IdeaRecord>()

  if (ideaError || !idea) {
    return NextResponse.json({ error: 'Ideia não encontrada.' }, { status: 404 })
  }

  const { data: previousRuns, error: previousRunsError } = await supabaseAdmin
    .from('business_validation_runs')
    .select('id')
    .eq('idea_id', ideaId)
    .returns<Array<{ id: string }>>()

  if (previousRunsError) {
    return NextResponse.json({ error: previousRunsError.message }, { status: 500 })
  }

  const searchInput = {
    ...input,
    ideaId,
    ideaName: input.ideaName || idea.nome_projeto || '',
    ownProjectUrls: [idea.github_repo_url].filter(Boolean) as string[],
    ownValidationRunIds: (previousRuns || []).map((run) => run.id),
  }

  const { data: run, error: runError } = await supabaseAdmin
    .from('business_validation_runs')
    .insert([
      {
        idea_id: ideaId,
        status: 'running',
        idea_name: input.ideaName,
        short_description: input.shortDescription,
        problem: input.problem,
        target_audience: input.targetAudience,
        proposed_solution: input.proposedSolution,
        declared_differentiators: input.declaredDifferentiators,
        business_model: input.businessModel,
        market_region: input.marketRegion,
        known_competitors: input.knownCompetitors,
      },
    ])
    .select('*')
    .single<ValidationRunRecord>()

  if (runError || !run) {
    return NextResponse.json({ error: runError?.message || 'Erro ao salvar validação.' }, { status: 500 })
  }

  const warnings: string[] = []
  let searchResult: Awaited<ReturnType<typeof runBusinessValidationSearches>>

  try {
    searchResult = await runBusinessValidationSearches(searchInput)
  } catch (error) {
    const message = asErrorMessage(error)
    warnings.push(`Busca externa geral falhou: ${message}`)
    logDev('general search failed', error)
    searchResult = {
      queries: [],
      candidates: [],
      connectorErrors: [message],
      sourceStatuses: [
        {
          source_type: 'external_search',
          attempted: true,
          success: false,
          result_count: 0,
          error_message: message,
        },
      ],
      skippedQueries: [],
      sourcesUsed: [],
      usedFallback: false,
      realExternalCandidateCount: 0,
    }
  }

  let investmentResult: Awaited<ReturnType<typeof searchInvestmentSignals>>

  try {
    investmentResult = await searchInvestmentSignals(searchInput)
  } catch (error) {
    const message = asErrorMessage(error)
    warnings.push(`Camada de investimento falhou: ${message}`)
    logDev('investment search failed', error)
    investmentResult = {
      queries: [],
      signals: [],
      status: {
        source_type: 'investment_signals',
        attempted: true,
        success: false,
        result_count: 0,
        error_message: message,
      },
      connectorErrors: [message],
      innovationPenaltyApplied: 0,
      sourcesConsulted: [],
      configuredProvider: 'not_configured',
      queriesGenerated: 0,
      queriesExecuted: 0,
      rawResultsBeforeDedup: 0,
      resultsAfterDedup: 0,
      requestBudgetUsed: `0/${MAX_INVESTMENT_QUERIES_PER_RUN}`,
    }
  }

  let baseNoveltyScore: number | null = null
  let noveltyScore: number | null = null
  let riskScore: number | null = null
  let differentiationScore: number | null = null
  let overallRecommendation = 'validar mais'

  try {
    baseNoveltyScore = calculateNoveltyScore(searchResult.candidates)
    noveltyScore = applyInvestmentNoveltyPenalty(baseNoveltyScore, investmentResult.signals)
    riskScore = calculateRiskScore(searchResult.candidates)
    differentiationScore = calculateDifferentiationScore(searchInput, searchResult.candidates)
    overallRecommendation = getRecommendationWithInvestmentSignals({
      noveltyScore,
      riskScore,
      differentiationScore,
      candidates: searchResult.candidates,
      investmentSignals: investmentResult.signals,
    })
  } catch (error) {
    const message = asErrorMessage(error)
    warnings.push(`Cálculo de scores falhou: ${message}`)
    logDev('score calculation failed', error)
  }

  const allQueries = [...searchResult.queries, ...investmentResult.queries]
  const allSourceStatuses = [...searchResult.sourceStatuses, investmentResult.status]
  const allConnectorErrors = [...searchResult.connectorErrors, ...investmentResult.connectorErrors]
  const investmentSignalSummary = summarizeInvestmentSignals(investmentResult.signals)

  let report: ReturnType<typeof generateBusinessValidationMarkdown>

  try {
    report = generateBusinessValidationMarkdown(
      searchInput,
      allQueries,
      searchResult.candidates,
      { noveltyScore, riskScore, differentiationScore },
      allConnectorErrors,
      allSourceStatuses,
      investmentResult.signals,
      investmentResult.innovationPenaltyApplied,
    )
  } catch (error) {
    const message = asErrorMessage(error)
    warnings.push(`Relatório markdown falhou: ${message}`)
    logDev('report generation failed', error)
    report = {
      markdownReport: `# Validação de Negócio MVP\n\nA validação foi concluída parcialmente, mas o relatório detalhado falhou: ${message}`,
      executiveSummary: 'Validação concluída parcialmente.',
      mainRisks: 'Revise os dados manualmente.',
      mainOpportunities: 'Execute uma nova validação após estabilizar as fontes externas.',
      recommendation: 'Recomendação final: validar mais.',
      overallRecommendation: 'validar mais',
    }
  }

  const queriesData = allQueries.length > 0
    ? await safeInsertMany('business_validation_queries', () => supabaseAdmin
      .from('business_validation_queries')
      .insert(allQueries.map((query) => ({ ...query, validation_run_id: run.id })))
      .select('*'), warnings)
    : []
  const candidatesData = searchResult.candidates.length > 0
    ? await safeInsertMany('business_validation_candidates', () => supabaseAdmin
      .from('business_validation_candidates')
      .insert(searchResult.candidates.map((candidate) => ({ ...candidate, validation_run_id: run.id })))
      .select('*'), warnings)
    : []
  const reportsData = await safeInsertMany('business_validation_reports', () => supabaseAdmin
    .from('business_validation_reports')
    .insert([
      {
        validation_run_id: run.id,
        markdown_report: report.markdownReport,
        executive_summary: report.executiveSummary,
        main_risks: report.mainRisks,
        main_opportunities: report.mainOpportunities,
        recommendation: report.recommendation,
      },
    ])
    .select('*'), warnings)
  const connectorStatusData = allSourceStatuses.length > 0
    ? await safeInsertMany('business_validation_connector_status', () => supabaseAdmin
      .from('business_validation_connector_status')
      .insert(allSourceStatuses.map((status) => ({ ...status, validation_run_id: run.id })))
      .select('*'), warnings)
    : []
  const investmentSignalsData = []

  for (const signal of investmentResult.signals) {
    const row = sanitizeInvestmentSignalForInsert(signal, run.id)
    const insertedRows = await safeInsertMany('business_validation_investment_signals', () => supabaseAdmin
      .from('business_validation_investment_signals')
      .insert([row])
      .select('*'), warnings)

    if (insertedRows.length > 0) {
      investmentSignalsData.push(...insertedRows)
    } else {
      logDev('investment signal row failed', row)
    }
  }

  if (investmentResult.signals.length > 0 && investmentSignalsData.length < investmentResult.signals.length) {
    warnings.push('Some investment signals could not be saved.')
  }

  const { data: completedRun, error: updateError } = await supabaseAdmin
    .from('business_validation_runs')
    .update({
      status: 'completed',
      novelty_score: noveltyScore,
      risk_score: riskScore,
      differentiation_score: differentiationScore,
      overall_recommendation: overallRecommendation,
      completed_at: new Date().toISOString(),
    })
    .eq('id', run.id)
    .select('*')
    .single<ValidationRunRecord>()

  if (updateError || !completedRun) {
    return NextResponse.json({ error: updateError?.message || 'Erro ao finalizar validação.' }, { status: 500 })
  }

  return NextResponse.json(
    {
      run: completedRun,
      queries: queriesData,
      candidates: candidatesData,
      reports: reportsData,
      sourcesUsed: searchResult.sourcesUsed,
      investmentSignals: investmentSignalsData,
      investmentSummary: {
        sourcesConsulted: investmentResult.sourcesConsulted,
        signalCount: investmentResult.signals.length,
        highestInvestmentSignalScore: Math.max(0, ...investmentResult.signals.map((signal) => signal.investment_signal_score)),
        innovationPenaltyApplied: investmentResult.innovationPenaltyApplied,
        strongestSource: investmentResult.signals[0]?.source_platform || null,
        webSearchProvider: investmentResult.configuredProvider,
        queriesExecuted: investmentResult.queriesExecuted,
        maxQueries: MAX_INVESTMENT_QUERIES_PER_RUN,
        resultsCollected: investmentResult.rawResultsBeforeDedup,
        requestBudgetUsed: investmentResult.requestBudgetUsed,
        ...investmentSignalSummary,
      },
      sourceStatuses: connectorStatusData.length > 0 ? connectorStatusData : allSourceStatuses,
      connectorErrors: allConnectorErrors,
      skippedQueries: searchResult.skippedQueries,
      warnings,
      diagnostics: process.env.NODE_ENV === 'development'
        ? {
          investmentQueriesGenerated: investmentResult.queriesGenerated,
          investmentQueriesExecuted: investmentResult.queriesExecuted,
          tavilyRequestsUsed: investmentResult.configuredProvider === 'tavily' ? investmentResult.queriesExecuted : 0,
          investmentResultsBeforeDedup: investmentResult.rawResultsBeforeDedup,
          investmentResultsAfterDedup: investmentResult.resultsAfterDedup,
          savedInvestmentSignals: investmentSignalsData.length,
          warnings,
        }
        : undefined,
      note: searchResult.usedFallback
        ? 'Nenhuma evidência externa real foi coletada nesta rodada. Foram geradas apenas hipóteses locais para investigação manual.'
        : 'Este MVP usa fontes públicas e uma heurística simples de similaridade. A análise deve ser revisada pela equipe antes de decisões estratégicas.',
    },
    { status: 201 },
  )
}
