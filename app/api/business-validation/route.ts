import { NextResponse } from 'next/server'
import { generateBusinessValidation } from '@/lib/business-validation'
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

  const [queriesResult, candidatesResult, reportsResult] = await Promise.all([
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
  ])

  const firstError = [queriesResult.error, candidatesResult.error, reportsResult.error].find(Boolean)

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

  return (runs || []).map((run) => ({
    ...run,
    queries: queriesByRunId.get(run.id) || [],
    candidates: candidatesByRunId.get(run.id) || [],
    reports: reportsByRunId.get(run.id) || [],
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

  const generated = generateBusinessValidation(input)

  const { data: run, error: runError } = await supabaseAdmin
    .from('business_validation_runs')
    .insert([
      {
        idea_id: ideaId,
        status: 'completed',
        idea_name: input.ideaName,
        short_description: input.shortDescription,
        problem: input.problem,
        target_audience: input.targetAudience,
        proposed_solution: input.proposedSolution,
        declared_differentiators: input.declaredDifferentiators,
        business_model: input.businessModel,
        market_region: input.marketRegion,
        known_competitors: input.knownCompetitors,
        novelty_score: generated.noveltyScore,
        risk_score: generated.riskScore,
        differentiation_score: generated.differentiationScore,
        overall_recommendation: generated.overallRecommendation,
        completed_at: new Date().toISOString(),
      },
    ])
    .select('*')
    .single<ValidationRunRecord>()

  if (runError || !run) {
    return NextResponse.json({ error: runError?.message || 'Erro ao salvar validação.' }, { status: 500 })
  }

  const [queriesResult, candidatesResult, reportsResult] = await Promise.all([
    supabaseAdmin
      .from('business_validation_queries')
      .insert(generated.queries.map((query) => ({ ...query, validation_run_id: run.id })))
      .select('*'),
    supabaseAdmin
      .from('business_validation_candidates')
      .insert(generated.candidates.map((candidate) => ({ ...candidate, validation_run_id: run.id })))
      .select('*'),
    supabaseAdmin
      .from('business_validation_reports')
      .insert([
        {
          validation_run_id: run.id,
          markdown_report: generated.markdownReport,
          executive_summary: generated.executiveSummary,
          main_risks: generated.mainRisks,
          main_opportunities: generated.mainOpportunities,
          recommendation: generated.recommendation,
        },
      ])
      .select('*'),
  ])

  const firstError = [queriesResult.error, candidatesResult.error, reportsResult.error].find(Boolean)

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 })
  }

  return NextResponse.json(
    {
      run,
      queries: queriesResult.data || [],
      candidates: candidatesResult.data || [],
      reports: reportsResult.data || [],
      note: 'Este MVP gerou uma análise inicial e queries sugeridas. A busca web automática será adicionada em uma próxima etapa.',
    },
    { status: 201 },
  )
}
