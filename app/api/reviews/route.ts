import { NextResponse } from 'next/server'
import { calculateColabScore, getEffectiveColabScoreConfig } from '@/lib/colabscore'
import { mergeGitHubPullRequest, parseGitHubPullRequestNumber } from '@/lib/github'
import { supabaseAdmin } from '@/lib/supabase'

type ReviewStatusFilter = 'submitted' | 'accepted' | 'rejected' | 'all'

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
  html_url: string | null
  points_estimate: number | null
  status: string | null
  finalized_at: string | null
}

interface AssignmentRecord {
  id: string
  project_issue_id: string
  collaborator_id: string
  claim_key: string
  branch_name: string
  status: string | null
  evidence_url: string | null
  accepted_points: number | null
  review_comment: string | null
  pull_request_number: number | null
  pull_request_url: string | null
  merged_at: string | null
  created_at: string | null
  updated_at: string | null
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
  status: string | null
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

interface ProjectColabScoreSettingRecord {
  idea_id: string
  reference_hourly_value: number | string | null
  default_validated_hours: number | string | null
  default_delivery_factor: number | string | null
  default_impact_factor: number | string | null
  default_risk_factor: number | string | null
  min_points: number | string | null
  max_points: number | string | null
}

interface IssueColabScoreSettingRecord {
  project_issue_id: string
  validated_hours: number | string | null
  delivery_factor: number | string | null
  impact_factor: number | string | null
  risk_factor: number | string | null
  manual_points: number | string | null
}

function normalizeStatusFilter(value: string | null): ReviewStatusFilter {
  if (value === 'accepted' || value === 'rejected' || value === 'all') {
    return value
  }

  return 'submitted'
}

async function getIssueAssignmentCounts(issueIds: string[]) {
  if (issueIds.length === 0) {
    return new Map<string, AssignmentRecord[]>()
  }

  const { data } = await supabaseAdmin
    .from('issue_assignments')
    .select('id, project_issue_id, collaborator_id, claim_key, branch_name, status, evidence_url, accepted_points, review_comment, pull_request_number, pull_request_url, merged_at, created_at, updated_at')
    .in('project_issue_id', issueIds)
    .returns<AssignmentRecord[]>()

  const assignmentsByIssueId = new Map<string, AssignmentRecord[]>()

  for (const assignment of data || []) {
    const issueAssignments = assignmentsByIssueId.get(assignment.project_issue_id) || []
    issueAssignments.push(assignment)
    assignmentsByIssueId.set(assignment.project_issue_id, issueAssignments)
  }

  return assignmentsByIssueId
}

async function getColabScoreContext(ideaIds: string[], issueIds: string[]) {
  const [projectSettingsResult, issueSettingsResult] = await Promise.all([
    ideaIds.length > 0
      ? supabaseAdmin
        .from('project_colabscore_settings')
        .select('idea_id, reference_hourly_value, default_validated_hours, default_delivery_factor, default_impact_factor, default_risk_factor, min_points, max_points')
        .in('idea_id', ideaIds)
        .returns<ProjectColabScoreSettingRecord[]>()
      : { data: [], error: null },
    issueIds.length > 0
      ? supabaseAdmin
        .from('issue_colabscore_settings')
        .select('project_issue_id, validated_hours, delivery_factor, impact_factor, risk_factor, manual_points')
        .in('project_issue_id', issueIds)
        .returns<IssueColabScoreSettingRecord[]>()
      : { data: [], error: null },
  ])

  if (projectSettingsResult.error) {
    throw new Error(projectSettingsResult.error.message)
  }

  if (issueSettingsResult.error) {
    throw new Error(issueSettingsResult.error.message)
  }

  return {
    projectSettingsByIdeaId: new Map((projectSettingsResult.data || []).map((setting) => [setting.idea_id, setting])),
    issueSettingsByIssueId: new Map((issueSettingsResult.data || []).map((setting) => [setting.project_issue_id, setting])),
  }
}

function getSuggestedPoints(
  issue: Pick<ProjectIssueRecord, 'id' | 'idea_id' | 'points_estimate'>,
  projectSettingsByIdeaId: Map<string, ProjectColabScoreSettingRecord>,
  issueSettingsByIssueId: Map<string, IssueColabScoreSettingRecord>,
) {
  const projectSettings = projectSettingsByIdeaId.get(issue.idea_id) || null
  const issueSettings = issueSettingsByIssueId.get(issue.id) || null

  if (projectSettings || issueSettings) {
    const effectiveConfig = getEffectiveColabScoreConfig(projectSettings, issueSettings)

    return {
      points: calculateColabScore(effectiveConfig),
      source: issueSettings?.manual_points ? 'issue_manual_points' : 'colabscore_formula',
    }
  }

  if (issue.points_estimate) {
    return { points: issue.points_estimate, source: 'issue_points_estimate' }
  }

  return { points: 10, source: 'fallback' }
}

async function resolveAcceptedPoints(
  issue: ReviewIssueRecord,
  reviewerPoints: unknown,
) {
  const manualReviewPoints = Number(reviewerPoints)

  if (Number.isFinite(manualReviewPoints) && manualReviewPoints > 0) {
    return {
      points: Math.round(manualReviewPoints),
      reason: 'Pontuação definida manualmente pelo responsável na revisão.',
    }
  }

  const { projectSettingsByIdeaId, issueSettingsByIssueId } = await getColabScoreContext(
    [issue.idea_id],
    [issue.id],
  )
  const projectSettings = projectSettingsByIdeaId.get(issue.idea_id) || null
  const issueSettings = issueSettingsByIssueId.get(issue.id) || null

  if (issueSettings?.manual_points) {
    const effectiveConfig = getEffectiveColabScoreConfig(projectSettings, issueSettings)

    return {
      points: calculateColabScore(effectiveConfig),
      reason: 'Pontuação definida pelos pontos manuais da issue no ColabScore.',
    }
  }

  if (projectSettings || issueSettings) {
    const effectiveConfig = getEffectiveColabScoreConfig(projectSettings, issueSettings)

    return {
      points: calculateColabScore(effectiveConfig),
      reason: 'Pontuação calculada pela fórmula do ColabScore.',
    }
  }

  if (issue.points_estimate) {
    return {
      points: issue.points_estimate,
      reason: 'Pontuação baseada na estimativa da issue.',
    }
  }

  return {
    points: 10,
    reason: 'Pontuação fallback padrão.',
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ownerEmail = searchParams.get('ownerEmail')?.trim()
  const statusFilter = normalizeStatusFilter(searchParams.get('status'))
  const issueId = searchParams.get('issueId')?.trim()

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
  let issuesQuery = supabaseAdmin
    .from('project_issues')
    .select('id, idea_id, issue_number, title, html_url, points_estimate, status, finalized_at')
    .in('idea_id', ideaIds)

  if (issueId) {
    issuesQuery = issuesQuery.eq('id', issueId)
  }

  const { data: issues, error: issuesError } = await issuesQuery.returns<ProjectIssueRecord[]>()

  if (issuesError) {
    return NextResponse.json({ error: issuesError.message }, { status: 500 })
  }

  if (!issues || issues.length === 0) {
    return NextResponse.json({ data: [] }, { status: 200 })
  }

  let colabScoreContext
  try {
    colabScoreContext = await getColabScoreContext(ideaIds, issues.map((issue) => issue.id))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar ColabScore.' },
      { status: 500 },
    )
  }

  const allAssignmentsByIssueId = await getIssueAssignmentCounts(issues.map((issue) => issue.id))
  const collaboratorIds = Array.from(
    new Set(
      Array.from(allAssignmentsByIssueId.values())
        .flat()
        .map((assignment) => assignment.collaborator_id),
    ),
  )
  const { data: collaborators, error: collaboratorsError } = collaboratorIds.length > 0
    ? await supabaseAdmin
      .from('collaborators')
      .select('id, nome, email')
      .in('id', collaboratorIds)
      .returns<CollaboratorRecord[]>()
    : { data: [], error: null }

  if (collaboratorsError) {
    return NextResponse.json({ error: collaboratorsError.message }, { status: 500 })
  }

  const ideasById = new Map(ideas.map((idea) => [idea.id, idea]))
  const collaboratorsById = new Map((collaborators || []).map((collaborator) => [collaborator.id, collaborator]))

  const data = issues
    .map((issue) => {
      const idea = ideasById.get(issue.idea_id)
      const allAssignments = allAssignmentsByIssueId.get(issue.id) || []
      const suggestedPoints = getSuggestedPoints(
        issue,
        colabScoreContext.projectSettingsByIdeaId,
        colabScoreContext.issueSettingsByIssueId,
      )
      const filteredAssignments = statusFilter === 'all'
        ? allAssignments
        : allAssignments.filter((assignment) => assignment.status === statusFilter)

      return {
        issue_id: issue.id,
        issue_number: issue.issue_number,
        issue_title: issue.title,
        github_issue_url: issue.html_url,
        project_title: idea?.nome_projeto || '',
        idea_id: idea?.id || null,
        current_issue_status: issue.status,
        points_estimate: issue.points_estimate || 10,
        suggested_points: suggestedPoints.points,
        suggested_points_source: suggestedPoints.source,
        finalized_at: issue.finalized_at,
        activeWorkers: allAssignments.filter((assignment) => ['claimed', 'submitted'].includes(assignment.status || '')).length,
        submittedCount: allAssignments.filter((assignment) => assignment.status === 'submitted').length,
        acceptedCount: allAssignments.filter((assignment) => assignment.status === 'accepted').length,
        rejectedCount: allAssignments.filter((assignment) => assignment.status === 'rejected').length,
        assignments: filteredAssignments.map((assignment) => {
          const collaborator = collaboratorsById.get(assignment.collaborator_id)

          return {
            assignment_id: assignment.id,
            collaborator_name: collaborator?.nome || '',
            collaborator_email: collaborator?.email || '',
            claim_key: assignment.claim_key,
            branch_name: assignment.branch_name,
            status: assignment.status,
            evidence_url: assignment.evidence_url,
            accepted_points: assignment.accepted_points,
            review_comment: assignment.review_comment,
            pull_request_number: assignment.pull_request_number,
            pull_request_url: assignment.pull_request_url,
            merged_at: assignment.merged_at,
            created_at: assignment.created_at,
            updated_at: assignment.updated_at,
          }
        }),
      }
    })
    .filter((issueGroup) => issueGroup.assignments.length > 0)
    .sort((a, b) => a.issue_number - b.issue_number)

  return NextResponse.json({ data }, { status: 200 })
}

export async function POST(request: Request) {
  const {
    assignmentId,
    issueId,
    ownerEmail,
    decision,
    points,
    reviewComment,
    mergePr,
    pullRequestNumber,
    pullRequestUrl,
  } = await request.json()

  if (!['accepted', 'rejected', 'finalized'].includes(decision)) {
    return NextResponse.json(
      { error: 'decision accepted/rejected/finalized é obrigatória.' },
      { status: 400 },
    )
  }

  if (decision === 'finalized') {
    if (!assignmentId && !issueId) {
      return NextResponse.json(
        { error: 'assignmentId ou issueId é obrigatório para finalizar.' },
        { status: 400 },
      )
    }

    let targetIssueId = typeof issueId === 'string' ? issueId : null
    let selectedAssignmentId: string | null = null

    if (assignmentId) {
      const { data: assignment, error: assignmentError } = await supabaseAdmin
        .from('issue_assignments')
        .select('id, project_issue_id, status')
        .eq('id', assignmentId)
        .single<ReviewAssignmentRecord>()

      if (assignmentError || !assignment) {
        return NextResponse.json({ error: 'Assignment não encontrado.' }, { status: 404 })
      }

      targetIssueId = assignment.project_issue_id
      selectedAssignmentId = assignment.status === 'accepted' ? assignment.id : null
    }

    const finalizedAt = new Date().toISOString()
    const { error: finalizeError } = await supabaseAdmin
      .from('project_issues')
      .update({
        status: 'finalized',
        finalized_at: finalizedAt,
        finalized_by_email: typeof ownerEmail === 'string' ? ownerEmail.trim() : null,
        ...(selectedAssignmentId ? { selected_assignment_id: selectedAssignmentId } : {}),
      })
      .eq('id', targetIssueId)

    if (finalizeError) {
      return NextResponse.json({ error: finalizeError.message }, { status: 500 })
    }

    return NextResponse.json({ data: { status: 'finalized', finalized_at: finalizedAt } }, { status: 200 })
  }

  if (!assignmentId) {
    return NextResponse.json(
      { error: 'assignmentId é obrigatório para aceitar ou rejeitar.' },
      { status: 400 },
    )
  }

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from('issue_assignments')
    .select('id, project_issue_id, collaborator_id, status')
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

    return NextResponse.json({ data: { status: 'rejected' } }, { status: 200 })
  }

  const acceptedPointsResult = await resolveAcceptedPoints(issue, points)
  const acceptedPoints = acceptedPointsResult.points

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
    .update({
      status: 'accepted',
      selected_assignment_id: assignment.id,
    })
    .eq('id', issue.id)

  if (issueUpdateError) {
    return NextResponse.json({ error: issueUpdateError.message }, { status: 500 })
  }

  const { data: existingPoints, error: existingPointsError } = await supabaseAdmin
    .from('colab_points')
    .select('id')
    .eq('assignment_id', assignment.id)

  if (existingPointsError) {
    return NextResponse.json({ error: existingPointsError.message }, { status: 500 })
  }

  if (!existingPoints || existingPoints.length === 0) {
    const { error: pointsInsertError } = await supabaseAdmin
      .from('colab_points')
      .insert([
        {
          collaborator_id: assignment.collaborator_id,
          idea_id: issue.idea_id,
          assignment_id: assignment.id,
          points: acceptedPoints,
          reason: normalizedComment
            ? `${acceptedPointsResult.reason} ${normalizedComment}`
            : acceptedPointsResult.reason,
        },
      ])

    if (pointsInsertError) {
      return NextResponse.json({ error: pointsInsertError.message }, { status: 500 })
    }
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
