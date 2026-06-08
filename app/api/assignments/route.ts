import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface CollaboratorRecord {
  id: string
}

interface ProjectIssueRecord {
  id: string
  issue_number: number
  title: string
  html_url: string | null
  status: string | null
}

function generateClaimKey() {
  return `CS-${randomBytes(4).toString('hex').toUpperCase()}`
}

export async function POST(request: Request) {
  const { collaboratorEmail, projectIssueId } = await request.json()
  const normalizedEmail = typeof collaboratorEmail === 'string' ? collaboratorEmail.trim() : ''

  if (!normalizedEmail || !projectIssueId) {
    return NextResponse.json(
      { error: 'collaboratorEmail e projectIssueId são obrigatórios.' },
      { status: 400 },
    )
  }

  const { data: collaborator, error: collaboratorError } = await supabaseAdmin
    .from('collaborators')
    .select('id')
    .ilike('email', normalizedEmail)
    .single<CollaboratorRecord>()

  if (collaboratorError || !collaborator) {
    return NextResponse.json(
      { error: 'Colaborador não encontrado para este e-mail.' },
      { status: 404 },
    )
  }

  const { data: issue, error: issueError } = await supabaseAdmin
    .from('project_issues')
    .select('id, issue_number, title, html_url, status')
    .eq('id', projectIssueId)
    .single<ProjectIssueRecord>()

  if (issueError || !issue) {
    return NextResponse.json(
      { error: 'Issue não encontrada.' },
      { status: 404 },
    )
  }

  if (issue.status !== 'open') {
    return NextResponse.json(
      { error: 'Esta issue não está aberta para ser pega.' },
      { status: 409 },
    )
  }

  const claimKey = generateClaimKey()
  const branchName = `cosocial/${claimKey}`

  const { error: assignmentError } = await supabaseAdmin
    .from('issue_assignments')
    .insert([
      {
        project_issue_id: issue.id,
        collaborator_id: collaborator.id,
        claim_key: claimKey,
        branch_name: branchName,
      },
    ])

  if (assignmentError) {
    return NextResponse.json({ error: assignmentError.message }, { status: 500 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('project_issues')
    .update({ status: 'claimed' })
    .eq('id', issue.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(
    {
      data: {
        claim_key: claimKey,
        branch_name: branchName,
        issue_number: issue.issue_number,
        issue_title: issue.title,
        html_url: issue.html_url,
      },
    },
    { status: 201 },
  )
}
