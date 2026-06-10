export interface AiGatewayRequest {
  featureName: string
  systemPrompt: string
  userPrompt: string
}

export interface AiGatewayResponse {
  markdown: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
}

const DEMO_NOTICE =
  'Resposta local de demonstração. Configure OPENROUTER_API_KEY ou REQUESTY_API_KEY para usar IA real.'

function estimateTokens(value: string) {
  return Math.ceil(value.length / 4)
}

function getMockMarkdown({ featureName, userPrompt }: AiGatewayRequest) {
  const preview = userPrompt.slice(0, 900)

  if (featureName === 'generate_prompt_pack') {
    return `# Prompt Pack para IDE\n\n> ${DEMO_NOTICE}\n\n## Contexto\nUse o resumo abaixo como contexto inicial e confirme os detalhes no repositório antes de alterar arquivos.\n\n${preview}\n\n## Prompt de implementação\nImplemente a issue selecionada mantendo o estilo do projeto. Faça mudanças pequenas, rode lint/build quando possível e não exponha segredos.\n\n## Prompt de testes\nListe cenários de teste para validar a mudança, incluindo fluxo feliz, erros esperados e regressões prováveis.\n\n## Prompt de revisão\nRevise o diff procurando bugs, riscos de segurança, dados sensíveis e inconsistências com a issue.`
  }

  const titles: Record<string, string> = {
    issue_explain: 'Explicação da tarefa',
    technical_plan: 'Plano técnico',
    implementation_checklist: 'Checklist de implementação',
    review_submission: 'Revisão da entrega',
    validate_delivery: 'Validação da entrega',
  }

  return `# ${titles[featureName] || 'ColabAI Assist'}\n\n> ${DEMO_NOTICE}\n\n## Resumo\nEsta resposta usa uma análise local demonstrativa com base no contexto selecionado.\n\n## Próximos passos sugeridos\n- Leia a issue original e confirme o objetivo principal.\n- Identifique arquivos prováveis antes de editar.\n- Faça uma alteração pequena e verificável.\n- Rode os testes disponíveis e registre evidências.\n\n## Pontos de atenção\n- Não envie tokens, senhas ou conteúdo de .env.\n- Confirme a branch e o formato de commit antes do push.\n\n## Contexto usado\n${preview}`
}

async function callOpenAiCompatibleApi({
  endpoint,
  apiKey,
  provider,
  model,
  systemPrompt,
  userPrompt,
}: {
  endpoint: string
  apiKey: string
  provider: string
  model: string
  systemPrompt: string
  userPrompt: string
}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${provider} retornou HTTP ${response.status}: ${errorText.slice(0, 240)}`)
  }

  const payload = (await response.json()) as ChatCompletionResponse
  const markdown = payload.choices?.[0]?.message?.content?.trim()

  if (!markdown) {
    throw new Error(`${provider} não retornou conteúdo.`)
  }

  return {
    markdown,
    provider,
    model,
    inputTokens: payload.usage?.prompt_tokens || estimateTokens(systemPrompt + userPrompt),
    outputTokens: payload.usage?.completion_tokens || estimateTokens(markdown),
    estimatedCostUsd: 0,
  }
}

export async function runColabAiCompletion(request: AiGatewayRequest): Promise<AiGatewayResponse> {
  const selectedProvider = (process.env.AI_PROVIDER || 'mock').toLowerCase()
  const model = process.env.AI_DEFAULT_MODEL || 'openai/gpt-4o-mini'

  try {
    if (selectedProvider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
      return await callOpenAiCompatibleApi({
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: process.env.OPENROUTER_API_KEY,
        provider: 'openrouter',
        model,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
      })
    }

    if (selectedProvider === 'requesty' && process.env.REQUESTY_API_KEY) {
      return await callOpenAiCompatibleApi({
        endpoint: 'https://router.requesty.ai/v1/chat/completions',
        apiKey: process.env.REQUESTY_API_KEY,
        provider: 'requesty',
        model,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
      })
    }
  } catch (error) {
    const fallbackMarkdown = `${getMockMarkdown(request)}\n\n## Aviso técnico\nA chamada ao provider configurado falhou e o MVP voltou para modo demonstração: ${
      error instanceof Error ? error.message : 'erro desconhecido'
    }`

    return {
      markdown: fallbackMarkdown,
      provider: 'mock',
      model: 'mock-local',
      inputTokens: estimateTokens(request.systemPrompt + request.userPrompt),
      outputTokens: estimateTokens(fallbackMarkdown),
      estimatedCostUsd: 0,
    }
  }

  const markdown = getMockMarkdown(request)

  return {
    markdown,
    provider: 'mock',
    model: 'mock-local',
    inputTokens: estimateTokens(request.systemPrompt + request.userPrompt),
    outputTokens: estimateTokens(markdown),
    estimatedCostUsd: 0,
  }
}
