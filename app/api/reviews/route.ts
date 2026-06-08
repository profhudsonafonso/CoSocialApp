import { NextResponse } from 'next/server'
import { mergeGitHubPullRequest, parseGitHubPullRequestNumber } from '@/lib/github'
import { supabaseAdmin } from '@/lib/supabase'

interface IdeaRecord {
  id: string
  nome_projeto: string
  github_owner: string | null
  github_repo: string | null
}

interface ProjectIssueRecord {
  id: string
  idea_id: string
  issue_number: number
  title: string
  points_estimate: number | null
  status: string | null
}

interface AssignmentRecord {
  id: string
  project_issue_id: string
  collaborator_id: string
  claim_key: string
  status: string | null
  evidence_url: string | null
  accepted_points: number | null
  review_comment: string | null
  pull_request_number: number | null
  pull_request_url: string | null
  merged_at: string | null
}

interface CollaboratorRecord {
  id: string
  nome: string
  email: string
}

interface ReviewAssignmentRecord {
  id: string
  project_issue_id: string
  collaborator_id: string
}

interface ReviewIssueRecord {
  id: string
  idea_id: string
  status: string | null
  points_estimate: number | null
}

interface ReviewIdeaRecord {
  id: string
  github_owner: string | null
  github_repo: string | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ownerEmail = searchParams.get('ownerEmail')?.trim()

  if (!ownerEmail) {
    return NextResponse.json(
      { error: 'ownerEmail é obrigatório.' },
      { status: 400 },
    )
  }

  const { data: ideas, error: ideasError } = await supabaseAdmin
    .from('ideas')
    .select('id, nome_projeto, github_owner, github_repo')
    .eq('email', ownerEmail)
    .returns<IdeaRecord[]>()

  if (ideasError) {
    return NextResponse.json({ error: ideasError.message }, { status: 500 })
  }

  if (!ideas || ideas.length === 0) {
    return NextResponse.json({ data: [] }, { status: 200 })
  }

  const ideaIds = ideas.map((idea) => idea.id)
  const { data: issues, error: issuesError } = await supabaseAdmin
    .from('project_issues')
    .select('id, idea_id, issue_number, title, points_estimate, status')
    .in('idea_id', ideaIds)
    .returns<ProjectIssueRecord[]>()

  if (issuesError) {
    return NextResponse.json({ error: issuesError.message }, { status: 500 })
  }

  if (!issues || issues.length === 0) {
    return NextResponse.json({ data: [] }, { status: 200 })
  }

  const issueIds = issues.map((issue) => issue.id)
  const { data: assignments, error: assignmentsError } = await supabaseAdmin
    .from('issue_assignments')
    .select('id, project_issue_id, collaborator_id, claim_key, status, evidence_url, accepted_points, review_comment, pull_request_number, pull_request_url, merged_at')
    .in('project_issue_id', issueIds)
    .eq('status', 'submitted')
    .returns<AssignmentRecord[]>()

  if (assignmentsError) {
    return NextResponse.json({ error: assignmentsError.message }, { status: 500 })
  }

  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ data: [] }, { status: 200 })
  }

  const collaboratorIds = assignments.map((assignment) => assignment.collaborator_id)
  const { data: collaborators, error: collaboratorsError } = await supabaseAdmin
    .from('collaborators')
    .select('id, nome, email')
    .in('id', collaboratorIds)
    .returns<CollaboratorRecord[]>()

  if (collaboratorsError) {
    return NextResponse.json({ error: collaboratorsError.message }, { status: 500 })
  }

  const ideasById = new Map(ideas.map((idea) => [idea.id, idea]))
  const issuesById = new Map(issues.map((issue) => [issue.id, issue]))
  const collaboratorsById = new Map((collaborators || []).map((collaborator) => [collaborator.id, collaborator]))

  const reviews = assignments.map((assignment) => {
    const issue = issuesById.get(assignment.project_issue_id)
    const idea = issue ? ideasById.get(issue.idea_id) : undefined
    const collaborator = collaboratorsById.get(assignment.collaborator_id)

    return {
      assignment_id: assignment.id,
      project_issue_id: assignment.project_issue_id,
      project_name: idea?.nome_projeto || '',
      idea_id: idea?.id || null,
      issue_title: issue?.title || '',
      issue_number: issue?.issue_number || null,
      points_estimate: issue?.points_estimate || 10,
      collaborator_name: collaborator?.nome || '',
      collaborator_email: collaborator?.email || '',
      claim_key: assignment.claim_key,
      evidence_url: assignment.evidence_url,
      status: assignment.status,
      review_comment: assignment.review_comment,
      accepted_points: assignment.accepted_points,
      pull_request_number: assignment.pull_request_number,
      pull_request_url: assignment.pull_request_url,
      merged_at: assignment.merged_at,
    }
  })

  return NextResponse.json({ data: reviews }, { status: 200 })
}

export async function POST(request: Request) {
  const {
    assignmentId,
    decision,
    points,
    reviewComment,
    mergePr,
    pullRequestNumber,
    pullRequestUrl,
  } = await request.json()

  if (!assignmentId || !['accepted', 'rejected'].includes(decision)) {
    return NextResponse.json(
      { error: 'assignmentId e decision accepted/rejected são obrigatórios.' },
      { status: 400 },
    )
  }

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from('issue_assignments')
    .select('id, project_issue_id, collaborator_id')
    .eq('id', assignmentId)
    .single<ReviewAssignmentRecord>()

  if (assignmentError || !assignment) {
    return NextResponse.json(
      { error: 'Assignment não encontrado.' },
      { status: 404 },
    )
  }

  const { data: issue, error: issueError } = await supabaseAdmin
    .from('project_issues')
    .select('id, idea_id, status, points_estimate')
    .eq('id', assignment.project_issue_id)
    .single<ReviewIssueRecord>()

  if (issueError || !issue) {
    return NextResponse.json(
      { error: 'Issue não encontrada.' },
      { status: 404 },
    )
  }

  const normalizedComment = typeof reviewComment === 'string' ? reviewComment.trim() : null
  const normalizedPullRequestUrl = typeof pullRequestUrl === 'string' ? pullRequestUrl.trim() : ''
  const parsedPullRequestNumber = Number.isFinite(Number(pullRequestNumber))
    ? Number(pullRequestNumber)
    : normalizedPullRequestUrl
      ? parseGitHubPullRequestNumber(normalizedPullRequestUrl)
      : null
  const safePullRequestNumber = parsedPullRequestNumber && parsedPullRequestNumber > 0
    ? parsedPullRequestNumber
    : null

  if (decision === 'rejected') {
    const { error: assignmentUpdateError } = await supabaseAdmin
      .from('issue_assignments')
      .update({
        status: 'rejected',
        review_comment: normalizedComment,
        pull_request_number: safePullRequestNumber,
        pull_request_url: normalizedPullRequestUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment.id)

    if (assignmentUpdateError) {
      return NextResponse.json({ error: assignmentUpdateError.message }, { status: 500 })
    }

    const { error: issueUpdateError } = await supabaseAdmin
      .from('project_issues')
      .update({ status: 'rejected' })
      .eq('id', issue.id)

    if (issueUpdateError) {
      return NextResponse.json({ error: issueUpdateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: { status: 'rejected' } }, { status: 200 })
  }

  const acceptedPoints = Number.isFinite(Number(points))
    ? Number(points)
    : issue.points_estimate || 10

  if (acceptedPoints <= 0) {
    return NextResponse.json(
      { error: 'points deve ser maior que zero.' },
      { status: 400 },
    )
  }

  let mergeWarning: string | null = null
  let mergedAt: string | null = null

  if (mergePr && !safePullRequestNumber) {
    return NextResponse.json(
      { error: 'pull_request_number é obrigatório para fazer merge do Pull Request.' },
      { status: 400 },
    )
  }

  let pullRequestUrlToSave = normalizedPullRequestUrl || null

  if (mergePr && safePullRequestNumber) {
    const { data: idea, error: ideaError } = await supabaseAdmin
      .from('ideas')
      .select('id, github_owner, github_repo')
      .eq('id', issue.idea_id)
      .single<ReviewIdeaRecord>()

    if (ideaError || !idea?.github_owner || !idea.github_repo) {
      mergeWarning = 'Contribuição aceita, mas o Pull Request não foi mergeado porque o repositório GitHub da ideia não está configurado.'
    } else {
      pullRequestUrlToSave = pullRequestUrlToSave || `https://github.com/${idea.github_owner}/${idea.github_repo}/pull/${safePullRequestNumber}`

      try {
        await mergeGitHubPullRequest(idea.github_owner, idea.github_repo, safePullRequestNumber)
        mergedAt = new Date().toISOString()
      } catch (error) {
        mergeWarning = error instanceof Error
          ? `Contribuição aceita, mas o Pull Request não foi mergeado: ${error.message}`
          : 'Contribuição aceita, mas o Pull Request não foi mergeado.'
      }
    }
  }

  const { error: assignmentUpdateError } = await supabaseAdmin
    .from('issue_assignments')
    .update({
      status: 'accepted',
      accepted_points: acceptedPoints,
      review_comment: normalizedComment,
      pull_request_number: safePullRequestNumber,
      pull_request_url: pullRequestUrlToSave,
      merged_at: mergedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignment.id)

  if (assignmentUpdateError) {
    return NextResponse.json({ error: assignmentUpdateError.message }, { status: 500 })
  }

  const { error: issueUpdateError } = await supabaseAdmin
    .from('project_issues')
    .update({ status: 'accepted' })
    .eq('id', issue.id)

  if (issueUpdateError) {
    return NextResponse.json({ error: issueUpdateError.message }, { status: 500 })
  }

  const { error: pointsInsertError } = await supabaseAdmin
    .from('colab_points')
    .insert([
      {
        collaborator_id: assignment.collaborator_id,
        idea_id: issue.idea_id,
        assignment_id: assignment.id,
        points: acceptedPoints,
        reason: normalizedComment || 'Contribuição aceita pelo responsável do projeto.',
      },
    ])

  if (pointsInsertError) {
    return NextResponse.json({ error: pointsInsertError.message }, { status: 500 })
  }

  return NextResponse.json(
    {
      data: {
        status: 'accepted',
        accepted_points: acceptedPoints,
        merged_at: mergedAt,
      },
      warning: mergeWarning,
    },
    { status: 200 },
  )
}
