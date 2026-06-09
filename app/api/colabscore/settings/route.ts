import { NextResponse } from 'next/server'
import { calculateColabScore, getEffectiveColabScoreConfig } from '@/lib/colabscore'
import { supabaseAdmin } from '@/lib/supabase'

interface ProjectSettingRecord {
  id: string
  idea_id: string
  reference_hourly_value: number | string | null
  default_validated_hours: number | string | null
  default_delivery_factor: number | string | null
  default_impact_factor: number | string | null
  default_risk_factor: number | string | null
  min_points: number | string | null
  max_points: number | string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

interface IssueRecord {
  id: string
  issue_number: number
  title: string
  html_url: string | null
  points_estimate: number | null
}

interface IssueSettingRecord {
  id: string
  project_issue_id: string
  validated_hours: number | string | null
  delivery_factor: number | string | null
  impact_factor: number | string | null
  risk_factor: number | string | null
  manual_points: number | string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

function parsePositiveNumber(value: unknown, field: string) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${field} deve ser um número positivo.`)
  }

  return parsedValue
}

function parsePositiveInteger(value: unknown, field: string) {
  const parsedValue = Math.round(Number(value))

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${field} deve ser um inteiro positivo.`)
  }

  return parsedValue
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ideaId = searchParams.get('ideaId')

  if (!ideaId) {
    return NextResponse.json({ error: 'ideaId é obrigatório.' }, { status: 400 })
  }

  const [projectSettingResult, issuesResult] = await Promise.all([
    supabaseAdmin
      .from('project_colabscore_settings')
      .select('*')
      .eq('idea_id', ideaId)
      .maybeSingle<ProjectSettingRecord>(),
    supabaseAdmin
      .from('project_issues')
      .select('id, issue_number, title, html_url, points_estimate')
      .eq('idea_id', ideaId)
      .order('issue_number', { ascending: true })
      .returns<IssueRecord[]>(),
  ])

  if (projectSettingResult.error) {
    return NextResponse.json({ error: projectSettingResult.error.message }, { status: 500 })
  }

  if (issuesResult.error) {
    return NextResponse.json({ error: issuesResult.error.message }, { status: 500 })
  }

  const issues = issuesResult.data || []
  const issueIds = issues.map((issue) => issue.id)
  const issueSettingsResult = issueIds.length > 0
    ? await supabaseAdmin
      .from('issue_colabscore_settings')
      .select('*')
      .in('project_issue_id', issueIds)
      .returns<IssueSettingRecord[]>()
    : { data: [], error: null }

  if (issueSettingsResult.error) {
    return NextResponse.json({ error: issueSettingsResult.error.message }, { status: 500 })
  }

  const issueSettingsByIssueId = new Map(
    (issueSettingsResult.data || []).map((setting) => [setting.project_issue_id, setting]),
  )

  const issuePreviews = issues.map((issue) => {
    const issueSetting = issueSettingsByIssueId.get(issue.id) || null
    const effectiveConfig = getEffectiveColabScoreConfig(projectSettingResult.data, issueSetting)

    return {
      ...issue,
      colabscore_setting: issueSetting,
      effective_config: effectiveConfig,
      calculated_points: calculateColabScore(effectiveConfig),
    }
  })

  return NextResponse.json(
    {
      projectSetting: projectSettingResult.data,
      issues: issuePreviews,
    },
    { status: 200 },
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const ideaId = typeof body.ideaId === 'string' ? body.ideaId : ''

    if (!ideaId) {
      return NextResponse.json({ error: 'ideaId é obrigatório.' }, { status: 400 })
    }

    const minPoints = parsePositiveInteger(body.minPoints, 'Pontuação mínima')
    const maxPoints = parsePositiveInteger(body.maxPoints, 'Pontuação máxima')

    if (minPoints > maxPoints) {
      return NextResponse.json(
        { error: 'Pontuação mínima não pode ser maior que a pontuação máxima.' },
        { status: 400 },
      )
    }

    const payload = {
      idea_id: ideaId,
      reference_hourly_value: parsePositiveNumber(body.referenceHourlyValue, 'Valor-hora de referência'),
      default_validated_hours: parsePositiveNumber(body.defaultValidatedHours, 'Horas validadas padrão'),
      default_delivery_factor: parsePositiveNumber(body.defaultDeliveryFactor, 'Fator de entrega padrão'),
      default_impact_factor: parsePositiveNumber(body.defaultImpactFactor, 'Fator de impacto padrão'),
      default_risk_factor: parsePositiveNumber(body.defaultRiskFactor, 'Fator de risco padrão'),
      min_points: minPoints,
      max_points: maxPoints,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('project_colabscore_settings')
      .upsert(payload, { onConflict: 'idea_id' })
      .select('*')
      .single<ProjectSettingRecord>()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar ColabScore.' },
      { status: 400 },
    )
  }
}
