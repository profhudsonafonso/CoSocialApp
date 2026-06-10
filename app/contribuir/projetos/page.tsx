"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, GitBranch, RefreshCw } from "lucide-react"
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

interface Idea {
  id: string
  nome_projeto: string
  github_owner?: string | null
  github_repo?: string | null
  github_repo_url?: string | null
}

interface GitHubLabel {
  name?: string
}

interface ProjectIssue {
  id: string
  issue_number: number
  title: string
  body: string | null
  labels: GitHubLabel[] | string[] | null
  html_url: string | null
  status: string
  points_estimate: number
  activeWorkers: number
  submittedCount: number
  acceptedCount: number
  rejectedCount: number
  isFinalized: boolean
}

interface ClaimResult {
  assignment_id: string
  project_issue_id: string
  claim_key: string
  branch_name: string
  issue_number: number
  issue_title: string
  html_url: string | null
  activeWorkers: number
}

type IssueFilter = "all" | "empty" | "active" | "submitted" | "finalized"

function getLabelName(label: GitHubLabel | string) {
  return typeof label === "string" ? label : label.name
}

function count(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function getIssueOpportunityLabel(issue: ProjectIssue) {
  const activeWorkers = count(issue.activeWorkers)
  const submittedCount = count(issue.submittedCount)
  const acceptedCount = count(issue.acceptedCount)

  if (issue.isFinalized) {
    return "Finalizada"
  }

  if (acceptedCount > 0) {
    return "Já existe entrega aceita, mas a issue ainda está aberta"
  }

  if (submittedCount > 0) {
    return "Competitiva: já existem entregas em análise"
  }

  if (activeWorkers > 0) {
    return "Em andamento: já há pessoas trabalhando"
  }

  return "Boa oportunidade: ninguém começou ainda"
}

function getIssueSortPriority(issue: ProjectIssue) {
  if (issue.isFinalized) {
    return 4
  }

  if (count(issue.submittedCount) > 0 || count(issue.acceptedCount) > 0 || count(issue.rejectedCount) > 0) {
    return 3
  }

  if (count(issue.activeWorkers) > 0) {
    return 2
  }

  return 1
}

export default function ContribuirProjetosPage() {
  const [collaboratorEmail, setCollaboratorEmail] = useState("")
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selectedIdeaId, setSelectedIdeaId] = useState("")
  const [issues, setIssues] = useState<ProjectIssue[]>([])
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("all")
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null)
  const [loadingIdeas, setLoadingIdeas] = useState(true)
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [claimingIssueId, setClaimingIssueId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const githubIdeas = useMemo(
    () => ideas.filter((idea) => idea.github_owner && idea.github_repo),
    [ideas],
  )

  const selectedIdea = githubIdeas.find((idea) => idea.id === selectedIdeaId)
  const sortedIssues = useMemo(
    () => [...issues].sort((a, b) => {
      const priorityDiff = getIssueSortPriority(a) - getIssueSortPriority(b)
      return priorityDiff || a.issue_number - b.issue_number
    }),
    [issues],
  )
  const visibleIssues = useMemo(
    () => sortedIssues.filter((issue) => {
      if (issueFilter === "empty") {
        return !issue.isFinalized && count(issue.activeWorkers) === 0 && count(issue.submittedCount) === 0
      }

      if (issueFilter === "active") {
        return !issue.isFinalized && count(issue.activeWorkers) > 0 && count(issue.submittedCount) === 0
      }

      if (issueFilter === "submitted") {
        return !issue.isFinalized && count(issue.submittedCount) > 0
      }

      if (issueFilter === "finalized") {
        return issue.isFinalized
      }

      return true
    }),
    [issueFilter, sortedIssues],
  )

  const loadIssues = async (ideaId: string) => {
    setLoadingIssues(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/github/issues?ideaId=${encodeURIComponent(ideaId)}`)
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
    if (!selectedIdeaId) {
      setIssues([])
      return
    }

    loadIssues(selectedIdeaId)
  }, [selectedIdeaId])

  const handleSyncIssues = async () => {
    if (!selectedIdeaId) {
      return
    }

    setSyncing(true)
    setClaimResult(null)
    setMessage(null)

    try {
      const response = await fetch("/api/github/sync-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: selectedIdeaId }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao sincronizar issues.")
      }

      setMessage(`${result.data?.length || 0} issue(s) sincronizada(s).`)
      await loadIssues(selectedIdeaId)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao sincronizar issues.")
    } finally {
      setSyncing(false)
    }
  }

  const handleClaimIssue = async (projectIssueId: string) => {
    setClaimingIssueId(projectIssueId)
    setClaimResult(null)
    setMessage(null)

    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collaboratorEmail, projectIssueId }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao pegar issue.")
      }

      setClaimResult(result.data)

      if (selectedIdeaId) {
        await loadIssues(selectedIdeaId)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao pegar issue.")
    } finally {
      setClaimingIssueId(null)
    }
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit">
              ColabSocial
            </Badge>
            <div>
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">Projetos para contribuir</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Escolha um projeto conectado ao GitHub, sincronize as issues abertas e pegue uma tarefa.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Encontrar issues</CardTitle>
            <CardDescription>Use o e-mail cadastrado como colaborador.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="collaborator-email">E-mail do colaborador</Label>
              <Input
                id="collaborator-email"
                type="email"
                value={collaboratorEmail}
                onChange={(event) => setCollaboratorEmail(event.target.value)}
                placeholder="seu@email.com"
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={selectedIdeaId} onValueChange={setSelectedIdeaId} disabled={loadingIdeas}>
                <SelectTrigger className="w-full bg-input">
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

            <Button
              type="button"
              onClick={handleSyncIssues}
              disabled={!selectedIdeaId || syncing}
              className="bg-primary hover:bg-primary/90"
            >
              <RefreshCw className={syncing ? "animate-spin" : ""} />
              {syncing ? "Sincronizando..." : "Sincronizar issues do GitHub"}
            </Button>
          </CardContent>
        </Card>

        {selectedIdea && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <GitBranch className="h-4 w-4 text-primary" />
            <span>{selectedIdea.github_owner}/{selectedIdea.github_repo}</span>
            {selectedIdea.github_repo_url && (
              <a
                href={selectedIdea.github_repo_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}

        {message && (
          <Card className="border-border bg-card">
            <CardContent className="pt-6 text-sm text-muted-foreground">{message}</CardContent>
          </Card>
        )}

        {claimResult && (
          <Card className="border-primary/30 bg-card">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Issue reservada</CardTitle>
              <CardDescription>{claimResult.issue_title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-sm">
                <div className="grid gap-2 rounded-md border border-border bg-background p-3">
                  <div>
                    <span className="font-medium text-foreground">Claim key: </span>
                    <code className="text-muted-foreground">{claimResult.claim_key}</code>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Branch: </span>
                    <code className="text-muted-foreground">{claimResult.branch_name}</code>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  {claimResult.activeWorkers} pessoa(s) já trabalhando nesta issue.
                </p>
                <p className="rounded-md border border-accent/30 bg-accent/10 p-3 text-muted-foreground">
                  Outros colaboradores também podem trabalhar nesta issue. A pontuação depende da revisão e aceite do responsável pelo projeto.
                </p>
                <div>
                  <p className="font-medium text-foreground">1. Create branch:</p>
                  <code className="mt-1 block rounded-md bg-muted p-3 text-muted-foreground">
                    git checkout -b {claimResult.branch_name}
                  </code>
                </div>
                <div>
                  <p className="font-medium text-foreground">2. Commit with key:</p>
                  <code className="mt-1 block rounded-md bg-muted p-3 text-muted-foreground">
                    git commit -m &quot;COSOCIAL:{claimResult.claim_key} fix issue #{claimResult.issue_number}&quot;
                  </code>
                </div>
                <div>
                  <p className="font-medium text-foreground">3. Push and open a Pull Request on GitHub.</p>
                </div>
                <div>
                  <Button variant="outline" asChild>
                    <a
                      href={`/colabai?ideaId=${selectedIdeaId}&issueId=${claimResult.project_issue_id}&assignmentId=${claimResult.assignment_id}&action=issue_explain`}
                    >
                      Usar ColabAI nesta issue
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="grid gap-4">
          {selectedIdeaId && (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-foreground">Filtrar issues</p>
                  <p className="text-sm text-muted-foreground">As issues mais abertas aparecem primeiro.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["all", "Todas"],
                    ["empty", "Sem ninguém trabalhando"],
                    ["active", "Em andamento"],
                    ["submitted", "Com entregas enviadas"],
                    ["finalized", "Finalizadas"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant={issueFilter === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIssueFilter(value as IssueFilter)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {loadingIssues && (
            <Card className="border-border bg-card">
              <CardContent className="pt-6 text-sm text-muted-foreground">Carregando issues...</CardContent>
            </Card>
          )}

          {!loadingIssues && selectedIdeaId && issues.length === 0 && (
            <Card className="border-border bg-card">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Nenhuma issue sincronizada para este projeto.
              </CardContent>
            </Card>
          )}

          {!loadingIssues && selectedIdeaId && issues.length > 0 && visibleIssues.length === 0 && (
            <Card className="border-border bg-card">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Nenhuma issue encontrada para este filtro.
              </CardContent>
            </Card>
          )}

          {!selectedIdeaId && !loadingIdeas && (
            <Card className="border-border bg-card">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Selecione um projeto para ver as issues disponíveis.
              </CardContent>
            </Card>
          )}

          {visibleIssues.map((issue) => (
            <Card key={issue.id} className="border-border bg-card">
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">#{issue.issue_number}</Badge>
                      <Badge variant="outline">{issue.status}</Badge>
                      <Badge variant="outline">{issue.points_estimate} pts</Badge>
                      <Badge variant="outline">{getIssueOpportunityLabel(issue)}</Badge>
                    </div>
                    <CardTitle className="text-lg text-foreground">{issue.title}</CardTitle>
                    {issue.body && (
                      <CardDescription className="line-clamp-2">
                        {issue.body}
                      </CardDescription>
                    )}
                  </div>
                  {issue.html_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={issue.html_url} target="_blank" rel="noreferrer">
                        GitHub
                        <ExternalLink />
                      </a>
                    </Button>
                  )}
                </div>
                {issue.labels && issue.labels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {issue.labels.map((label, index) => {
                      const labelName = getLabelName(label)

                      return labelName ? (
                        <Badge key={`${issue.id}-${labelName}-${index}`} variant="outline">
                          {labelName}
                        </Badge>
                      ) : null
                    })}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Pessoas trabalhando agora</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{count(issue.activeWorkers)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Entregas enviadas</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{count(issue.submittedCount)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Entregas aceitas</p>
                    <p className="mt-1 text-2xl font-semibold text-secondary">{count(issue.acceptedCount)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Entregas rejeitadas</p>
                    <p className="mt-1 text-2xl font-semibold text-muted-foreground">{count(issue.rejectedCount)}</p>
                  </div>
                </div>

                {issue.isFinalized ? (
                  <p className="text-sm text-muted-foreground">Esta issue foi finalizada pelo responsável.</p>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handleClaimIssue(issue.id)}
                    disabled={!collaboratorEmail.trim() || claimingIssueId === issue.id}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {claimingIssueId === issue.id ? "Pegando..." : "Pegar esta issue"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  )
}
