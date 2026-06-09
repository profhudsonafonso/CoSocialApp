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

interface AssignmentRecord {
  id: string
  claim_key: string
  branch_name: string
  status: string | null
}

function generateClaimKey() {
  return `CS-${randomBytes(4).toString('hex').toUpperCase()}`
}

async function getActiveWorkers(projectIssueId: string) {
  const { data } = await supabaseAdmin
    .from('issue_assignments')
    .select('id')
    .eq('project_issue_id', projectIssueId)
    .in('status', ['claimed', 'submitted'])

  return data?.length || 0
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

  if (issue.status === 'finalized') {
    return NextResponse.json(
      { error: 'Esta issue foi finalizada e não aceita novas contribuições.' },
      { status: 409 },
    )
  }

  const { data: existingAssignment } = await supabaseAdmin
    .from('issue_assignments')
    .select('id, claim_key, branch_name, status')
    .eq('project_issue_id', issue.id)
    .eq('collaborator_id', collaborator.id)
    .maybeSingle<AssignmentRecord>()

  if (existingAssignment) {
    const activeWorkers = await getActiveWorkers(issue.id)

    return NextResponse.json(
      {
        data: {
          assignment_id: existingAssignment.id,
          claim_key: existingAssignment.claim_key,
          branch_name: existingAssignment.branch_name,
          assignment_status: existingAssignment.status,
          issue_number: issue.issue_number,
          issue_title: issue.title,
          html_url: issue.html_url,
          activeWorkers,
        },
      },
      { status: 200 },
    )
  }

  const claimKey = generateClaimKey()
  const branchName = `cosocial/${claimKey}`

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from('issue_assignments')
    .insert([
      {
        project_issue_id: issue.id,
        collaborator_id: collaborator.id,
        claim_key: claimKey,
        branch_name: branchName,
      },
    ])
    .select('id, claim_key, branch_name, status')
    .single<AssignmentRecord>()

  if (assignmentError || !assignment) {
    return NextResponse.json({ error: assignmentError?.message || 'Erro ao criar assignment.' }, { status: 500 })
  }

  const activeWorkers = await getActiveWorkers(issue.id)

  return NextResponse.json(
    {
      data: {
        assignment_id: assignment.id,
        claim_key: assignment.claim_key,
        branch_name: assignment.branch_name,
        assignment_status: assignment.status,
        issue_number: issue.issue_number,
        issue_title: issue.title,
        html_url: issue.html_url,
        activeWorkers,
      },
    },
    { status: 201 },
  )
}
