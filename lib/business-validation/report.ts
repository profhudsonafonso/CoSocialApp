import { type BusinessValidationQuery } from './search-connectors'
import { type InvestmentSignal } from './investment-signals'
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

function listInvestmentSignals(signals: InvestmentSignal[]) {
  if (signals.length === 0) {
    return ['- Nenhum sinal forte de investimento/captação foi encontrado nas fontes públicas consultadas.']
  }

  return signals.slice(0, 8).map((signal) => (
    `- **${signal.display_name || signal.startup_name || signal.title}** (${signal.source_platform || signal.domain}, ${signal.relevance_level}): ${signal.similarity_reason}`
  ))
}

function compactReportText(value: string | null | undefined, maxLength = 180) {
  const text = (value || '').replace(/\s+/g, ' ').trim()

  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`
}

function investmentSignalsTable(signals: InvestmentSignal[]) {
  if (signals.length === 0) {
    return ['Nenhum sinal forte de investimento/captação foi encontrado nas fontes públicas consultadas.']
  }

  return [
    '| Resultado | Fonte | Tipo | Relevância | Similaridade | Parte parecida da ideia | Impacto na novidade |',
    '| --------- | ----- | ---- | ---------- | -----------: | ----------------------- | ------------------- |',
    ...signals.map((signal) => [
      compactReportText(signal.display_name || signal.startup_name || signal.title, 80),
      compactReportText(signal.source_platform || signal.domain, 60),
      compactReportText(`${signal.result_kind}/${signal.source_category}`, 60),
      signal.relevance_level || 'fraco',
      String(signal.similarity_score || 0),
      compactReportText(signal.similarity_reason || 'Referência genérica.', 160),
      compactReportText(signal.novelty_impact_reason || 'Não reduz novidade', 160),
    ].join(' | ')).map((row) => `| ${row} |`),
  ]
}

export function generateBusinessValidationMarkdown(
  input: BusinessValidationInput,
  queries: BusinessValidationQuery[],
  candidates: BusinessValidationCandidate[],
  scores: BusinessValidationScores,
  connectorErrors: string[],
  sourceStatuses: Array<{ source_type: string, attempted: boolean, success: boolean, result_count: number, error_message: string | null }>,
  investmentSignals: InvestmentSignal[] = [],
  investmentPenaltyApplied = 0,
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
  const investmentStatus = sourceStatuses.find((status) => status.source_type === 'investment_signals')
  const investmentSources = Array.from(new Set(investmentSignals.map((signal) => signal.source_platform)))
  const strongInvestmentSignals = investmentSignals.filter((signal) => signal.investment_signal_score >= 70)
  const meaningfulInvestmentSignals = investmentSignals.filter((signal) => ['forte', 'médio'].includes(signal.relevance_level))
  const weakInvestmentSignals = investmentSignals.filter((signal) => !['forte', 'médio'].includes(signal.relevance_level))
  const investmentNote = strongInvestmentSignals.length > 0
    ? 'Foram encontrados sinais de mercado/investimento semelhantes. Isso não prova sucesso, mas indica que modelos parecidos já foram expostos a investidores ou plataformas públicas.'
    : ''
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
    investmentNote,
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
    `- Camada de investimento/captação: ${investmentStatus?.attempted ? 'consultada' : 'não configurada ou não executada'}.`,
    '',
    '## Queries executadas',
    ...queries.map((query) => `- ${query.query_text} (${query.source_target})`),
    '',
    '## Mapa inicial de soluções similares',
    ...listCandidates(candidates),
    '',
    '## Sinais de investimento e captação',
    'Esta camada procura startups, produtos ou modelos semelhantes em fontes de investimento, aceleração, crowdfunding, bases de startups e conteúdos públicos. Estar listado nessas fontes não prova sucesso, mas pode indicar que um modelo parecido já tem presença pública.',
    `- Fontes consultadas com resultado: ${investmentSources.length > 0 ? investmentSources.join(', ') : 'nenhuma'}.`,
    `- Sinais encontrados: ${investmentSignals.length}.`,
    `- Penalidade de inovação aplicada: ${investmentPenaltyApplied}.`,
    meaningfulInvestmentSignals.length > 0
      ? 'Isso reduz a novidade percebida da ideia e exige diferenciação mais clara.'
      : 'Nenhum sinal forte de investimento/captação foi encontrado nas fontes públicas consultadas.',
    '',
    ...investmentSignalsTable(investmentSignals),
    '',
    '### Principais sinais fortes',
    ...listInvestmentSignals(meaningfulInvestmentSignals),
    '',
    '### Resultados fracos ou genéricos',
    ...listInvestmentSignals(weakInvestmentSignals),
    weakInvestmentSignals.length > 0
      ? 'Resultados fracos ou genéricos ajudam como referência de mercado, mas não reduzem fortemente a novidade.'
      : '',
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
