"use client"

import { useMemo, useState } from "react"
import { ExternalLink, Search } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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

type Decision = "accepted" | "rejected" | "finalized"
type ReviewStatusFilter = "submitted" | "accepted" | "rejected" | "all"

interface ReviewAssignment {
  assignment_id: string
  collaborator_name: string
  collaborator_email: string
  claim_key: string
  branch_name: string
  status: string
  evidence_url: string | null
  accepted_points: number | null
  review_comment: string | null
  pull_request_number: number | null
  pull_request_url: string | null
  merged_at: string | null
  created_at: string | null
  updated_at: string | null
}

interface ReviewIssueGroup {
  issue_id: string
  issue_number: number
  issue_title: string
  github_issue_url: string | null
  project_title: string
  idea_id: string | null
  current_issue_status: string
  points_estimate: number
  finalized_at: string | null
  activeWorkers: number
  submittedCount: number
  acceptedCount: number
  rejectedCount: number
  assignments: ReviewAssignment[]
}

export default function ResponsavelRevisarPage() {
  const [ownerEmail, setOwnerEmail] = useState("")
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("submitted")
  const [projectFilter, setProjectFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [reviewGroups, setReviewGroups] = useState<ReviewIssueGroup[]>([])
  const [pointsByAssignment, setPointsByAssignment] = useState<Record<string, string>>({})
  const [commentsByAssignment, setCommentsByAssignment] = useState<Record<string, string>>({})
  const [pullRequestByAssignment, setPullRequestByAssignment] = useState<Record<string, string>>({})
  const [mergePrByAssignment, setMergePrByAssignment] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [decidingAssignmentId, setDecidingAssignmentId] = useState<string | null>(null)
  const [finalizingIssueId, setFinalizingIssueId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const projectNames = useMemo(
    () => Array.from(new Set(reviewGroups.map((group) => group.project_title).filter(Boolean))),
    [reviewGroups],
  )

  const visibleGroups = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return reviewGroups.filter((group) => {
      const matchesProject = projectFilter === "all" || group.project_title === projectFilter
      const matchesSearch = !normalizedSearch ||
        group.issue_title.toLowerCase().includes(normalizedSearch) ||
        String(group.issue_number).includes(normalizedSearch)

      return matchesProject && matchesSearch
    })
  }, [projectFilter, reviewGroups, searchQuery])

  const loadReviews = async () => {
    const normalizedEmail = ownerEmail.trim()

    if (!normalizedEmail) {
      setMessage("Informe o e-mail do responsável.")
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(
        `/api/reviews?ownerEmail=${encodeURIComponent(normalizedEmail)}&status=${statusFilter}`,
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao carregar revisões.")
      }

      const nextGroups: ReviewIssueGroup[] = result.data || []
      const nextAssignments = nextGroups.flatMap((group) => group.assignments.map((assignment) => ({
        ...assignment,
        pointsEstimate: group.points_estimate,
      })))

      setReviewGroups(nextGroups)
      setPointsByAssignment(
        Object.fromEntries(
          nextAssignments.map((assignment) => [
            assignment.assignment_id,
            String(assignment.accepted_points || assignment.pointsEstimate || 10),
          ]),
        ),
      )
      setCommentsByAssignment(
        Object.fromEntries(
          nextAssignments.map((assignment) => [
            assignment.assignment_id,
            assignment.review_comment || "",
          ]),
        ),
      )
      setPullRequestByAssignment(
        Object.fromEntries(
          nextAssignments.map((assignment) => [
            assignment.assignment_id,
            assignment.pull_request_url || (assignment.pull_request_number ? String(assignment.pull_request_number) : ""),
          ]),
        ),
      )
      setMergePrByAssignment(
        Object.fromEntries(nextAssignments.map((assignment) => [assignment.assignment_id, false])),
      )
      setMessage(nextGroups.length ? null : "Nenhuma submissão encontrada para este filtro.")
    } catch (error) {
      setReviewGroups([])
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao carregar revisões.")
    } finally {
      setLoading(false)
    }
  }

  const submitDecision = async (assignment: ReviewAssignment, decision: Decision) => {
    setDecidingAssignmentId(assignment.assignment_id)
    setMessage(null)

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: assignment.assignment_id,
          ownerEmail,
          decision,
          points: decision === "accepted" ? Number(pointsByAssignment[assignment.assignment_id]) : undefined,
          reviewComment: commentsByAssignment[assignment.assignment_id] || undefined,
          mergePr: decision === "accepted" ? Boolean(mergePrByAssignment[assignment.assignment_id]) : false,
          pullRequestUrl: pullRequestByAssignment[assignment.assignment_id] || undefined,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao revisar submissão.")
      }

      setMessage(
        result?.warning
          ? result.warning
          : decision === "accepted"
          ? "Entrega aceita e colaborador pontuado. Finalizar a issue encerra novas contribuições para esta tarefa."
          : "Entrega rejeitada.",
      )
      await loadReviews()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao revisar submissão.")
    } finally {
      setDecidingAssignmentId(null)
    }
  }

  const finalizeIssue = async (group: ReviewIssueGroup, assignmentId?: string) => {
    setFinalizingIssueId(group.issue_id)
    setMessage(null)

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: group.issue_id,
          assignmentId,
          ownerEmail,
          decision: "finalized",
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao finalizar issue.")
      }

      setMessage("Issue finalizada. Novas contribuições para esta tarefa foram encerradas.")
      await loadReviews()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao finalizar issue.")
    } finally {
      setFinalizingIssueId(null)
    }
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit">
              Responsável
            </Badge>
            <div>
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">Revisar contribuições</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Aceitar uma entrega pontua o colaborador. Finalizar a issue encerra novas contribuições para esta tarefa.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Buscar projetos</CardTitle>
            <CardDescription>Use o mesmo e-mail informado no cadastro da ideia.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1fr_180px_180px_auto] lg:items-end">
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
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ReviewStatusFilter)}>
                <SelectTrigger className="w-full bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {projectNames.map((projectName) => (
                    <SelectItem key={projectName} value={projectName}>
                      {projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={loadReviews} disabled={loading}>
              <Search />
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="issue-search">Buscar por issue</Label>
          <Input
            id="issue-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Título ou número da issue"
            className="bg-input"
          />
        </div>

        {message && (
          <Card className="border-border bg-card">
            <CardContent className="pt-6 text-sm text-muted-foreground">{message}</CardContent>
          </Card>
        )}

        <section className="grid gap-4">
          {visibleGroups.map((group) => (
            <Card key={group.issue_id} className="border-border bg-card">
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{group.project_title}</Badge>
                      <Badge variant="outline">#{group.issue_number}</Badge>
                      <Badge variant="outline">{group.current_issue_status}</Badge>
                      {group.finalized_at && <Badge variant="outline">Finalizada</Badge>}
                    </div>
                    <CardTitle className="text-lg text-foreground">{group.issue_title}</CardTitle>
                    <CardDescription>
                      {group.activeWorkers} pessoa(s) trabalhando · {group.submittedCount} submitted · {group.acceptedCount} accepted · {group.rejectedCount} rejected
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.github_issue_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={group.github_issue_url} target="_blank" rel="noreferrer">
                          GitHub
                          <ExternalLink />
                        </a>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => finalizeIssue(group)}
                      disabled={Boolean(group.finalized_at) || finalizingIssueId === group.issue_id}
                    >
                      Finalizar issue
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                {group.assignments.map((assignment) => (
                  <div key={assignment.assignment_id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{assignment.status}</Badge>
                          <Badge variant="outline">{assignment.claim_key}</Badge>
                        </div>
                        <p className="mt-2 font-medium text-foreground">
                          {assignment.collaborator_name || "Colaborador"} · {assignment.collaborator_email}
                        </p>
                        <p className="text-sm text-muted-foreground">{assignment.branch_name}</p>
                        {assignment.review_comment && (
                          <p className="mt-2 text-sm text-muted-foreground">{assignment.review_comment}</p>
                        )}
                      </div>
                      {assignment.evidence_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={assignment.evidence_url} target="_blank" rel="noreferrer">
                            Evidência
                            <ExternalLink />
                          </a>
                        </Button>
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr]">
                      <div className="space-y-2">
                        <Label htmlFor={`points-${assignment.assignment_id}`}>Pontos</Label>
                        <Input
                          id={`points-${assignment.assignment_id}`}
                          type="number"
                          min="1"
                          value={pointsByAssignment[assignment.assignment_id] || String(group.points_estimate || 10)}
                          onChange={(event) =>
                            setPointsByAssignment((currentPoints) => ({
                              ...currentPoints,
                              [assignment.assignment_id]: event.target.value,
                            }))
                          }
                          className="bg-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`comment-${assignment.assignment_id}`}>Comentário da revisão</Label>
                        <Textarea
                          id={`comment-${assignment.assignment_id}`}
                          value={commentsByAssignment[assignment.assignment_id] || ""}
                          onChange={(event) =>
                            setCommentsByAssignment((currentComments) => ({
                              ...currentComments,
                              [assignment.assignment_id]: event.target.value,
                            }))
                          }
                          placeholder="Explique a decisão ou deixe orientações para o colaborador."
                          className="min-h-[80px] bg-input"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                      <div className="space-y-2">
                        <Label htmlFor={`pull-request-${assignment.assignment_id}`}>Pull Request</Label>
                        <Input
                          id={`pull-request-${assignment.assignment_id}`}
                          value={pullRequestByAssignment[assignment.assignment_id] || ""}
                          onChange={(event) =>
                            setPullRequestByAssignment((currentPullRequests) => ({
                              ...currentPullRequests,
                              [assignment.assignment_id]: event.target.value,
                            }))
                          }
                          placeholder="Número do PR ou https://github.com/owner/repo/pull/123"
                          className="bg-input"
                        />
                      </div>
                      <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                        <Checkbox
                          id={`merge-pr-${assignment.assignment_id}`}
                          checked={Boolean(mergePrByAssignment[assignment.assignment_id])}
                          onCheckedChange={(checked) =>
                            setMergePrByAssignment((currentMergePr) => ({
                              ...currentMergePr,
                              [assignment.assignment_id]: Boolean(checked),
                            }))
                          }
                        />
                        <Label htmlFor={`merge-pr-${assignment.assignment_id}`} className="text-sm font-medium">
                          Fazer merge ao aceitar
                        </Label>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        onClick={() => submitDecision(assignment, "accepted")}
                        disabled={decidingAssignmentId === assignment.assignment_id || assignment.status === "accepted"}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => submitDecision(assignment, "rejected")}
                        disabled={decidingAssignmentId === assignment.assignment_id || assignment.status === "rejected"}
                      >
                        Reject
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => finalizeIssue(group, assignment.assignment_id)}
                        disabled={Boolean(group.finalized_at) || finalizingIssueId === group.issue_id}
                      >
                        Finalize issue
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  )
}
