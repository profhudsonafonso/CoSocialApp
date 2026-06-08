import { NextResponse } from 'next/server'
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
  } = body

  if (!nome || !email || !nomeProjeto || !problema) {
    return NextResponse.json(
      { error: 'Campos obrigatórios faltando. Preencha nome, e-mail, nome da ideia e problema.' },
      { status: 400 },
    )
  }

  const { data, error } = await supabaseAdmin.from('ideas').insert([
    {
      nome,
      email,
      nome_projeto: nomeProjeto,
      problema,
      publico,
      estagio,
      ajuda,
      created_at: new Date().toISOString(),
    },
  ])

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
