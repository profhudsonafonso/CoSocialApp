import { NextResponse } from 'next/server'
import { fetchOpenGitHubIssues } from '@/lib/github'
import { supabaseAdmin } from '@/lib/supabase'

interface IdeaGitHubFields {
  id: string
  github_owner: string | null
  github_repo: string | null
}

export async function POST(request: Request) {
  const { ideaId } = await request.json()

  if (!ideaId) {
    return NextResponse.json(
      { error: 'ideaId é obrigatório.' },
      { status: 400 },
    )
  }

  const { data: idea, error: ideaError } = await supabaseAdmin
    .from('ideas')
    .select('id, github_owner, github_repo')
    .eq('id', ideaId)
    .single<IdeaGitHubFields>()

  if (ideaError) {
    return NextResponse.json({ error: ideaError.message }, { status: 404 })
  }

  if (!idea.github_owner || !idea.github_repo) {
    return NextResponse.json(
      { error: 'A ideia não possui repositório GitHub configurado.' },
      { status: 400 },
    )
  }

  try {
    const issues = await fetchOpenGitHubIssues(idea.github_owner, idea.github_repo)
    const syncedAt = new Date().toISOString()
    const issueRows = issues.map((issue) => ({
      idea_id: idea.id,
      github_issue_id: issue.id,
      issue_number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      labels: issue.labels,
      html_url: issue.html_url,
      synced_at: syncedAt,
    }))

    if (issueRows.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    const { data, error } = await supabaseAdmin
      .from('project_issues')
      .upsert(issueRows, { onConflict: 'idea_id,issue_number' })
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao sincronizar issues do GitHub.' },
      { status: 502 },
    )
  }
}
