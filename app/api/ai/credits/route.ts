import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface CreditAccountRecord {
  id: string
  user_email: string
  monthly_credits: number
  used_credits: number
  reset_at: string | null
  created_at: string | null
  updated_at: string | null
}

async function getOrCreateAccount(userEmail: string) {
  const { data: account, error } = await supabaseAdmin
    .from('ai_credit_accounts')
    .select('*')
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
    .select('*')
    .single<CreditAccountRecord>()

  if (insertError || !inserted) {
    throw new Error(insertError?.message || 'Erro ao criar conta de créditos.')
  }

  return inserted
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userEmail = (searchParams.get('userEmail') || '').trim().toLowerCase()

  if (!userEmail) {
    return NextResponse.json({ error: 'userEmail é obrigatório.' }, { status: 400 })
  }

  try {
    const account = await getOrCreateAccount(userEmail)
    const { data: recentUsage, error: usageError } = await supabaseAdmin
      .from('ai_usage_events')
      .select('id, feature_name, provider, model, credits_charged, status, error_message, created_at')
      .ilike('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(10)

    if (usageError) {
      return NextResponse.json({ error: usageError.message }, { status: 500 })
    }

    return NextResponse.json({
      account: {
        ...account,
        remaining_credits: Math.max(0, account.monthly_credits - account.used_credits),
      },
      recentUsage: recentUsage || [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar créditos.' },
      { status: 500 },
    )
  }
}
