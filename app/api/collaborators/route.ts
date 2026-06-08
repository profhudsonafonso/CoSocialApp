import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  const body = await request.json()
  const {
    nome,
    email,
    area,
    nivel,
    horas,
    tipoProjeto,
    contribuicao,
  } = body

  if (!nome || !email || !area || !nivel) {
    return NextResponse.json(
      { error: 'Campos obrigatórios faltando. Preencha nome, e-mail, área e nível.' },
      { status: 400 },
    )
  }

  const { data, error } = await supabaseAdmin.from('collaborators').insert([
    {
      nome,
      email,
      area,
      nivel,
      horas,
      tipo_projeto: tipoProjeto,
      contribuicao,
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
    .from('collaborators')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200 })
}
