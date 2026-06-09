import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface ProjectIssueRecord {
  id: string
  status: string | null
}

interface AssignmentRecord {
  project_issue_id: string
  status: string | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ideaId = searchParams.get('ideaId')

  if (!ideaId) {
    return NextResponse.json(
      { error: 'ideaId é obrigatório.' },
      { status: 400 },
    )
  }

  const { data: issues, error } = await supabaseAdmin
    .from('project_issues')
    .select('*')
    .eq('idea_id', ideaId)
    .neq('status', 'finalized')
    .order('status', { ascending: true })
    .order('issue_number', { ascending: true })
    .returns<ProjectIssueRecord[]>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!issues || issues.length === 0) {
    return NextResponse.json({ data: [] }, { status: 200 })
  }

  const { data: assignments, error: assignmentsError } = await supabaseAdmin
    .from('issue_assignments')
    .select('project_issue_id, status')
    .in('project_issue_id', issues.map((issue) => issue.id))
    .returns<AssignmentRecord[]>()

  if (assignmentsError) {
    return NextResponse.json({ error: assignmentsError.message }, { status: 500 })
  }

  const assignmentsByIssueId = new Map<string, AssignmentRecord[]>()

  for (const assignment of assignments || []) {
    const issueAssignments = assignmentsByIssueId.get(assignment.project_issue_id) || []
    issueAssignments.push(assignment)
    assignmentsByIssueId.set(assignment.project_issue_id, issueAssignments)
  }

  const data = issues.map((issue) => {
    const issueAssignments = assignmentsByIssueId.get(issue.id) || []

    return {
      ...issue,
      activeWorkers: issueAssignments.filter((assignment) => ['claimed', 'submitted'].includes(assignment.status || '')).length,
      submittedCount: issueAssignments.filter((assignment) => assignment.status === 'submitted').length,
      acceptedCount: issueAssignments.filter((assignment) => assignment.status === 'accepted').length,
      rejectedCount: issueAssignments.filter((assignment) => assignment.status === 'rejected').length,
      isFinalized: issue.status === 'finalized',
    }
  })

  return NextResponse.json({ data }, { status: 200 })
}
