import { type BusinessValidationQuery } from './search-connectors'
import {
  type BusinessValidationCandidate,
  type BusinessValidationInput,
  calculateMarketThreatScore,
  getOverallRecommendation,
} from './scoring'

export interface BusinessValidationScores {
  noveltyScore: number | null
  riskScore: number | null
  differentiationScore: number | null
}

function sourceLabel(sourceType: string) {
  const labels: Record<string, string> = {
    web: 'Web/Brave Search',
    github: 'GitHub',
    hacker_news: 'Hacker News',
    wikipedia: 'Wikipedia',
    openalex: 'OpenAlex',
    local_fallback: 'Fallback local',
  }

  return labels[sourceType] || sourceType
}

function bySource(candidates: BusinessValidationCandidate[], sourceType: string) {
  return candidates.filter((candidate) => candidate.source_type === sourceType)
}

function listCandidates(candidates: BusinessValidationCandidate[]) {
  if (candidates.length === 0) {
    return ['- Nenhum resultado real encontrado nesta fonte.']
  }

  return candidates.map((candidate) => (
    `- **${candidate.name}** (${candidate.candidate_type}, ${candidate.source_type}): similaridade ${candidate.similarity_score}/100, ameaça de mercado ${calculateMarketThreatScore(candidate)}/100, risco ${candidate.risk_level}. ${candidate.evidence_summary}`
  ))
}

export function generateBusinessValidationMarkdown(
  input: BusinessValidationInput,
  queries: BusinessValidationQuery[],
  candidates: BusinessValidationCandidate[],
  scores: BusinessValidationScores,
  connectorErrors: string[],
  sourceStatuses: Array<{ source_type: string, attempted: boolean, success: boolean, result_count: number, error_message: string | null }>,
) {
  const sources = Array.from(new Set(candidates.map((candidate) => candidate.source_type)))
  const recommendation = getOverallRecommendation(
    scores.noveltyScore,
    scores.riskScore,
    scores.differentiationScore,
    candidates,
  )
  const hasRealEvidence = candidates.some((candidate) => candidate.source_type !== 'local_fallback')
  const realExternalCandidateCount = candidates.filter((candidate) => candidate.source_type !== 'local_fallback').length
  const sourcesWithResults = sourceStatuses.filter((status) => status.source_type !== 'local_fallback' && status.success && status.result_count > 0)
  const sourcesWithNoResults = sourceStatuses.filter((status) => status.success && status.result_count === 0)
  const failedSources = sourceStatuses.filter((status) => status.error_message && status.attempted)
  const fallbackUsed = candidates.some((candidate) => candidate.source_type === 'local_fallback')
  const sourceFailureNote = connectorErrors.length > 0
    ? 'Algumas fontes não retornaram dados ou falharam temporariamente.'
    : ''
  const executiveSummary = [
    !hasRealEvidence
      ? 'Esta validação não encontrou evidências externas reais. O resultado deve ser usado apenas como roteiro de investigação, não como conclusão de mercado.'
      : '',
    hasRealEvidence
      ? `Foram coletadas evidências públicas iniciais para "${input.ideaName}". A análise usa heurística simples de similaridade e precisa de revisão humana.`
      : `Nenhuma evidência externa real foi coletada para "${input.ideaName}". O relatório usa fallback local e deve ser tratado apenas como roteiro de investigação.`,
    sourceFailureNote,
  ].filter(Boolean).join(' ')
  const mainRisks = [
    candidates.some((candidate) => candidate.risk_level === 'alto') ? 'Há candidatos com alta similaridade ou forte sinal de adoção.' : 'Nenhum candidato foi classificado como risco alto nesta rodada.',
    'A busca cobre fontes públicas limitadas e pode perder concorrentes pagos, regionais ou novos.',
    'Scores são heurísticos; decisões estratégicas exigem validação com clientes e análise manual.',
  ].join(' ')
  const mainOpportunities = [
    'Comparar diferenciais declarados contra os candidatos mais similares.',
    'Usar as queries executadas para aprofundar busca manual e entrevistas.',
    'Explorar nichos onde a dor seja forte e as alternativas sejam fracas ou caras.',
  ].join(' ')
  const finalRecommendation = `Recomendação final: ${recommendation}.`

  const markdownReport = [
    ...(!hasRealEvidence
      ? [
        'Esta validação não encontrou evidências externas reais. O resultado deve ser usado apenas como roteiro de investigação, não como conclusão de mercado.',
        '',
      ]
      : []),
    '# Validação de Negócio MVP',
    '',
    '## Resumo executivo',
    executiveSummary,
    '',
    '## Como interpretar este resultado',
    hasRealEvidence
      ? 'Os candidatos abaixo foram coletados de fontes externas públicas e devem ser revisados manualmente.'
      : 'Nenhuma fonte externa retornou evidências reais. As hipóteses locais abaixo não comprovam concorrência nem novidade. Use este resultado apenas para refinar termos de busca e planejar validação manual.',
    '',
    '## Fontes consultadas',
    sources.filter((source) => source !== 'local_fallback').length > 0
      ? sources.filter((source) => source !== 'local_fallback').map((source) => `- ${sourceLabel(source)}`).join('\n')
      : '- Nenhuma fonte retornou candidatos.',
    sourceFailureNote ? `\n${sourceFailureNote}` : '',
    '',
    '## Confiabilidade da validação',
    `- Candidatos externos reais coletados: ${realExternalCandidateCount}.`,
    `- Fontes com resultados: ${sourcesWithResults.length > 0 ? sourcesWithResults.map((status) => sourceLabel(status.source_type)).join(', ') : 'nenhuma'}.`,
    `- Fontes sem resultados: ${sourcesWithNoResults.length > 0 ? sourcesWithNoResults.map((status) => sourceLabel(status.source_type)).join(', ') : 'nenhuma'}.`,
    `- Fontes com falha: ${failedSources.length > 0 ? failedSources.map((status) => sourceLabel(status.source_type)).join(', ') : 'nenhuma'}.`,
    `- Fallback local usado: ${fallbackUsed ? 'sim' : 'não'}.`,
    '',
    '## Queries executadas',
    ...queries.map((query) => `- ${query.query_text} (${query.source_target})`),
    '',
    '## Mapa inicial de soluções similares',
    ...listCandidates(candidates),
    '',
    '## Projetos open-source encontrados',
    ...listCandidates(bySource(candidates, 'github')),
    '',
    '## Sinais de demanda encontrados',
    ...listCandidates(bySource(candidates, 'hacker_news')),
    '',
    '## Referências técnicas/científicas',
    ...listCandidates(bySource(candidates, 'openalex')),
    '',
    '## Riscos de diferenciação',
    mainRisks,
    '',
    '## Limitações do score',
    'Scores são heurísticos. Referências acadêmicas não são tratadas como concorrentes diretos. Posts com baixo engajamento são evidência fraca. Conclusões fortes de novidade ou risco exigem concorrentes diretos, substitutos ou alternativas de mercado com evidência externa clara.',
    '',
    '## Lacunas e oportunidades',
    mainOpportunities,
    '',
    '## Perguntas para validação com clientes',
    '- Qual alternativa você usa hoje e por que ela é insuficiente?',
    '- Que custo real existe se esse problema continuar sem solução?',
    '- O diferencial declarado mudaria sua decisão de compra ou adoção?',
    '- Quem seria o decisor e quem seria bloqueador?',
    '- Que evidência faria a equipe pivotar ou nichar?',
    '',
    '## Recomendação final',
    finalRecommendation,
  ].join('\n')

  return {
    markdownReport,
    executiveSummary,
    mainRisks,
    mainOpportunities,
    recommendation: finalRecommendation,
    overallRecommendation: recommendation,
  }
}
