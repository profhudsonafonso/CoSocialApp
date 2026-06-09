export interface BusinessValidationInput {
  ideaName: string
  shortDescription: string
  problem: string
  targetAudience: string
  proposedSolution: string
  declaredDifferentiators: string
  businessModel: string
  marketRegion: string
  knownCompetitors: string
}

export interface BusinessValidationQuery {
  query_text: string
  language: string
  query_type: string
  source_target: string
}

export interface BusinessValidationCandidate {
  name: string
  website_url: string | null
  description: string
  candidate_type: string
  similarity_score: number
  risk_level: string
  evidence_summary: string
}

export interface GeneratedBusinessValidation {
  queries: BusinessValidationQuery[]
  candidates: BusinessValidationCandidate[]
  noveltyScore: number
  riskScore: number
  differentiationScore: number
  overallRecommendation: string
  markdownReport: string
  executiveSummary: string
  mainRisks: string
  mainOpportunities: string
  recommendation: string
}

// TODO: Add real Web Search API connector.
// TODO: Add GitHub Search API for open-source alternatives.
// TODO: Add Google Patents search.
// TODO: Add Product Hunt/G2/Capterra search.
// TODO: Add LLM-based candidate classification with evidence citations.
// TODO: Add source confidence and evidence date.
// TODO: Add export to PDF/Markdown.

function compact(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function splitCompetitors(value: string) {
  return value
    .split(/[,;\n]/)
    .map((competitor) => compact(competitor))
    .filter(Boolean)
    .slice(0, 5)
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function getRecommendation(noveltyScore: number, riskScore: number, differentiationScore: number) {
  if (riskScore >= 75 && differentiationScore < 45) {
    return 'pivotar'
  }

  if (riskScore >= 65) {
    return 'validar mais'
  }

  if (differentiationScore < 45) {
    return 'nichar'
  }

  if (noveltyScore < 45) {
    return 'ajustar'
  }

  return 'continuar'
}

export function generateBusinessValidation(input: BusinessValidationInput): GeneratedBusinessValidation {
  const ideaName = compact(input.ideaName) || 'Ideia sem nome'
  const problem = compact(input.problem)
  const targetAudience = compact(input.targetAudience)
  const proposedSolution = compact(input.proposedSolution)
  const differentiators = compact(input.declaredDifferentiators)
  const businessModel = compact(input.businessModel)
  const marketRegion = compact(input.marketRegion) || 'Brasil'
  const knownCompetitors = splitCompetitors(input.knownCompetitors)
  const problemKeywords = problem || ideaName
  const audienceKeywords = targetAudience || 'público-alvo'

  const queries: BusinessValidationQuery[] = [
    {
      query_text: `"${ideaName}" concorrentes ${marketRegion}`,
      language: 'pt',
      query_type: 'competitors',
      source_target: 'web',
    },
    {
      query_text: `${problemKeywords} solução SaaS startup ${marketRegion}`,
      language: 'pt',
      query_type: 'similar_solutions',
      source_target: 'web',
    },
    {
      query_text: `${audienceKeywords} problema "${problemKeywords}" alternativa`,
      language: 'pt',
      query_type: 'substitutes',
      source_target: 'web',
    },
    {
      query_text: `${ideaName} open source GitHub alternativa`,
      language: 'pt',
      query_type: 'open_source',
      source_target: 'github',
    },
    {
      query_text: `${proposedSolution || ideaName} Product Hunt`,
      language: 'en',
      query_type: 'product_launches',
      source_target: 'product_hunt',
    },
    {
      query_text: `${problemKeywords} G2 Capterra software`,
      language: 'en',
      query_type: 'software_directories',
      source_target: 'g2_capterra',
    },
    {
      query_text: `${problemKeywords} patente tecnologia`,
      language: 'pt',
      query_type: 'patents',
      source_target: 'patents',
    },
    {
      query_text: `${audienceKeywords} forum reclamação dificuldade ${problemKeywords}`,
      language: 'pt',
      query_type: 'demand_signals',
      source_target: 'communities',
    },
    {
      query_text: `${businessModel || ideaName} pricing monetização concorrentes`,
      language: 'pt',
      query_type: 'business_model',
      source_target: 'web',
    },
    {
      query_text: `${differentiators || ideaName} diferencial competitivo comparação`,
      language: 'pt',
      query_type: 'differentiation',
      source_target: 'web',
    },
  ].slice(0, 10)

  const candidates: BusinessValidationCandidate[] = knownCompetitors.length > 0
    ? knownCompetitors.map((competitor, index) => ({
      name: competitor,
      website_url: null,
      description: `Concorrente declarado para investigar contra a proposta "${ideaName}".`,
      candidate_type: 'known_competitor',
      similarity_score: clampScore(75 - index * 7),
      risk_level: index === 0 ? 'alto' : 'medio',
      evidence_summary: 'Informado pelo usuário. Este MVP ainda não verificou evidências externas.',
    }))
    : [
      {
        name: 'Solução SaaS similar a investigar',
        website_url: null,
        description: `Hipótese de ferramenta comercial que resolva "${problemKeywords}".`,
        candidate_type: 'candidate_to_investigate',
        similarity_score: 65,
        risk_level: 'medio',
        evidence_summary: 'Placeholder investigativo. Não é evidência real de mercado.',
      },
      {
        name: 'Alternativa manual/processo interno',
        website_url: null,
        description: `Substituto não tecnológico usado por ${audienceKeywords}.`,
        candidate_type: 'substitute_to_investigate',
        similarity_score: 55,
        risk_level: 'medio',
        evidence_summary: 'Hipótese comum de substituto. Validar em entrevistas.',
      },
      {
        name: 'Projeto open-source equivalente',
        website_url: null,
        description: 'Possível alternativa aberta no GitHub ou comunidades técnicas.',
        candidate_type: 'open_source_to_investigate',
        similarity_score: 45,
        risk_level: 'baixo',
        evidence_summary: 'Placeholder investigativo. Usar GitHub Search futuramente.',
      },
    ]

  while (candidates.length < 5) {
    candidates.push({
      name: `Hipótese adicional ${candidates.length + 1}`,
      website_url: null,
      description: `Categoria adjacente que pode atender ${audienceKeywords}.`,
      candidate_type: 'candidate_to_investigate',
      similarity_score: clampScore(50 - candidates.length * 3),
      risk_level: 'baixo',
      evidence_summary: 'Hipótese gerada localmente para orientar busca posterior.',
    })
  }

  const hasCompetitors = knownCompetitors.length > 0
  const differentiatorWords = differentiators.split(' ').filter(Boolean).length
  const solutionWords = proposedSolution.split(' ').filter(Boolean).length
  const noveltyScore = clampScore(62 - knownCompetitors.length * 8 + Math.min(differentiatorWords, 20))
  const riskScore = clampScore(35 + knownCompetitors.length * 12 + (businessModel ? 0 : 12) + (marketRegion ? 0 : 8))
  const differentiationScore = clampScore(35 + Math.min(differentiatorWords * 3, 35) + Math.min(solutionWords, 20) - (hasCompetitors ? 8 : 0))
  const overallRecommendation = getRecommendation(noveltyScore, riskScore, differentiationScore)

  const executiveSummary = `Este MVP gerou uma análise inicial e queries sugeridas. A busca web automática será adicionada em uma próxima etapa. A ideia "${ideaName}" deve ser avaliada criticamente contra concorrentes, substitutos e sinais reais de demanda antes de virar backlog de execução.`
  const mainRisks = [
    hasCompetitors ? 'Concorrentes conhecidos podem já capturar parte da demanda.' : 'A ausência de concorrentes informados não significa ausência de mercado ou risco.',
    'A proposta ainda precisa provar urgência do problema e disposição de pagamento.',
    'Diferenciais declarados precisam ser testados contra alternativas reais, inclusive processos manuais.',
  ].join(' ')
  const mainOpportunities = [
    'Usar as queries sugeridas para montar evidências antes de desenvolver.',
    'Entrevistar clientes sobre substitutos atuais e custo do problema.',
    'Nichar por segmento, região ou fluxo operacional caso existam concorrentes fortes.',
  ].join(' ')
  const recommendation = `Recomendação final: ${overallRecommendation}.`

  const markdownReport = [
    '# Validação de Negócio MVP',
    '',
    '## Resumo executivo',
    executiveSummary,
    '',
    '## Hipóteses de concorrência',
    hasCompetitors
      ? `Concorrentes informados: ${knownCompetitors.join(', ')}. Eles devem ser comparados por público, preço, canal, funcionalidades e evidências de adoção.`
      : 'Nenhum concorrente conhecido foi informado. Este MVP criou candidatos claramente marcados como hipóteses para investigação, não como evidência real.',
    '',
    '## Queries sugeridas para busca',
    ...queries.map((query) => `- ${query.query_text}`),
    '',
    '## Mapa inicial de soluções similares',
    ...candidates.map((candidate) => `- **${candidate.name}** (${candidate.candidate_type}): similaridade ${candidate.similarity_score}/100, risco ${candidate.risk_level}. ${candidate.evidence_summary}`),
    '',
    '## Riscos',
    mainRisks,
    '',
    '## Lacunas e oportunidades',
    mainOpportunities,
    '',
    '## Perguntas para validação com clientes',
    '- Que solução ou processo você usa hoje para esse problema?',
    '- Quanto tempo, dinheiro ou risco esse problema gera por mês?',
    '- O que faria você trocar a solução atual?',
    '- Qual diferencial realmente mudaria sua decisão de compra?',
    '- Quem aprovaria ou bloquearia a adoção dessa solução?',
    '',
    '## Recomendação final',
    recommendation,
  ].join('\n')

  return {
    queries,
    candidates,
    noveltyScore,
    riskScore,
    differentiationScore,
    overallRecommendation,
    markdownReport,
    executiveSummary,
    mainRisks,
    mainOpportunities,
    recommendation,
  }
}
