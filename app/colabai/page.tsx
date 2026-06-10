"use client"

import { useEffect, useMemo, useState } from "react"
import { BrainCircuit, Copy, RefreshCw, Sparkles } from "lucide-react"
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

type ActionKey =
  | "issue_explain"
  | "technical_plan"
  | "implementation_checklist"
  | "generate_prompt_pack"
  | "review_submission"
  | "validate_delivery"

interface Idea {
  id: string
  nome_projeto: string
  github_owner?: string | null
  github_repo?: string | null
}

interface ProjectIssue {
  id: string
  issue_number: number
  title: string
  status: string
  points_estimate: number
}

interface Assignment {
  id: string
  status: string | null
  branch_name: string
  collaborator_name: string
  collaborator_email: string
}

interface CreditAccount {
  monthly_credits: number
  used_credits: number
  remaining_credits: number
}

interface UsageEvent {
  id: string
  feature_name: string
  provider: string
  model: string
  credits_charged: number
  status: string
  created_at: string | null
}

const actions: Array<{ value: ActionKey; label: string; cost: number }> = [
  { value: "issue_explain", label: "Explicar tarefa", cost: 1 },
  { value: "technical_plan", label: "Gerar plano técnico", cost: 2 },
  { value: "implementation_checklist", label: "Gerar checklist de implementação", cost: 2 },
  { value: "generate_prompt_pack", label: "Gerar Prompt Pack para IDE", cost: 3 },
  { value: "review_submission", label: "Revisar entrega", cost: 3 },
  { value: "validate_delivery", label: "Validar se a entrega atende à issue", cost: 3 },
]

function formatDate(value?: string | null) {
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

export default function ColabAiPage() {
  const [userEmail, setUserEmail] = useState("")
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [issues, setIssues] = useState<ProjectIssue[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedIdeaId, setSelectedIdeaId] = useState("")
  const [selectedIssueId, setSelectedIssueId] = useState("")
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("none")
  const [selectedAction, setSelectedAction] = useState<ActionKey>("issue_explain")
  const [credits, setCredits] = useState<CreditAccount | null>(null)
  const [recentUsage, setRecentUsage] = useState<UsageEvent[]>([])
  const [markdown, setMarkdown] = useState("")
  const [providerInfo, setProviderInfo] = useState("")
  const [running, setRunning] = useState(false)
  const [loadingIdeas, setLoadingIdeas] = useState(true)
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [loadingCredits, setLoadingCredits] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const selectedActionMeta = actions.find((action) => action.value === selectedAction) || actions[0]
  const githubIdeas = useMemo(() => ideas.filter((idea) => idea.github_owner && idea.github_repo), [ideas])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ideaId = params.get("ideaId")
    const issueId = params.get("issueId")
    const assignmentId = params.get("assignmentId")
    const action = params.get("action")

    if (ideaId) setSelectedIdeaId(ideaId)
    if (issueId) setSelectedIssueId(issueId)
    if (assignmentId) setSelectedAssignmentId(assignmentId)
    if (action && actions.some((item) => item.value === action)) {
      setSelectedAction(action as ActionKey)
    }
  }, [])

  useEffect(() => {
    async function loadIdeas() {
      try {
        const response = await fetch("/api/ideas")
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.error || "Erro ao carregar projetos.")
        }

        setIdeas(result.data || [])
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Erro desconhecido ao carregar projetos.")
      } finally {
        setLoadingIdeas(false)
      }
    }

    loadIdeas()
  }, [])

  useEffect(() => {
    async function loadIssues() {
      if (!selectedIdeaId) {
        setIssues([])
        return
      }

      setLoadingIssues(true)
      setMessage(null)

      try {
        const response = await fetch(`/api/github/issues?ideaId=${encodeURIComponent(selectedIdeaId)}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.error || "Erro ao carregar issues.")
        }

        setIssues(result.data || [])
      } catch (error) {
        setIssues([])
        setMessage(error instanceof Error ? error.message : "Erro desconhecido ao carregar issues.")
      } finally {
        setLoadingIssues(false)
      }
    }

    loadIssues()
  }, [selectedIdeaId])

  useEffect(() => {
    async function loadAssignments() {
      if (!selectedIssueId) {
        setAssignments([])
        setSelectedAssignmentId("none")
        return
      }

      try {
        const response = await fetch(`/api/ai/assignments?projectIssueId=${encodeURIComponent(selectedIssueId)}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.error || "Erro ao carregar assignments.")
        }

        setAssignments(result.data || [])
      } catch (error) {
        setAssignments([])
        setMessage(error instanceof Error ? error.message : "Erro desconhecido ao carregar assignments.")
      }
    }

    loadAssignments()
  }, [selectedIssueId])

  const loadCredits = async () => {
    const normalizedEmail = userEmail.trim()

    if (!normalizedEmail) {
      setMessage("Informe seu e-mail para carregar créditos.")
      return
    }

    setLoadingCredits(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/ai/credits?userEmail=${encodeURIComponent(normalizedEmail)}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao carregar créditos.")
      }

      setCredits(result.account)
      setRecentUsage(result.recentUsage || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao carregar créditos.")
    } finally {
      setLoadingCredits(false)
    }
  }

  const runAction = async () => {
    if (!userEmail.trim() || !selectedIdeaId || !selectedIssueId) {
      setMessage("Informe e-mail, projeto e issue antes de executar.")
      return
    }

    setRunning(true)
    setMessage(null)
    setMarkdown("")
    setProviderInfo("")

    try {
      const response = await fetch("/api/ai/colabai-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          ideaId: selectedIdeaId,
          projectIssueId: selectedIssueId,
          assignmentId: selectedAssignmentId === "none" ? undefined : selectedAssignmentId,
          action: selectedAction,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao executar ColabAI.")
      }

      setMarkdown(result.markdown || "")
      setProviderInfo(`${result.provider}/${result.model} · ${result.creditsCharged} crédito(s) · ${result.remainingCredits} restante(s)`)
      await loadCredits()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao executar ColabAI.")
    } finally {
      setRunning(false)
    }
  }

  const copyResponse = async () => {
    if (!markdown) {
      return
    }

    await navigator.clipboard.writeText(markdown)
    setMessage("Resposta copiada.")
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit">
              MVP experimental
            </Badge>
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground md:text-4xl">
                <BrainCircuit className="h-8 w-8 text-primary" />
                ColabAI Assist
              </h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Use IA para entender tarefas, gerar planos técnicos, criar prompts para IDE e revisar entregas.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card className="border-primary/30 bg-card">
          <CardContent className="grid gap-3 pt-6 text-sm text-muted-foreground">
            <p>Este MVP usa créditos internos e chama IA apenas pelo backend. Se nenhuma API estiver configurada, ele usa resposta local de demonstração.</p>
            <p className="rounded-md border border-accent/30 bg-accent/10 p-3">
              Não envie segredos, tokens, senhas ou dados sensíveis no conteúdo das tarefas.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Configurar ação</CardTitle>
              <CardDescription>Escolha o projeto, issue e tipo de ajuda que você precisa.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="user-email">E-mail</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={userEmail}
                    onChange={(event) => setUserEmail(event.target.value)}
                    placeholder="seu@email.com"
                    className="bg-input"
                  />
                </div>
                <Button type="button" variant="outline" onClick={loadCredits} disabled={loadingCredits}>
                  <RefreshCw className={loadingCredits ? "animate-spin" : ""} />
                  Atualizar créditos
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Projeto</Label>
                  <Select value={selectedIdeaId} onValueChange={setSelectedIdeaId} disabled={loadingIdeas}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder={loadingIdeas ? "Carregando..." : "Selecione um projeto"} />
                    </SelectTrigger>
                    <SelectContent>
                      {githubIdeas.map((idea) => (
                        <SelectItem key={idea.id} value={idea.id}>
                          {idea.nome_projeto}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Issue GitHub</Label>
                  <Select value={selectedIssueId} onValueChange={setSelectedIssueId} disabled={!selectedIdeaId || loadingIssues}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder={loadingIssues ? "Carregando..." : "Selecione uma issue"} />
                    </SelectTrigger>
                    <SelectContent>
                      {issues.map((issue) => (
                        <SelectItem key={issue.id} value={issue.id}>
                          #{issue.issue_number} {issue.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Assignment/submissão</Label>
                  <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId} disabled={!selectedIssueId}>
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem assignment específico</SelectItem>
                      {assignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id}>
                          {assignment.status || "claimed"} · {assignment.collaborator_name || assignment.collaborator_email || assignment.branch_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ação</Label>
                  <Select value={selectedAction} onValueChange={(value) => setSelectedAction(value as ActionKey)}>
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actions.map((action) => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label} · {action.cost} crédito(s)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Custo desta ação: {selectedActionMeta.cost} crédito(s).
                </p>
                <Button type="button" onClick={runAction} disabled={running} className="bg-primary hover:bg-primary/90">
                  <Sparkles className={running ? "animate-pulse" : ""} />
                  {running ? "Executando..." : "Executar ação"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Créditos</CardTitle>
              <CardDescription>Controle mensal do ColabAI Assist Lite.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {credits ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Mensal</p>
                    <p className="text-2xl font-semibold text-foreground">{credits.monthly_credits}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Usados</p>
                    <p className="text-2xl font-semibold text-foreground">{credits.used_credits}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Restantes</p>
                    <p className="text-2xl font-semibold text-accent">{credits.remaining_credits}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Informe seu e-mail e atualize para ver créditos.</p>
              )}

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Uso recente</p>
                {recentUsage.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum uso recente.</p>
                ) : (
                  recentUsage.map((usage) => (
                    <div key={usage.id} className="rounded-md border border-border bg-background p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-foreground">{usage.feature_name}</span>
                        <Badge variant="outline">{usage.credits_charged} cr</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(usage.created_at)} · {usage.provider}/{usage.model} · {usage.status}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {message && (
          <Card className="border-border bg-card">
            <CardContent className="pt-6 text-sm text-muted-foreground">{message}</CardContent>
          </Card>
        )}

        <Card className="border-border bg-card">
          <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-xl text-foreground">Resposta</CardTitle>
              <CardDescription>{providerInfo || "A resposta aparecerá aqui após executar uma ação."}</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={copyResponse} disabled={!markdown}>
              <Copy />
              {selectedAction === "generate_prompt_pack" ? "Copiar Prompt Pack para IDE" : "Copiar resposta"}
            </Button>
          </CardHeader>
          <CardContent>
            {markdown ? (
              <pre className="max-h-[620px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm leading-6 text-foreground">
                {markdown}
              </pre>
            ) : (
              <Textarea
                value="Selecione uma ação e execute o ColabAI Assist."
                readOnly
                className="min-h-[160px] bg-input text-muted-foreground"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
