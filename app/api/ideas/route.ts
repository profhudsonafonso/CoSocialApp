import { NextResponse } from 'next/server'
import { parseGitHubRepoUrl } from '@/lib/github'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  const body = await request.json()
  const {
    nome,
    email,
    nomeProjeto,
    problema,
    publico,
    estagio,
    ajuda,
    githubRepoUrl,
  } = body

  if (!nome || !email || !nomeProjeto || !problema) {
    return NextResponse.json(
      { error: 'Campos obrigatórios faltando. Preencha nome, e-mail, nome da ideia e problema.' },
      { status: 400 },
    )
  }

  const normalizedGitHubRepoUrl = typeof githubRepoUrl === 'string' ? githubRepoUrl.trim() : ''
  const parsedGitHubRepo = normalizedGitHubRepoUrl ? parseGitHubRepoUrl(normalizedGitHubRepoUrl) : null

  if (normalizedGitHubRepoUrl && !parsedGitHubRepo) {
    return NextResponse.json(
      { error: 'URL do repositório GitHub inválida. Use o formato https://github.com/owner/repo.' },
      { status: 400 },
    )
  }

  const ideaPayload = {
    nome,
    email,
    nome_projeto: nomeProjeto,
    problema,
    publico,
    estagio,
    ajuda,
    created_at: new Date().toISOString(),
    ...(parsedGitHubRepo
      ? {
          github_repo_url: normalizedGitHubRepoUrl,
          github_owner: parsedGitHubRepo.owner,
          github_repo: parsedGitHubRepo.repo,
          github_default_branch: 'main',
        }
      : {}),
  }

  const { data, error } = await supabaseAdmin.from('ideas').insert([ideaPayload])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('ideas')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200 })
}
