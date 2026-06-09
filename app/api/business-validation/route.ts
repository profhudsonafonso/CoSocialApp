import { NextResponse } from 'next/server'
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

interface IdeaRecord {
  id: string
  nome_projeto: string | null
  github_repo_url: string | null
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
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

  const [queriesResult, candidatesResult, reportsResult, connectorStatusResult] = await Promise.all([
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
  ])

  const firstError = [queriesResult.error, candidatesResult.error, reportsResult.error, connectorStatusResult.error].find(Boolean)

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

  return (runs || []).map((run) => ({
    ...run,
    queries: queriesByRunId.get(run.id) || [],
    candidates: candidatesByRunId.get(run.id) || [],
    reports: reportsByRunId.get(run.id) || [],
    sourceStatuses: connectorStatusesByRunId.get(run.id) || [],
  }))
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

  const searchResult = await runBusinessValidationSearches(searchInput)
  const noveltyScore = calculateNoveltyScore(searchResult.candidates)
  const riskScore = calculateRiskScore(searchResult.candidates)
  const differentiationScore = calculateDifferentiationScore(searchInput, searchResult.candidates)
  const overallRecommendation = getOverallRecommendation(noveltyScore, riskScore, differentiationScore, searchResult.candidates)
  const report = generateBusinessValidationMarkdown(
    searchInput,
    searchResult.queries,
    searchResult.candidates,
    { noveltyScore, riskScore, differentiationScore },
    searchResult.connectorErrors,
    searchResult.sourceStatuses,
  )

  const [queriesResult, candidatesResult, reportsResult, connectorStatusResult] = await Promise.all([
    supabaseAdmin
      .from('business_validation_queries')
      .insert(searchResult.queries.map((query) => ({ ...query, validation_run_id: run.id })))
      .select('*'),
    supabaseAdmin
      .from('business_validation_candidates')
      .insert(searchResult.candidates.map((candidate) => ({ ...candidate, validation_run_id: run.id })))
      .select('*'),
    supabaseAdmin
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
      .select('*'),
    supabaseAdmin
      .from('business_validation_connector_status')
      .insert(searchResult.sourceStatuses.map((status) => ({ ...status, validation_run_id: run.id })))
      .select('*'),
  ])

  const firstError = [queriesResult.error, candidatesResult.error, reportsResult.error, connectorStatusResult.error].find(Boolean)

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 })
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
      queries: queriesResult.data || [],
      candidates: candidatesResult.data || [],
      reports: reportsResult.data || [],
      sourcesUsed: searchResult.sourcesUsed,
      sourceStatuses: connectorStatusResult.data || [],
      connectorErrors: searchResult.connectorErrors,
      skippedQueries: searchResult.skippedQueries,
      note: searchResult.usedFallback
        ? 'Nenhuma evidência externa real foi coletada nesta rodada. Foram geradas apenas hipóteses locais para investigação manual.'
        : 'Este MVP usa fontes públicas e uma heurística simples de similaridade. A análise deve ser revisada pela equipe antes de decisões estratégicas.',
    },
    { status: 201 },
  )
}
