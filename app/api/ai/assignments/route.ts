import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface AssignmentRecord {
  id: string
  status: string | null
  branch_name: string
  evidence_url: string | null
  pull_request_number: number | null
  pull_request_url: string | null
  collaborators?: {
    nome?: string | null
    email?: string | null
  } | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectIssueId = searchParams.get('projectIssueId')

  if (!projectIssueId) {
    return NextResponse.json({ error: 'projectIssueId é obrigatório.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('issue_assignments')
    .select('id, status, branch_name, evidence_url, pull_request_number, pull_request_url, collaborators(nome, email)')
    .eq('project_issue_id', projectIssueId)
    .order('created_at', { ascending: false })
    .returns<AssignmentRecord[]>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const assignments = (data || []).map((assignment) => ({
    id: assignment.id,
    status: assignment.status,
    branch_name: assignment.branch_name,
    evidence_url: assignment.evidence_url,
    pull_request_number: assignment.pull_request_number,
    pull_request_url: assignment.pull_request_url,
    collaborator_name: assignment.collaborators?.nome || '',
    collaborator_email: assignment.collaborators?.email || '',
  }))

  return NextResponse.json({ data: assignments })
}
