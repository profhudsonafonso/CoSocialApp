import { NextResponse } from 'next/server'
import { calculateColabScore, getEffectiveColabScoreConfig } from '@/lib/colabscore'
import { supabaseAdmin } from '@/lib/supabase'

interface ProjectIssueRecord {
  id: string
  idea_id: string
}

interface ProjectSettingRecord {
  reference_hourly_value: number | string | null
  default_validated_hours: number | string | null
  default_delivery_factor: number | string | null
  default_impact_factor: number | string | null
  default_risk_factor: number | string | null
  min_points: number | string | null
  max_points: number | string | null
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
}

function parseOptionalPositiveNumber(value: unknown, field: string) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${field} deve ser um número positivo.`)
  }

  return parsedValue
}

function parseOptionalPositiveInteger(value: unknown, field: string) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsedValue = Math.round(Number(value))

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${field} deve ser um inteiro positivo.`)
  }

  return parsedValue
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const projectIssueId = typeof body.projectIssueId === 'string' ? body.projectIssueId : ''

    if (!projectIssueId) {
      return NextResponse.json({ error: 'projectIssueId é obrigatório.' }, { status: 400 })
    }

    const { data: issue, error: issueError } = await supabaseAdmin
      .from('project_issues')
      .select('id, idea_id')
      .eq('id', projectIssueId)
      .single<ProjectIssueRecord>()

    if (issueError || !issue) {
      return NextResponse.json({ error: 'Issue não encontrada.' }, { status: 404 })
    }

    const payload = {
      project_issue_id: projectIssueId,
      validated_hours: parseOptionalPositiveNumber(body.validatedHours, 'Horas validadas'),
      delivery_factor: parseOptionalPositiveNumber(body.deliveryFactor, 'Fator de entrega'),
      impact_factor: parseOptionalPositiveNumber(body.impactFactor, 'Fator de impacto'),
      risk_factor: parseOptionalPositiveNumber(body.riskFactor, 'Fator de risco'),
      manual_points: parseOptionalPositiveInteger(body.manualPoints, 'Pontos manuais'),
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      updated_at: new Date().toISOString(),
    }

    const { data: savedSetting, error: upsertError } = await supabaseAdmin
      .from('issue_colabscore_settings')
      .upsert(payload, { onConflict: 'project_issue_id' })
      .select('*')
      .single<IssueSettingRecord>()

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    const { data: projectSetting, error: projectSettingError } = await supabaseAdmin
      .from('project_colabscore_settings')
      .select('*')
      .eq('idea_id', issue.idea_id)
      .maybeSingle<ProjectSettingRecord>()

    if (projectSettingError) {
      return NextResponse.json({ error: projectSettingError.message }, { status: 500 })
    }

    const effectiveConfig = getEffectiveColabScoreConfig(projectSetting, savedSetting)

    return NextResponse.json(
      {
        data: savedSetting,
        calculated_points: calculateColabScore(effectiveConfig),
        effective_config: effectiveConfig,
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar configuração da issue.' },
      { status: 400 },
    )
  }
}
