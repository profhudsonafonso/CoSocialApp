"use client"

import { useMemo, useState } from "react"
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
  note: string
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
      note: "Este MVP gerou uma análise inicial e queries sugeridas. A busca web automática será adicionada em uma próxima etapa.",
    })
  }

  const currentReport = result?.reports?.[0]?.markdown_report || ""

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
                Este MVP gera análise local e queries sugeridas. Ele ainda não executa busca web automática.
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
              <CardContent className="grid gap-4 md:grid-cols-4">
                <div className="rounded-md border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Score de novidade</p>
                  <p className="mt-1 text-3xl font-semibold text-foreground">{result.run.novelty_score}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Score de risco</p>
                  <p className="mt-1 text-3xl font-semibold text-accent">{result.run.risk_score}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Score de diferenciação</p>
                  <p className="mt-1 text-3xl font-semibold text-secondary">{result.run.differentiation_score}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Recomendação final</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{result.run.overall_recommendation}</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-8 lg:grid-cols-2">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-xl text-foreground">Queries sugeridas</CardTitle>
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
                            {run.overall_recommendation} · novidade {run.novelty_score} · risco {run.risk_score} · diferenciação {run.differentiation_score}
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
              <CardContent className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left text-sm text-muted-foreground">Solução/candidato</th>
                      <th className="px-3 py-2 text-left text-sm text-muted-foreground">Tipo</th>
                      <th className="px-3 py-2 text-center text-sm text-muted-foreground">Similaridade</th>
                      <th className="px-3 py-2 text-center text-sm text-muted-foreground">Risco</th>
                      <th className="px-3 py-2 text-left text-sm text-muted-foreground">Evidência/resumo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.candidates.map((candidate, index) => (
                      <tr key={`${candidate.name}-${index}`} className="border-b border-border/50">
                        <td className="px-3 py-3 text-sm text-foreground">
                          {candidate.website_url ? (
                            <a href={candidate.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              {candidate.name}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : candidate.name}
                          <p className="mt-1 text-xs text-muted-foreground">{candidate.description}</p>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">{candidate.candidate_type}</td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">{candidate.similarity_score}</td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">{candidate.risk_level}</td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">{candidate.evidence_summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

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
