import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface IdeaRecord {
  id: string
  nome_projeto: string
  email: string | null
  github_repo_url: string | null
}

interface ProjectIssueRecord {
  id: string
  idea_id: string
  issue_number: number
  title: string
  html_url: string | null
  status: string | null
}

interface AssignmentRecord {
  id: string
  project_issue_id: string
  collaborator_id: string
  status: string | null
  evidence_url: string | null
  accepted_points: number | null
  updated_at: string | null
}

interface CollaboratorRecord {
  id: string
  nome: string
  email: string
}

interface ColabPointRecord {
  id: string
  collaborator_id: string
  idea_id: string
  assignment_id: string | null
  points: number
  created_at: string | null
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function latestDate(current: string | null, next: string | null) {
  if (!current) {
    return next
  }

  if (!next) {
    return current
  }

  return new Date(next).getTime() > new Date(current).getTime() ? next : current
}

export async function GET() {
  const [
    ideasResult,
    issuesResult,
    assignmentsResult,
    collaboratorsResult,
    pointsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('ideas')
      .select('id, nome_projeto, email, github_repo_url')
      .returns<IdeaRecord[]>(),
    supabaseAdmin
      .from('project_issues')
      .select('id, idea_id, issue_number, title, html_url, status')
      .returns<ProjectIssueRecord[]>(),
    supabaseAdmin
      .from('issue_assignments')
      .select('id, project_issue_id, collaborator_id, status, evidence_url, accepted_points, updated_at')
      .returns<AssignmentRecord[]>(),
    supabaseAdmin
      .from('collaborators')
      .select('id, nome, email')
      .returns<CollaboratorRecord[]>(),
    supabaseAdmin
      .from('colab_points')
      .select('id, collaborator_id, idea_id, assignment_id, points, created_at')
      .returns<ColabPointRecord[]>(),
  ])

  const firstError = [
    ideasResult.error,
    issuesResult.error,
    assignmentsResult.error,
    collaboratorsResult.error,
    pointsResult.error,
  ].find(Boolean)

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 })
  }

  const ideas = ideasResult.data || []
  const issues = issuesResult.data || []
  const assignments = assignmentsResult.data || []
  const collaborators = collaboratorsResult.data || []
  const colabPoints = pointsResult.data || []

  const ideasById = new Map(ideas.map((idea) => [idea.id, idea]))
  const issuesById = new Map(issues.map((issue) => [issue.id, issue]))
  const collaboratorsById = new Map(collaborators.map((collaborator) => [collaborator.id, collaborator]))

  const pointsByAssignmentId = new Map<string, number>()
  const acceptedDateByAssignmentId = new Map<string, string | null>()

  for (const point of colabPoints) {
    if (!point.assignment_id) {
      continue
    }

    pointsByAssignmentId.set(
      point.assignment_id,
      (pointsByAssignmentId.get(point.assignment_id) || 0) + Number(point.points || 0),
    )
    acceptedDateByAssignmentId.set(
      point.assignment_id,
      latestDate(acceptedDateByAssignmentId.get(point.assignment_id) || null, point.created_at),
    )
  }

  // TODO: Later, parameterize each issue with ColabScore fields such as estimated hours, risk factor, delivery factor, impact factor, and reference hourly value. These may be parsed from GitHub labels such as hours:4, risk:high, impact:medium.
  const acceptedAssignments = assignments.filter((assignment) => assignment.status === 'accepted')
  const activeAssignments = assignments.filter((assignment) => ['claimed', 'submitted'].includes(assignment.status || ''))
  const finalizedIssues = issues.filter((issue) => issue.status === 'finalized')
  const pointsByAcceptedAssignmentId = new Map<string, number>()

  for (const assignment of acceptedAssignments) {
    pointsByAcceptedAssignmentId.set(
      assignment.id,
      pointsByAssignmentId.has(assignment.id)
        ? pointsByAssignmentId.get(assignment.id) || 0
        : Number(assignment.accepted_points || 0),
    )
  }

  const fallbackAcceptedPoints = acceptedAssignments
    .filter((assignment) => !pointsByAssignmentId.has(assignment.id))
    .map((assignment) => Number(assignment.accepted_points || 0))
  const totalPoints = sum(colabPoints.map((point) => Number(point.points || 0))) + sum(fallbackAcceptedPoints)
  const activeCollaboratorIds = new Set(assignments.map((assignment) => assignment.collaborator_id).filter(Boolean))

  const projects = ideas.map((idea) => {
    const projectIssues = issues.filter((issue) => issue.idea_id === idea.id)
    const projectIssueIds = new Set(projectIssues.map((issue) => issue.id))
    const projectAssignments = assignments.filter((assignment) => projectIssueIds.has(assignment.project_issue_id))
    const projectActiveAssignments = projectAssignments.filter((assignment) => ['claimed', 'submitted'].includes(assignment.status || ''))
    const projectAcceptedAssignments = projectAssignments.filter((assignment) => assignment.status === 'accepted')
    const projectPointsFromRows = colabPoints
      .filter((point) => point.idea_id === idea.id)
      .map((point) => Number(point.points || 0))
    const fallbackAcceptedPoints = projectAcceptedAssignments
      .filter((assignment) => !pointsByAssignmentId.has(assignment.id))
      .map((assignment) => Number(assignment.accepted_points || 0))
    const lastAcceptedAt = projectAcceptedAssignments.reduce<string | null>((current, assignment) => {
      const acceptedDate = acceptedDateByAssignmentId.get(assignment.id) || assignment.updated_at
      return latestDate(current, acceptedDate)
    }, null)

    return {
      ideaId: idea.id,
      title: idea.nome_projeto,
      ownerEmail: idea.email,
      github_repo_url: idea.github_repo_url,
      totalIssues: projectIssues.length,
      activeTasks: projectActiveAssignments.length,
      claimedTasks: projectActiveAssignments.length,
      submittedTasks: projectAssignments.filter((assignment) => assignment.status === 'submitted').length,
      acceptedTasks: projectAcceptedAssignments.length,
      rejectedTasks: projectAssignments.filter((assignment) => assignment.status === 'rejected').length,
      finalizedIssues: projectIssues.filter((issue) => issue.status === 'finalized').length,
      totalPoints: sum(projectPointsFromRows) + sum(fallbackAcceptedPoints),
      lastAcceptedAt,
    }
  })

  const recentAcceptedTasks = acceptedAssignments
    .map((assignment) => {
      const issue = issuesById.get(assignment.project_issue_id)
      const idea = issue ? ideasById.get(issue.idea_id) : undefined
      const collaborator = collaboratorsById.get(assignment.collaborator_id)
      const acceptedDate = acceptedDateByAssignmentId.get(assignment.id) || assignment.updated_at

      return {
        projectTitle: idea?.nome_projeto || '',
        issueNumber: issue?.issue_number || null,
        issueTitle: issue?.title || '',
        collaboratorName: collaborator?.nome || '',
        collaboratorEmail: collaborator?.email || '',
        points: pointsByAcceptedAssignmentId.get(assignment.id) || 0,
        acceptedDate,
        evidence_url: assignment.evidence_url,
        githubIssueUrl: issue?.html_url || null,
      }
    })
    .sort((a, b) => new Date(b.acceptedDate || 0).getTime() - new Date(a.acceptedDate || 0).getTime())
    .slice(0, 10)

  const topCollaborators = collaborators
    .map((collaborator) => {
      const collaboratorAcceptedAssignments = acceptedAssignments.filter(
        (assignment) => assignment.collaborator_id === collaborator.id,
      )
      const collaboratorPointRows = colabPoints.filter((point) => point.collaborator_id === collaborator.id)
      const collaboratorFallbackPoints = collaboratorAcceptedAssignments
        .filter((assignment) => !pointsByAssignmentId.has(assignment.id))
        .map((assignment) => Number(assignment.accepted_points || 0))

      return {
        collaboratorId: collaborator.id,
        name: collaborator.nome,
        email: collaborator.email,
        totalPoints: sum(collaboratorPointRows.map((point) => Number(point.points || 0))) + sum(collaboratorFallbackPoints),
        acceptedTasks: collaboratorAcceptedAssignments.length,
      }
    })
    .filter((collaborator) => collaborator.totalPoints > 0 || collaborator.acceptedTasks > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10)

  return NextResponse.json({
    overview: {
      totalProjects: ideas.length,
      totalIssues: issues.length,
      activeTasks: activeAssignments.length,
      submittedTasks: assignments.filter((assignment) => assignment.status === 'submitted').length,
      reviewedTasks: assignments.filter((assignment) => ['accepted', 'rejected'].includes(assignment.status || '')).length,
      acceptedTasks: acceptedAssignments.length,
      rejectedTasks: assignments.filter((assignment) => assignment.status === 'rejected').length,
      finalizedIssues: finalizedIssues.length,
      totalPoints,
      activeCollaborators: activeCollaboratorIds.size,
    },
    projects,
    recentAcceptedTasks,
    topCollaborators,
  })
}
