import { NextResponse } from 'next/server'
import { runColabAiCompletion } from '@/lib/ai/aiGateway'
import { buildColabAiContext } from '@/lib/ai/colabAiContext'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_ACTIONS = new Set([
  'issue_explain',
  'technical_plan',
  'implementation_checklist',
  'generate_prompt_pack',
  'review_submission',
  'validate_delivery',
])

interface CreditAccountRecord {
  id: string
  user_email: string
  monthly_credits: number
  used_credits: number
}

interface PromptRecord {
  feature_name: string
  title: string
  system_prompt: string
  user_prompt_template: string
  credit_cost: number
  enabled: boolean | null
}

interface FeatureFlagRecord {
  enabled: boolean | null
}

function renderPrompt(template: string, contextText: string) {
  return template.replaceAll('{{context}}', contextText)
}

async function getOrCreateAccount(userEmail: string) {
  const { data: account, error } = await supabaseAdmin
    .from('ai_credit_accounts')
    .select('id, user_email, monthly_credits, used_credits')
    .ilike('user_email', userEmail)
    .maybeSingle<CreditAccountRecord>()

  if (error) {
    throw new Error(error.message)
  }

  if (account) {
    return account
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('ai_credit_accounts')
    .insert({ user_email: userEmail })
    .select('id, user_email, monthly_credits, used_credits')
    .single<CreditAccountRecord>()

  if (insertError || !inserted) {
    throw new Error(insertError?.message || 'Erro ao criar conta de créditos.')
  }

  return inserted
}

async function insertUsageEvent({
  userEmail,
  ideaId,
  projectIssueId,
  assignmentId,
  featureName,
  provider,
  model,
  inputTokens,
  outputTokens,
  estimatedCostUsd,
  creditsCharged,
  status,
  errorMessage,
}: {
  userEmail: string
  ideaId: string
  projectIssueId: string
  assignmentId?: string | null
  featureName: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  creditsCharged: number
  status: string
  errorMessage?: string | null
}) {
  const { data, error } = await supabaseAdmin
    .from('ai_usage_events')
    .insert({
      user_email: userEmail,
      idea_id: ideaId,
      project_issue_id: projectIssueId,
      assignment_id: assignmentId || null,
      feature_name: featureName,
      provider,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: estimatedCostUsd,
      credits_charged: creditsCharged,
      status,
      error_message: errorMessage || null,
    })
    .select('id')
    .single<{ id: string }>()

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao registrar uso da IA.')
  }

  return data.id
}

export async function POST(request: Request) {
  const body = await request.json()
  const userEmail = typeof body.userEmail === 'string' ? body.userEmail.trim().toLowerCase() : ''
  const ideaId = typeof body.ideaId === 'string' ? body.ideaId : ''
  const projectIssueId = typeof body.projectIssueId === 'string' ? body.projectIssueId : ''
  const assignmentId = typeof body.assignmentId === 'string' && body.assignmentId ? body.assignmentId : null
  const action = typeof body.action === 'string' ? body.action : ''

  if (!userEmail || !ideaId || !projectIssueId || !ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { error: 'userEmail, ideaId, projectIssueId e action válido são obrigatórios.' },
      { status: 400 },
    )
  }

  const { data: prompt, error: promptError } = await supabaseAdmin
    .from('ai_prompts')
    .select('feature_name, title, system_prompt, user_prompt_template, credit_cost, enabled')
    .eq('feature_name', action)
    .maybeSingle<PromptRecord>()

  if (promptError) {
    return NextResponse.json({ error: promptError.message }, { status: 500 })
  }

  if (!prompt || prompt.enabled === false) {
    return NextResponse.json({ error: 'Ação de IA desabilitada.' }, { status: 403 })
  }

  const { data: flag, error: flagError } = await supabaseAdmin
    .from('ai_feature_flags')
    .select('enabled')
    .eq('feature_name', action)
    .maybeSingle<FeatureFlagRecord>()

  if (flagError) {
    return NextResponse.json({ error: flagError.message }, { status: 500 })
  }

  if (flag?.enabled === false) {
    return NextResponse.json({ error: 'Este recurso de IA está desabilitado.' }, { status: 403 })
  }

  try {
    const creditCost = prompt.credit_cost || 1
    const account = await getOrCreateAccount(userEmail)
    const remainingCredits = account.monthly_credits - account.used_credits

    if (remainingCredits < creditCost) {
      return NextResponse.json(
        { error: `Créditos insuficientes. Esta ação custa ${creditCost} crédito(s).` },
        { status: 402 },
      )
    }

    const context = await buildColabAiContext({ ideaId, projectIssueId, assignmentId })
    const userPrompt = renderPrompt(prompt.user_prompt_template, context.contextText)
    const aiResponse = await runColabAiCompletion({
      featureName: action,
      systemPrompt: prompt.system_prompt,
      userPrompt,
    })

    const usageEventId = await insertUsageEvent({
      userEmail,
      ideaId,
      projectIssueId,
      assignmentId,
      featureName: action,
      provider: aiResponse.provider,
      model: aiResponse.model,
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
      estimatedCostUsd: aiResponse.estimatedCostUsd,
      creditsCharged: creditCost,
      status: 'completed',
    })

    const nextUsedCredits = account.used_credits + creditCost
    const { error: updateError } = await supabaseAdmin
      .from('ai_credit_accounts')
      .update({ used_credits: nextUsedCredits, updated_at: new Date().toISOString() })
      .eq('id', account.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      markdown: aiResponse.markdown,
      provider: aiResponse.provider,
      model: aiResponse.model,
      creditsCharged: creditCost,
      remainingCredits: Math.max(0, account.monthly_credits - nextUsedCredits),
      usageEventId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao executar ColabAI.'

    try {
      await insertUsageEvent({
        userEmail,
        ideaId,
        projectIssueId,
        assignmentId,
        featureName: action,
        provider: 'mock',
        model: 'mock-local',
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
        creditsCharged: 0,
        status: 'error',
        errorMessage: message,
      })
    } catch {
      // Best effort: the API response should still explain the original failure.
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
