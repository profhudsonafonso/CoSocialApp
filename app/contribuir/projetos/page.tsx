"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, GitBranch, RefreshCw } from "lucide-react"
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
  labels: GitHubLabel[] | string[] | null
  html_url: string | null
  status: string
  points_estimate: number
}

interface ClaimResult {
  claim_key: string
  branch_name: string
  issue_number: number
  issue_title: string
  html_url: string | null
}

function getLabelName(label: GitHubLabel | string) {
  return typeof label === "string" ? label : label.name
}

export default function ContribuirProjetosPage() {
  const [collaboratorEmail, setCollaboratorEmail] = useState("")
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selectedIdeaId, setSelectedIdeaId] = useState("")
  const [issues, setIssues] = useState<ProjectIssue[]>([])
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
              </div>
            </CardContent>
          </Card>
        )}

        <section className="grid gap-4">
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

          {!selectedIdeaId && !loadingIdeas && (
            <Card className="border-border bg-card">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Selecione um projeto para ver as issues disponíveis.
              </CardContent>
            </Card>
          )}

          {issues.map((issue) => (
            <Card key={issue.id} className="border-border bg-card">
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">#{issue.issue_number}</Badge>
                      <Badge variant="outline">{issue.status}</Badge>
                      <Badge variant="outline">{issue.points_estimate} pts</Badge>
                    </div>
                    <CardTitle className="text-lg text-foreground">{issue.title}</CardTitle>
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
              <CardContent>
                <Button
                  type="button"
                  onClick={() => handleClaimIssue(issue.id)}
                  disabled={
                    issue.status !== "open" ||
                    !collaboratorEmail.trim() ||
                    claimingIssueId === issue.id
                  }
                  className="bg-primary hover:bg-primary/90"
                >
                  {claimingIssueId === issue.id ? "Pegando..." : "Pegar esta issue"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  )
}
