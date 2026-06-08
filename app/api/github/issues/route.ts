import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ideaId = searchParams.get('ideaId')

  if (!ideaId) {
    return NextResponse.json(
      { error: 'ideaId é obrigatório.' },
      { status: 400 },
    )
  }

  const { data, error } = await supabaseAdmin
    .from('project_issues')
    .select('*')
    .eq('idea_id', ideaId)
    .order('status', { ascending: true })
    .order('issue_number', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200 })
}
