import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface GitHubPushCommit {
  id?: string
  sha?: string
  message?: string
  url?: string
  author?: {
    username?: string
    name?: string
    email?: string
  }
}

interface GitHubPushPayload {
  ref?: string
  commits?: GitHubPushCommit[]
}

interface IssueAssignmentRecord {
  id: string
  project_issue_id: string
}

const claimKeyPattern = /COSOCIAL[:# -]+([A-Z0-9-]+)/i

function getBranchName(ref?: string) {
  return ref?.replace('refs/heads/', '') || null
}

function isValidSignature(rawBody: string, signature: string | null) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET

  if (!secret) {
    return true
  }

  if (!signature?.startsWith('sha256=')) {
    return false
  }

  const expectedSignature = `sha256=${createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`

  const signatureBuffer = Buffer.from(signature)
  const expectedSignatureBuffer = Buffer.from(expectedSignature)

  return (
    signatureBuffer.length === expectedSignatureBuffer.length &&
    timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  )
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 })
  }

  const eventName = request.headers.get('x-github-event')

  if (eventName && eventName !== 'push') {
    return NextResponse.json(
      { error: 'Evento GitHub não suportado.' },
      { status: 400 },
    )
  }

  let payload: GitHubPushPayload

  try {
    payload = JSON.parse(rawBody) as GitHubPushPayload
  } catch {
    return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400 })
  }

  const commits = payload.commits || []
  const branchName = getBranchName(payload.ref)
  let matchedCommits = 0

  for (const commit of commits) {
    const message = commit.message || ''
    const claimKeyMatch = message.match(claimKeyPattern)
    const claimKey = claimKeyMatch?.[1]?.toUpperCase()
    const sha = commit.id || commit.sha

    if (!claimKey || !sha) {
      continue
    }

    const { data: assignment } = await supabaseAdmin
      .from('issue_assignments')
      .select('id, project_issue_id')
      .eq('claim_key', claimKey)
      .single<IssueAssignmentRecord>()

    if (!assignment) {
      continue
    }

    matchedCommits += 1

    const { error: commitInsertError } = await supabaseAdmin
      .from('github_commits')
      .insert([
        {
          assignment_id: assignment.id,
          sha,
          message,
          html_url: commit.url || null,
          author_login: commit.author?.username || commit.author?.name || null,
          branch_name: branchName,
          raw_payload: commit,
        },
      ])

    if (commitInsertError && commitInsertError.code !== '23505') {
      return NextResponse.json({ error: commitInsertError.message }, { status: 500 })
    }

    const { error: assignmentUpdateError } = await supabaseAdmin
      .from('issue_assignments')
      .update({
        status: 'submitted',
        evidence_url: commit.url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment.id)

    if (assignmentUpdateError) {
      return NextResponse.json({ error: assignmentUpdateError.message }, { status: 500 })
    }

    const { error: issueUpdateError } = await supabaseAdmin
      .from('project_issues')
      .update({ status: 'submitted' })
      .eq('id', assignment.project_issue_id)

    if (issueUpdateError) {
      return NextResponse.json({ error: issueUpdateError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true, matchedCommits }, { status: 200 })
}
