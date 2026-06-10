import { supabaseAdmin } from '@/lib/supabase'

interface BuildContextInput {
  ideaId: string
  projectIssueId: string
  assignmentId?: string | null
}

interface IdeaRecord {
  id: string
  nome_projeto: string | null
  email: string | null
  problema: string | null
  publico: string | null
  github_repo_url: string | null
  github_owner: string | null
  github_repo: string | null
  github_default_branch: string | null
}

interface IssueRecord {
  id: string
  idea_id: string
  issue_number: number
  title: string
  body: string | null
  labels: unknown
  html_url: string | null
  status: string | null
  points_estimate: number | null
}

interface AssignmentRecord {
  id: string
  project_issue_id: string
  claim_key: string
  branch_name: string
  status: string | null
  evidence_url: string | null
  accepted_points: number | null
  review_comment: string | null
  pull_request_number: number | null
  pull_request_url: string | null
  merged_at: string | null
}

interface CommitRecord {
  sha: string
  message: string | null
  html_url: string | null
  author_login: string | null
  branch_name: string | null
  received_at: string | null
}

interface PointsRecord {
  points: number
  reason: string | null
  created_at: string | null
}

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{12,}/g,
  /ghp_[A-Za-z0-9_]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /(?:api[_-]?key|token|password|secret)\s*[:=]\s*["']?[^"'\s]+["']?/gi,
  /^[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY)[A-Z0-9_]*=.*$/gim,
]

export function maskSensitiveText(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  let text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)

  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, '[SEGREDO_REMOVIDO]')
  }

  return text
}

function formatLabels(labels: unknown) {
  if (!Array.isArray(labels)) {
    return maskSensitiveText(labels)
  }

  return labels
    .map((label) => {
      if (typeof label === 'string') {
        return label
      }

      if (label && typeof label === 'object' && 'name' in label) {
        return String((label as { name?: unknown }).name || '')
      }

      return ''
    })
    .filter(Boolean)
    .join(', ')
}

export async function buildColabAiContext({ ideaId, projectIssueId, assignmentId }: BuildContextInput) {
  const { data: idea, error: ideaError } = await supabaseAdmin
    .from('ideas')
    .select('id, nome_projeto, email, problema, publico, github_repo_url, github_owner, github_repo, github_default_branch')
    .eq('id', ideaId)
    .single<IdeaRecord>()

  if (ideaError || !idea) {
    throw new Error('Projeto não encontrado para montar o contexto.')
  }

  const { data: issue, error: issueError } = await supabaseAdmin
    .from('project_issues')
    .select('id, idea_id, issue_number, title, body, labels, html_url, status, points_estimate')
    .eq('id', projectIssueId)
    .eq('idea_id', ideaId)
    .single<IssueRecord>()

  if (issueError || !issue) {
    throw new Error('Issue não encontrada para este projeto.')
  }

  let assignment: AssignmentRecord | null = null
  let commits: CommitRecord[] = []
  let points: PointsRecord[] = []

  if (assignmentId) {
    const { data: assignmentData, error: assignmentError } = await supabaseAdmin
      .from('issue_assignments')
      .select('id, project_issue_id, claim_key, branch_name, status, evidence_url, accepted_points, review_comment, pull_request_number, pull_request_url, merged_at')
      .eq('id', assignmentId)
      .eq('project_issue_id', projectIssueId)
      .single<AssignmentRecord>()

    if (assignmentError || !assignmentData) {
      throw new Error('Assignment não encontrado para esta issue.')
    }

    assignment = assignmentData

    const { data: commitData } = await supabaseAdmin
      .from('github_commits')
      .select('sha, message, html_url, author_login, branch_name, received_at')
      .eq('assignment_id', assignmentId)
      .order('received_at', { ascending: false })
      .limit(10)
      .returns<CommitRecord[]>()

    commits = commitData || []

    const { data: pointsData } = await supabaseAdmin
      .from('colab_points')
      .select('points, reason, created_at')
      .eq('assignment_id', assignmentId)
      .order('created_at', { ascending: false })
      .returns<PointsRecord[]>()

    points = pointsData || []
  }

  const lines = [
    '# Contexto ColabAI',
    '',
    '## Projeto',
    `- Nome: ${maskSensitiveText(idea.nome_projeto || 'Sem nome')}`,
    `- Responsável: ${maskSensitiveText(idea.email || 'Não informado')}`,
    `- Problema: ${maskSensitiveText(idea.problema || 'Não informado')}`,
    `- Público: ${maskSensitiveText(idea.publico || 'Não informado')}`,
    `- GitHub: ${maskSensitiveText(idea.github_repo_url || `${idea.github_owner || ''}/${idea.github_repo || ''}` || 'Não informado')}`,
    `- Branch padrão: ${maskSensitiveText(idea.github_default_branch || 'main')}`,
    '',
    '## Issue',
    `- Número: #${issue.issue_number}`,
    `- Título: ${maskSensitiveText(issue.title)}`,
    `- Status: ${maskSensitiveText(issue.status || 'open')}`,
    `- Pontos estimados: ${issue.points_estimate || 10}`,
    `- Labels: ${formatLabels(issue.labels) || 'Sem labels'}`,
    `- URL GitHub: ${maskSensitiveText(issue.html_url || 'Não informado')}`,
    '',
    '### Corpo da issue',
    maskSensitiveText(issue.body || 'Sem descrição.'),
  ]

  if (assignment) {
    lines.push(
      '',
      '## Assignment selecionado',
      `- ID: ${assignment.id}`,
      `- Claim key: ${maskSensitiveText(assignment.claim_key)}`,
      `- Branch: ${maskSensitiveText(assignment.branch_name)}`,
      `- Status: ${maskSensitiveText(assignment.status || 'claimed')}`,
      `- Evidência: ${maskSensitiveText(assignment.evidence_url || 'Não informada')}`,
      `- Pull Request: ${maskSensitiveText(assignment.pull_request_url || assignment.pull_request_number || 'Não informado')}`,
      `- Pontos aceitos: ${assignment.accepted_points || 0}`,
      `- Merge em: ${maskSensitiveText(assignment.merged_at || 'Não realizado')}`,
      `- Comentário de revisão: ${maskSensitiveText(assignment.review_comment || 'Sem comentário')}`,
    )
  }

  if (commits.length > 0) {
    lines.push('', '## Commits capturados')
    for (const commit of commits) {
      lines.push(
        `- ${commit.sha.slice(0, 7)} · ${maskSensitiveText(commit.message || 'Sem mensagem')} · ${maskSensitiveText(commit.html_url || 'Sem URL')} · ${maskSensitiveText(commit.author_login || 'autor desconhecido')} · ${maskSensitiveText(commit.branch_name || 'branch desconhecida')}`,
      )
    }
  }

  if (points.length > 0) {
    lines.push('', '## Pontuação registrada')
    for (const point of points) {
      lines.push(`- ${point.points} pts · ${maskSensitiveText(point.reason || 'Sem motivo')} · ${maskSensitiveText(point.created_at || '')}`)
    }
  }

  lines.push(
    '',
    '## Regras de segurança',
    '- Não usar, repetir ou pedir tokens, senhas, chaves de API, conteúdo de .env ou raw webhook payloads.',
  )

  return {
    idea,
    issue,
    assignment,
    contextText: lines.join('\n'),
  }
}
