"use client"

import { Fragment, useMemo, useState } from "react"
import { ExternalLink, Search } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface Idea {
  id: string
  nome_projeto: string
  email: string
  problema?: string | null
  publico?: string | null
  ajuda?: string | null
}

interface ValidationForm {
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

interface ValidationRun {
  id: string
  idea_name: string | null
  novelty_score: number | null
  risk_score: number | null
  differentiation_score: number | null
  overall_recommendation: string | null
  created_at: string | null
  queries?: ValidationQuery[]
  candidates?: ValidationCandidate[]
  reports?: ValidationReport[]
  sourceStatuses?: SourceStatus[]
  investmentSignals?: InvestmentSignal[]
}

interface ValidationQuery {
  id?: string
  query_text: string
  query_type?: string | null
  source_target?: string | null
}

interface ValidationCandidate {
  id?: string
  name: string | null
  description: string | null
  candidate_type: string | null
  similarity_score: number | null
  risk_level: string | null
  evidence_summary: string | null
  source_type?: string | null
  source_confidence?: number | null
  website_url?: string | null
}

interface ValidationReport {
  id?: string
  markdown_report: string | null
  recommendation: string | null
}

interface ValidationResult {
  run: ValidationRun
  queries: ValidationQuery[]
  candidates: ValidationCandidate[]
  reports: ValidationReport[]
  investmentSignals?: InvestmentSignal[]
  investmentSummary?: InvestmentSummary
  note: string
  sourcesUsed?: string[]
  sourceStatuses?: SourceStatus[]
  connectorErrors?: string[]
  warnings?: string[]
}

interface SourceStatus {
  source_type: string
  attempted: boolean
  success: boolean
  result_count: number
  error_message: string | null
}

interface InvestmentSignal {
  id?: string
  source_platform: string | null
  source_category: string | null
  startup_name: string | null
  source_url: string | null
  title: string | null
  snippet: string | null
  similarity_score: number | null
  investment_signal_score: number | null
  innovation_penalty: number | null
  source_confidence: number | null
  provider?: string | null
  display_name?: string | null
  domain?: string | null
  result_kind?: string | null
  relevance_level?: string | null
  evidence_strength?: string | null
  is_actual_investment_signal?: boolean | null
  is_specific_startup_or_product?: boolean | null
  matched_problem?: string[] | null
  matched_audience?: string[] | null
  matched_solution?: string[] | null
  matched_business_model?: string[] | null
  matched_differentiators?: string[] | null
  similarity_reason?: string | null
  novelty_impact_reason?: string | null
}

interface InvestmentSummary {
  sourcesConsulted: string[]
  signalCount: number
  highestInvestmentSignalScore: number
  innovationPenaltyApplied: number
  strongestSource: string | null
  webSearchProvider?: string | null
  queriesExecuted?: number
  maxQueries?: number
  resultsCollected?: number
  requestBudgetUsed?: string
  strongCount?: number
  mediumCount?: number
  weakCount?: number
  domainsFound?: string[]
  platformsFound?: string[]
}

const defaultForm: ValidationForm = {
  ideaName: "",
  shortDescription: "",
  problem: "",
  targetAudience: "",
  proposedSolution: "",
  declaredDifferentiators: "",
  businessModel: "",
  marketRegion: "Brasil",
  knownCompetitors: "",
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function renderMarkdown(markdown: string) {
  return markdown.split("\n").map((line, index) => {
    if (line.startsWith("# ")) {
      return <h2 key={index} className="mt-4 text-xl font-bold text-foreground">{line.replace("# ", "")}</h2>
    }

    if (line.startsWith("## ")) {
      return <h3 key={index} className="mt-4 text-lg font-semibold text-foreground">{line.replace("## ", "")}</h3>
    }

    if (line.startsWith("- ")) {
      return <li key={index} className="ml-5 list-disc text-sm text-muted-foreground">{line.replace("- ", "")}</li>
    }

    if (!line.trim()) {
      return <div key={index} className="h-2" />
    }

    return <p key={index} className="text-sm leading-relaxed text-muted-foreground">{line}</p>
  })
}

function sourceLabel(sourceType: string | null | undefined) {
  const labels: Record<string, string> = {
    web: "Web",
    github: "GitHub",
    hacker_news: "Hacker News",
    wikipedia: "Wikipedia",
    openalex: "OpenAlex",
    investment_signals: "Sinais de investimento",
    local_fallback: "Hipóteses locais para investigação",
  }

  return labels[sourceType || ""] || sourceType || "Sem fonte"
}

function sourceStatusLabel(status: SourceStatus) {
  if (status.source_type === "investment_signals" && !status.attempted) {
    return "Não configurada"
  }

  if (status.source_type === "local_fallback") {
    return "Hipóteses locais geradas"
  }

  if (!status.attempted) {
    return "Não configurada"
  }

  if (!status.success) {
    return "Falhou"
  }

  if (status.result_count > 0) {
    return "Consultada com resultados reais"
  }

  return "Consultada, mas sem resultados"
}

function formatScore(value: number | null | undefined) {
  return value === null || value === undefined ? "insuficiente" : value
}

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? 0 : value
}

function isExternalEvidence(candidate: ValidationCandidate) {
  return ["github", "hacker_news", "wikipedia", "openalex", "web"].includes(candidate.source_type || "")
}

function calculateUiMarketThreat(candidate: ValidationCandidate) {
  const sourceWeights: Record<string, number> = {
    web: 1,
    github: 0.9,
    product_hunt: 1,
    g2_capterra: 1,
    hacker_news: 0.5,
    wikipedia: 0.3,
    openalex: 0.2,
    local_fallback: 0,
  }
  const candidateTypeWeights: Record<string, number> = {
    "Concorrente direto": 1,
    "Concorrente indireto": 0.8,
    Substituto: 0.7,
    "Produto digital/SaaS": 0.8,
    "Projeto open-source relacionado": 0.6,
    "Sinal de demanda": 0.4,
    "Referência de mercado": 0.3,
    "Referência científica/técnica": 0.15,
    "Hipótese local": 0,
  }
  const similarity = Number(candidate.similarity_score || 0)
  const sourceWeight = sourceWeights[candidate.source_type || ""] ?? 0.3
  const typeWeight = candidateTypeWeights[candidate.candidate_type || ""] ?? 0.4
  const confidence = candidate.source_type === "local_fallback"
    ? 0
    : Math.max(0, Math.min(1, Number(candidate.source_confidence || sourceWeight)))

  return Math.round(similarity * sourceWeight * typeWeight * confidence)
}

function groupCandidatesBySource(candidates: ValidationCandidate[]) {
  return candidates.reduce<Record<string, ValidationCandidate[]>>((groups, candidate) => {
    const sourceType = candidate.source_type || "unknown"
    return {
      ...groups,
      [sourceType]: [...(groups[sourceType] || []), candidate],
    }
  }, {})
}

export default function ValidarNegocioPage() {
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selectedIdeaId, setSelectedIdeaId] = useState("")
  const [form, setForm] = useState<ValidationForm>(defaultForm)
  const [history, setHistory] = useState<ValidationRun[]>([])
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loadingIdeas, setLoadingIdeas] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [expandedInvestmentRows, setExpandedInvestmentRows] = useState<Record<string, boolean>>({})

  const ownerIdeas = useMemo(() => {
    const normalizedEmail = ownerEmail.trim().toLowerCase()
    return ideas.filter((idea) => idea.email?.toLowerCase() === normalizedEmail)
  }, [ideas, ownerEmail])

  const selectedIdea = ownerIdeas.find((idea) => idea.id === selectedIdeaId)

  const updateForm = (field: keyof ValidationForm, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  const loadIdeas = async () => {
    const normalizedEmail = ownerEmail.trim()

    if (!normalizedEmail) {
      setMessage("Informe o e-mail do responsável.")
      return
    }

    setLoadingIdeas(true)
    setMessage(null)

    try {
      const response = await fetch("/api/ideas")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar projetos.")
      }

      setIdeas(data.data || [])
      setSelectedIdeaId("")
      setHistory([])
      setResult(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao carregar projetos.")
    } finally {
      setLoadingIdeas(false)
    }
  }

  const loadHistory = async (ideaId: string) => {
    setLoadingHistory(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/business-validation?ideaId=${encodeURIComponent(ideaId)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar histórico.")
      }

      setHistory(data.runs || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao carregar histórico.")
    } finally {
      setLoadingHistory(false)
    }
  }

  const selectIdea = (ideaId: string) => {
    const idea = ownerIdeas.find((item) => item.id === ideaId)
    setSelectedIdeaId(ideaId)
    setResult(null)

    if (idea) {
      setForm({
        ideaName: idea.nome_projeto || "",
        shortDescription: idea.ajuda || "",
        problem: idea.problema || "",
        targetAudience: idea.publico || "",
        proposedSolution: "",
        declaredDifferentiators: "",
        businessModel: "",
        marketRegion: "Brasil",
        knownCompetitors: "",
      })
    }

    loadHistory(ideaId)
  }

  const generateValidation = async () => {
    if (!selectedIdeaId) {
      setMessage("Selecione um projeto.")
      return
    }

    setGenerating(true)
    setMessage(null)

    try {
      const response = await fetch("/api/business-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: selectedIdeaId,
          ...form,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao gerar validação.")
      }

      setResult(data)
      await loadHistory(selectedIdeaId)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao gerar validação.")
    } finally {
      setGenerating(false)
    }
  }

  const showHistoryReport = (run: ValidationRun) => {
    setResult({
      run,
      queries: run.queries || [],
      candidates: run.candidates || [],
      reports: run.reports || [],
      sourcesUsed: Array.from(new Set((run.candidates || []).map((candidate) => candidate.source_type || "unknown"))),
      sourceStatuses: run.sourceStatuses || [],
      investmentSignals: run.investmentSignals || [],
      note: "Este MVP usa fontes públicas e uma heurística simples de similaridade. A análise deve ser revisada pela equipe antes de decisões estratégicas.",
    })
  }

  const currentReport = result?.reports?.[0]?.markdown_report || ""
  const groupedCandidates = result ? groupCandidatesBySource(result.candidates) : {}
  const fallbackCandidates = groupedCandidates.local_fallback || []
  const externalCandidateGroups = Object.entries(groupedCandidates).filter(([sourceType]) => sourceType !== "local_fallback")
  const sourceStatuses = result?.sourceStatuses || []
  const investmentSignals = result?.investmentSignals || []
  const investmentStatus = sourceStatuses.find((status) => status.source_type === "investment_signals")
  const investmentSummary = result?.investmentSummary || {
    sourcesConsulted: Array.from(new Set(investmentSignals.map((signal) => signal.source_platform).filter(Boolean))) as string[],
    signalCount: investmentSignals.length,
    highestInvestmentSignalScore: Math.max(0, ...investmentSignals.map((signal) => Number(signal.investment_signal_score || 0))),
    innovationPenaltyApplied: Math.min(35, Math.max(0, ...investmentSignals.map((signal) => Number(signal.innovation_penalty || 0)))),
    strongestSource: investmentSignals[0]?.source_platform || null,
    webSearchProvider: investmentSignals[0]?.provider || (investmentStatus?.attempted ? "configurado" : "not_configured"),
    queriesExecuted: investmentStatus?.attempted ? 0 : undefined,
    maxQueries: undefined,
    resultsCollected: investmentStatus?.result_count || 0,
    requestBudgetUsed: undefined,
    strongCount: investmentSignals.filter((signal) => signal.relevance_level === "forte").length,
    mediumCount: investmentSignals.filter((signal) => signal.relevance_level === "médio").length,
    weakCount: investmentSignals.filter((signal) => !["forte", "médio"].includes(signal.relevance_level || "")).length,
    domainsFound: Array.from(new Set(investmentSignals.map((signal) => signal.domain).filter(Boolean))) as string[],
    platformsFound: Array.from(new Set(investmentSignals.map((signal) => signal.source_platform).filter(Boolean))) as string[],
  }
  const investmentProviderLabel = investmentSummary.webSearchProvider === "tavily"
    ? "Tavily"
    : investmentSummary.webSearchProvider === "google_custom_search"
    ? "Google Custom Search"
    : investmentSummary.webSearchProvider === "serpapi"
    ? "SerpAPI"
    : investmentSummary.webSearchProvider === "brave"
    ? "Brave Search"
    : "Não configurado"
  const hasMeaningfulInvestmentSignals = (investmentSummary.strongCount || 0) + (investmentSummary.mediumCount || 0) > 0

  const toggleInvestmentRow = (key: string) => {
    setExpandedInvestmentRows((currentRows) => ({
      ...currentRows,
      [key]: !currentRows[key],
    }))
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit">Validação MVP</Badge>
            <div>
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">Validação de Negócio</h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Revise concorrentes, substitutos e evidências de mercado antes de transformar a ideia em tarefas.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Selecionar projeto</CardTitle>
            <CardDescription>Use o e-mail do responsável para carregar as ideias cadastradas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="owner-email">E-mail do responsável</Label>
              <Input
                id="owner-email"
                type="email"
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                placeholder="responsavel@email.com"
                className="bg-input"
              />
            </div>
            <Button type="button" onClick={loadIdeas} disabled={loadingIdeas}>
              <Search />
              {loadingIdeas ? "Buscando..." : "Buscar projetos"}
            </Button>
          </CardContent>
        </Card>

        {ownerIdeas.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Projeto</CardTitle>
              <CardDescription>Selecione a ideia que será validada criticamente.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedIdeaId} onValueChange={selectIdea}>
                <SelectTrigger className="w-full bg-input">
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {ownerIdeas.map((idea) => (
                    <SelectItem key={idea.id} value={idea.id}>
                      {idea.nome_projeto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {message && (
          <Card className="border-border bg-card">
            <CardContent className="pt-6 text-sm text-muted-foreground">{message}</CardContent>
          </Card>
        )}

        {selectedIdea && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Dados para validação</CardTitle>
              <CardDescription>
                Este MVP consulta fontes públicas quando disponíveis. Se nenhuma evidência externa for encontrada, ele gera apenas hipóteses locais para orientar investigação manual.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome da ideia</Label>
                  <Input value={form.ideaName} onChange={(event) => updateForm("ideaName", event.target.value)} className="bg-input" />
                </div>
                <div className="space-y-2">
                  <Label>Mercado/região</Label>
                  <Input value={form.marketRegion} onChange={(event) => updateForm("marketRegion", event.target.value)} className="bg-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição curta</Label>
                <Textarea value={form.shortDescription} onChange={(event) => updateForm("shortDescription", event.target.value)} className="min-h-[70px] bg-input" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Problema</Label>
                  <Textarea value={form.problem} onChange={(event) => updateForm("problem", event.target.value)} className="min-h-[100px] bg-input" />
                </div>
                <div className="space-y-2">
                  <Label>Público-alvo</Label>
                  <Textarea value={form.targetAudience} onChange={(event) => updateForm("targetAudience", event.target.value)} className="min-h-[100px] bg-input" />
                </div>
                <div className="space-y-2">
                  <Label>Solução proposta</Label>
                  <Textarea value={form.proposedSolution} onChange={(event) => updateForm("proposedSolution", event.target.value)} className="min-h-[100px] bg-input" />
                </div>
                <div className="space-y-2">
                  <Label>Diferenciais declarados</Label>
                  <Textarea value={form.declaredDifferentiators} onChange={(event) => updateForm("declaredDifferentiators", event.target.value)} className="min-h-[100px] bg-input" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Modelo de negócio</Label>
                  <Input value={form.businessModel} onChange={(event) => updateForm("businessModel", event.target.value)} placeholder="SaaS, marketplace, assinatura, serviços..." className="bg-input" />
                </div>
                <div className="space-y-2">
                  <Label>Concorrentes conhecidos</Label>
                  <Input value={form.knownCompetitors} onChange={(event) => updateForm("knownCompetitors", event.target.value)} placeholder="Separados por vírgula, ponto e vírgula ou linha" className="bg-input" />
                </div>
              </div>
              <Button type="button" onClick={generateValidation} disabled={generating} className="w-fit bg-primary hover:bg-primary/90">
                {generating ? "Gerando..." : "Gerar validação MVP"}
              </Button>
              {generating && (
                <p className="text-sm text-muted-foreground">Buscando evidências reais em bases externas...</p>
              )}
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Resultado</CardTitle>
                <CardDescription>{result.note}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-md border border-border bg-background p-4">
                    <p className="text-xs text-muted-foreground">Score de novidade</p>
                    <p className="mt-1 text-3xl font-semibold text-foreground">{formatScore(result.run.novelty_score)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-4">
                    <p className="text-xs text-muted-foreground">Score de risco</p>
                    <p className="mt-1 text-3xl font-semibold text-accent">{formatScore(result.run.risk_score)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-4">
                    <p className="text-xs text-muted-foreground">Score de diferenciação</p>
                    <p className="mt-1 text-3xl font-semibold text-secondary">{formatScore(result.run.differentiation_score)}</p>
                  </div>
                <div className="rounded-md border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Recomendação final</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{result.run.overall_recommendation}</p>
                </div>
              </div>
                <p className="text-sm text-muted-foreground">
                  Score de novidade considera apenas evidências externas com força de concorrência. Referências acadêmicas ou genéricas ajudam no contexto, mas não reduzem fortemente a novidade.
                </p>
                <div className="rounded-md border border-border bg-background p-4">
                  <p className="text-sm font-medium text-foreground">Status das fontes</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {sourceStatuses.map((status) => (
                      <div key={status.source_type} className="rounded-md border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{sourceLabel(status.source_type)}</span>
                          <Badge variant={status.success && status.result_count > 0 ? "secondary" : "outline"}>
                            {sourceStatusLabel(status)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {status.result_count} resultado(s){status.error_message ? ` · ${status.error_message}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Este MVP usa fontes públicas e uma heurística simples de similaridade. A análise deve ser revisada pela equipe antes de decisões estratégicas.
                  </p>
                  {result.connectorErrors && result.connectorErrors.length > 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Algumas fontes não retornaram dados ou falharam temporariamente.
                    </p>
                  )}
                </div>
                <div className="rounded-md border border-border bg-background p-4">
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Sinais de investimento e captação</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Busca por startups e modelos semelhantes em plataformas de investimento, crowdfunding, aceleradoras, VCs e bases de startups.
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Provider de busca web: {investmentProviderLabel}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {investmentSummary.requestBudgetUsed
                          ? `${investmentSummary.requestBudgetUsed} buscas ${investmentProviderLabel} usadas nesta validação`
                          : "Orçamento de busca não informado para este resultado."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Sinal de mercado</Badge>
                      <Badge variant="outline">Não prova sucesso</Badge>
                      <Badge variant="outline">Reduz novidade se similar</Badge>
                    </div>
                  </div>

                  {investmentStatus && !investmentStatus.attempted ? (
                    <p className="mt-4 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
                      Busca web não configurada. Configure TAVILY_API_KEY, GOOGLE_CUSTOM_SEARCH_API_KEY + GOOGLE_CUSTOM_SEARCH_ENGINE_ID, SERPAPI_KEY ou BRAVE_SEARCH_API_KEY.
                    </p>
                  ) : (
                    <>
                      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Provider</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{investmentProviderLabel}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Buscas usadas</p>
                          <p className="mt-1 text-2xl font-semibold text-foreground">{investmentSummary.requestBudgetUsed || "0/0"}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Resultados coletados</p>
                          <p className="mt-1 text-2xl font-semibold text-foreground">{investmentSummary.resultsCollected || 0}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Sinais fortes</p>
                          <p className="mt-1 text-2xl font-semibold text-accent">{investmentSummary.strongCount || 0}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Sinais médios</p>
                          <p className="mt-1 text-2xl font-semibold text-foreground">{investmentSummary.mediumCount || 0}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Referências fracas</p>
                          <p className="mt-1 text-2xl font-semibold text-muted-foreground">{investmentSummary.weakCount || 0}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Penalidade novidade</p>
                          <p className="mt-1 text-2xl font-semibold text-foreground">{investmentSummary.innovationPenaltyApplied}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Plataformas reconhecidas</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {(investmentSummary.platformsFound || []).slice(0, 3).join(", ") || "Nenhuma"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
                        <p>Domínios encontrados: {(investmentSummary.domainsFound || []).slice(0, 6).join(", ") || "nenhum"}.</p>
                        {!hasMeaningfulInvestmentSignals && investmentSignals.length > 0 && (
                          <p className="mt-2">
                            Não foram encontrados sinais fortes de investimento/captação para soluções altamente similares. Foram encontradas apenas referências genéricas de mercado.
                          </p>
                        )}
                      </div>

                      {investmentSignals.length === 0 ? (
                        <p className="mt-4 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
                          Nenhum sinal de investimento semelhante foi encontrado nas fontes públicas consultadas.
                        </p>
                      ) : (
                        <div className="mt-4 overflow-x-auto">
                          <h3 className="mb-3 font-semibold text-foreground">Resultados encontrados e por que são parecidos</h3>
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="px-3 py-2 text-left text-sm text-muted-foreground">Resultado</th>
                                <th className="px-3 py-2 text-left text-sm text-muted-foreground">Fonte/plataforma</th>
                                <th className="px-3 py-2 text-left text-sm text-muted-foreground">Tipo</th>
                                <th className="px-3 py-2 text-center text-sm text-muted-foreground">Relevância</th>
                                <th className="px-3 py-2 text-center text-sm text-muted-foreground">Similaridade</th>
                                <th className="px-3 py-2 text-center text-sm text-muted-foreground">Sinal de investimento</th>
                                <th className="px-3 py-2 text-left text-sm text-muted-foreground">Impacto na novidade</th>
                                <th className="px-3 py-2 text-left text-sm text-muted-foreground">Por que é parecido?</th>
                                <th className="px-3 py-2 text-center text-sm text-muted-foreground">Link</th>
                              </tr>
                            </thead>
                            <tbody>
                              {investmentSignals.map((signal, index) => {
                                const rowKey = signal.id || `${signal.source_url}-${index}`
                                const matchedGroups = [
                                  ["Problema", signal.matched_problem],
                                  ["Público", signal.matched_audience],
                                  ["Solução", signal.matched_solution],
                                  ["Modelo", signal.matched_business_model],
                                  ["Diferenciais", signal.matched_differentiators],
                                ]

                                return (
                                  <Fragment key={rowKey}>
                                    <tr className="border-b border-border/50 align-top">
                                      <td className="px-3 py-3 text-sm text-foreground">
                                        <p className="font-medium">{signal.display_name || signal.startup_name || signal.title || "Resultado público"}</p>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {signal.is_specific_startup_or_product && <Badge variant="secondary">Startup/produto específico</Badge>}
                                          {signal.is_actual_investment_signal && <Badge variant="secondary">Sinal de investimento</Badge>}
                                          {!signal.is_actual_investment_signal && <Badge variant="outline">Artigo/referência</Badge>}
                                          {signal.relevance_level === "fraco" && <Badge variant="outline">Fraco</Badge>}
                                          {formatNumber(signal.innovation_penalty) > 0 ? (
                                            <Badge variant="outline">Reduz novidade</Badge>
                                          ) : (
                                            <Badge variant="outline">Não reduz novidade</Badge>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 py-3 text-sm text-muted-foreground">
                                        {signal.source_platform || signal.domain || "Fonte pública"}
                                        <p className="mt-1 text-xs">{signal.domain}</p>
                                      </td>
                                      <td className="px-3 py-3 text-sm text-muted-foreground">{signal.result_kind || signal.source_category || "generic_content"}</td>
                                      <td className="px-3 py-3 text-center text-sm text-muted-foreground">{signal.relevance_level || "fraco"}</td>
                                      <td className="px-3 py-3 text-center text-sm text-muted-foreground">{formatNumber(signal.similarity_score)}</td>
                                      <td className="px-3 py-3 text-center text-sm text-muted-foreground">{formatNumber(signal.investment_signal_score)}</td>
                                      <td className="px-3 py-3 text-sm text-muted-foreground">
                                        {signal.novelty_impact_reason || (formatNumber(signal.innovation_penalty) > 0 ? "Reduz novidade." : "Não reduz novidade.")}
                                      </td>
                                      <td className="px-3 py-3 text-sm text-muted-foreground">
                                        <p>{signal.similarity_reason || "Referência genérica; não encontrou correspondência específica suficiente."}</p>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="mt-2"
                                          onClick={() => toggleInvestmentRow(rowKey)}
                                        >
                                          {expandedInvestmentRows[rowKey] ? "Ocultar detalhes" : "Ver detalhes"}
                                        </Button>
                                      </td>
                                      <td className="px-3 py-3 text-center text-sm">
                                        {signal.source_url ? (
                                          <a href={signal.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center text-primary hover:underline">
                                            Abrir
                                            <ExternalLink className="ml-1 h-3 w-3" />
                                          </a>
                                        ) : (
                                          <span className="text-muted-foreground">Sem link</span>
                                        )}
                                      </td>
                                    </tr>
                                    {expandedInvestmentRows[rowKey] && (
                                      <tr className="border-b border-border/50">
                                        <td colSpan={9} className="px-3 py-3">
                                          <div className="grid gap-3 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground md:grid-cols-2">
                                            {matchedGroups.map(([label, values]) => (
                                              <div key={label as string}>
                                                <p className="font-medium text-foreground">{label as string}</p>
                                                <p>{Array.isArray(values) && values.length > 0 ? values.join(", ") : "Sem match específico"}</p>
                                              </div>
                                            ))}
                                            <div className="md:col-span-2">
                                              <p className="font-medium text-foreground">Evidência pública</p>
                                              <p>{signal.snippet || "Sem snippet disponível."}</p>
                                            </div>
                                            <div className="md:col-span-2">
                                              <p className="font-medium text-foreground">Impacto na novidade</p>
                                              <p>{signal.novelty_impact_reason || "Não reduz novidade."}</p>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-8 lg:grid-cols-2">
              <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Queries sugeridas</CardTitle>
                <CardDescription>
                  Queries são termos curtos usados para buscar evidências nas fontes externas. Elas não são resultados; são apenas consultas executadas.
                </CardDescription>
              </CardHeader>
                <CardContent className="space-y-3">
                  {result.queries.map((query, index) => (
                    <div key={`${query.query_text}-${index}`} className="rounded-md border border-border bg-background p-3">
                      <p className="text-sm text-foreground">{query.query_text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{query.query_type} · {query.source_target}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-xl text-foreground">Histórico</CardTitle>
                  <CardDescription>{loadingHistory ? "Carregando..." : "Validações anteriores do projeto"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma validação anterior.</p>
                  ) : history.map((run) => (
                    <div key={run.id} className="rounded-md border border-border bg-background p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{formatDate(run.created_at)}</p>
                          <p className="text-xs text-muted-foreground">
                            {run.overall_recommendation} · novidade {formatScore(run.novelty_score)} · risco {formatScore(run.risk_score)} · diferenciação {formatScore(run.differentiation_score)}
                          </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => showHistoryReport(run)}>
                          Ver relatório
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Mapa inicial de soluções similares</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 overflow-x-auto">
                {externalCandidateGroups.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma evidência externa real foi coletada nesta rodada.</p>
                )}
                {externalCandidateGroups.map(([sourceType, candidates]) => (
                  <div key={sourceType} className="space-y-3">
                    <h3 className="font-semibold text-foreground">{sourceLabel(sourceType)}</h3>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 text-left text-sm text-muted-foreground">Solução/candidato</th>
                          <th className="px-3 py-2 text-left text-sm text-muted-foreground">Tipo</th>
                          <th className="px-3 py-2 text-center text-sm text-muted-foreground">Fonte</th>
                          <th className="px-3 py-2 text-center text-sm text-muted-foreground">Similaridade</th>
                          <th className="px-3 py-2 text-center text-sm text-muted-foreground">Confiança</th>
                          <th className="px-3 py-2 text-center text-sm text-muted-foreground">Ameaça</th>
                          <th className="px-3 py-2 text-center text-sm text-muted-foreground">Risco</th>
                          <th className="px-3 py-2 text-left text-sm text-muted-foreground">Evidência/resumo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((candidate, index) => (
                          <tr key={`${candidate.name}-${sourceType}-${index}`} className="border-b border-border/50">
                            <td className="px-3 py-3 text-sm text-foreground">
                              {candidate.website_url ? (
                                <a href={candidate.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                  {candidate.name}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : candidate.name}
                              <p className="mt-1 text-xs text-muted-foreground">{candidate.description}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant={isExternalEvidence(candidate) ? "secondary" : "outline"}>
                                  {isExternalEvidence(candidate) ? "Evidência externa" : "Não é evidência externa"}
                                </Badge>
                                {candidate.source_type === "openalex" && (
                                  <Badge variant="outline">Referência técnica/contextual — não é concorrente direto</Badge>
                                )}
                              </div>
                              {!isExternalEvidence(candidate) && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Este item é apenas uma hipótese para investigação.
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">{candidate.candidate_type}</td>
                            <td className="px-3 py-3 text-center text-sm text-muted-foreground">{sourceLabel(candidate.source_type)}</td>
                            <td className="px-3 py-3 text-center text-sm text-muted-foreground">{candidate.similarity_score}</td>
                            <td className="px-3 py-3 text-center text-sm text-muted-foreground">{Math.round(Number(candidate.source_confidence || 0) * 100)}%</td>
                            <td className="px-3 py-3 text-center text-sm text-muted-foreground">{calculateUiMarketThreat(candidate)}</td>
                            <td className="px-3 py-3 text-center text-sm text-muted-foreground">{candidate.risk_level}</td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">{candidate.evidence_summary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </CardContent>
            </Card>

            {fallbackCandidates.length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-xl text-foreground">Hipóteses locais geradas porque nenhuma fonte externa retornou evidências suficientes</CardTitle>
                  <CardDescription>
                    Estas hipóteses não vêm da web nem da base de concorrentes. Elas são geradas localmente para orientar a próxima busca.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fallbackCandidates.map((candidate, index) => (
                    <div key={`${candidate.name}-fallback-${index}`} className="rounded-md border border-border bg-background p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Não é evidência externa</Badge>
                        <Badge variant="outline">{candidate.candidate_type}</Badge>
                        <Badge variant="outline">{sourceLabel(candidate.source_type)}</Badge>
                        <Badge variant="outline">Similaridade {candidate.similarity_score}</Badge>
                        <Badge variant="outline">Confiança {Math.round(Number(candidate.source_confidence || 0) * 100)}%</Badge>
                        <Badge variant="outline">Ameaça {calculateUiMarketThreat(candidate)}</Badge>
                      </div>
                      <h3 className="mt-3 font-semibold text-foreground">{candidate.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{candidate.description}</p>
                      <p className="mt-2 text-sm text-muted-foreground">Este item é apenas uma hipótese para investigação.</p>
                      <p className="mt-2 text-xs text-muted-foreground">{candidate.evidence_summary}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Relatório crítico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {currentReport ? renderMarkdown(currentReport) : (
                  <p className="text-sm text-muted-foreground">Relatório indisponível.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}
