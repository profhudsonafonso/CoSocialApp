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
import { Textarea } from "@/components/ui/textarea"

interface ReviewItem {
  assignment_id: string
  project_issue_id: string
  project_name: string
  idea_id: string | null
  issue_title: string
  issue_number: number | null
  points_estimate: number
  collaborator_name: string
  collaborator_email: string
  claim_key: string
  evidence_url: string | null
  status: string
  review_comment: string | null
  accepted_points: number | null
  pull_request_number: number | null
  pull_request_url: string | null
  merged_at: string | null
}

type Decision = "accepted" | "rejected"

export default function ResponsavelRevisarPage() {
  const [ownerEmail, setOwnerEmail] = useState("")
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [pointsByAssignment, setPointsByAssignment] = useState<Record<string, string>>({})
  const [commentsByAssignment, setCommentsByAssignment] = useState<Record<string, string>>({})
  const [pullRequestByAssignment, setPullRequestByAssignment] = useState<Record<string, string>>({})
  const [mergePrByAssignment, setMergePrByAssignment] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [decidingAssignmentId, setDecidingAssignmentId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const projectNames = useMemo(
    () => Array.from(new Set(reviews.map((review) => review.project_name).filter(Boolean))),
    [reviews],
  )

  const loadReviews = async () => {
    const normalizedEmail = ownerEmail.trim()

    if (!normalizedEmail) {
      setMessage("Informe o e-mail do responsável.")
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/reviews?ownerEmail=${encodeURIComponent(normalizedEmail)}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao carregar revisões.")
      }

      const nextReviews = result.data || []
      setReviews(nextReviews)
      setPointsByAssignment(
        Object.fromEntries(
          nextReviews.map((review: ReviewItem) => [
            review.assignment_id,
            String(review.points_estimate || 10),
          ]),
        ),
      )
      setCommentsByAssignment(
        Object.fromEntries(
          nextReviews.map((review: ReviewItem) => [
            review.assignment_id,
            review.review_comment || "",
          ]),
        ),
      )
      setPullRequestByAssignment(
        Object.fromEntries(
          nextReviews.map((review: ReviewItem) => [
            review.assignment_id,
            review.pull_request_url || (review.pull_request_number ? String(review.pull_request_number) : ""),
          ]),
        ),
      )
      setMergePrByAssignment(
        Object.fromEntries(
          nextReviews.map((review: ReviewItem) => [review.assignment_id, false]),
        ),
      )
      setMessage(nextReviews.length ? null : "Nenhuma submissão pendente para este responsável.")
    } catch (error) {
      setReviews([])
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao carregar revisões.")
    } finally {
      setLoading(false)
    }
  }

  const submitDecision = async (review: ReviewItem, decision: Decision) => {
    setDecidingAssignmentId(review.assignment_id)
    setMessage(null)

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: review.assignment_id,
          decision,
          points: decision === "accepted" ? Number(pointsByAssignment[review.assignment_id]) : undefined,
          reviewComment: commentsByAssignment[review.assignment_id] || undefined,
          mergePr: decision === "accepted" ? Boolean(mergePrByAssignment[review.assignment_id]) : false,
          pullRequestUrl: pullRequestByAssignment[review.assignment_id] || undefined,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao revisar submissão.")
      }

      setReviews((currentReviews) =>
        currentReviews.filter((currentReview) => currentReview.assignment_id !== review.assignment_id),
      )
      setMessage(
        result?.warning
          ? result.warning
          : decision === "accepted"
          ? result?.data?.merged_at
            ? "Contribuição aceita e Pull Request mergeado no GitHub."
            : "Contribuição aceita. Após aceitar, faça o merge do Pull Request no GitHub."
          : "Contribuição rejeitada.",
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao revisar submissão.")
    } finally {
      setDecidingAssignmentId(null)
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
                Avalie submissions enviadas por colaboradores e atribua pontos após revisar o Pull Request.
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
            <Button type="button" onClick={loadReviews} disabled={loading}>
              <Search />
              {loading ? "Buscando..." : "Buscar submissões"}
            </Button>
          </CardContent>
        </Card>

        {projectNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {projectNames.map((projectName) => (
              <Badge key={projectName} variant="secondary">
                {projectName}
              </Badge>
            ))}
          </div>
        )}

        {message && (
          <Card className="border-border bg-card">
            <CardContent className="pt-6 text-sm text-muted-foreground">{message}</CardContent>
          </Card>
        )}

        <section className="grid gap-4">
          {reviews.map((review) => (
            <Card key={review.assignment_id} className="border-border bg-card">
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{review.project_name}</Badge>
                      <Badge variant="outline">#{review.issue_number}</Badge>
                      <Badge variant="outline">{review.status}</Badge>
                      <Badge variant="outline">{review.claim_key}</Badge>
                    </div>
                    <CardTitle className="text-lg text-foreground">{review.issue_title}</CardTitle>
                    <CardDescription>
                      {review.collaborator_name} · {review.collaborator_email}
                    </CardDescription>
                  </div>
                  {review.evidence_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={review.evidence_url} target="_blank" rel="noreferrer">
                        Evidência
                        <ExternalLink />
                      </a>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                  <div className="space-y-2">
                    <Label htmlFor={`points-${review.assignment_id}`}>Pontos</Label>
                    <Input
                      id={`points-${review.assignment_id}`}
                      type="number"
                      min="1"
                      value={pointsByAssignment[review.assignment_id] || String(review.points_estimate || 10)}
                      onChange={(event) =>
                        setPointsByAssignment((currentPoints) => ({
                          ...currentPoints,
                          [review.assignment_id]: event.target.value,
                        }))
                      }
                      className="bg-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`comment-${review.assignment_id}`}>Comentário da revisão</Label>
                    <Textarea
                      id={`comment-${review.assignment_id}`}
                      value={commentsByAssignment[review.assignment_id] || ""}
                      onChange={(event) =>
                        setCommentsByAssignment((currentComments) => ({
                          ...currentComments,
                          [review.assignment_id]: event.target.value,
                        }))
                      }
                      placeholder="Explique a decisão ou deixe orientações para o colaborador."
                      className="min-h-[80px] bg-input"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="space-y-2">
                    <Label htmlFor={`pull-request-${review.assignment_id}`}>Pull Request</Label>
                    <Input
                      id={`pull-request-${review.assignment_id}`}
                      value={pullRequestByAssignment[review.assignment_id] || ""}
                      onChange={(event) =>
                        setPullRequestByAssignment((currentPullRequests) => ({
                          ...currentPullRequests,
                          [review.assignment_id]: event.target.value,
                        }))
                      }
                      placeholder="Número do PR ou https://github.com/owner/repo/pull/123"
                      className="bg-input"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                    <Checkbox
                      id={`merge-pr-${review.assignment_id}`}
                      checked={Boolean(mergePrByAssignment[review.assignment_id])}
                      onCheckedChange={(checked) =>
                        setMergePrByAssignment((currentMergePr) => ({
                          ...currentMergePr,
                          [review.assignment_id]: Boolean(checked),
                        }))
                      }
                    />
                    <Label
                      htmlFor={`merge-pr-${review.assignment_id}`}
                      className="text-sm font-medium"
                    >
                      Fazer merge ao aceitar
                    </Label>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => submitDecision(review, "accepted")}
                    disabled={decidingAssignmentId === review.assignment_id}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Aceitar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => submitDecision(review, "rejected")}
                    disabled={decidingAssignmentId === review.assignment_id}
                  >
                    Rejeitar
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Após aceitar, faça o merge do Pull Request no GitHub.
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  )
}
