"use client"

import { useEffect, useMemo, useState } from "react"
import { Calculator, ExternalLink, Search } from "lucide-react"
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
}

interface ProjectSetting {
  reference_hourly_value: number | string | null
  default_validated_hours: number | string | null
  default_delivery_factor: number | string | null
  default_impact_factor: number | string | null
  default_risk_factor: number | string | null
  min_points: number | string | null
  max_points: number | string | null
  notes: string | null
}

interface IssueSetting {
  validated_hours: number | string | null
  delivery_factor: number | string | null
  impact_factor: number | string | null
  risk_factor: number | string | null
  manual_points: number | string | null
  notes: string | null
}

interface ColabScoreIssue {
  id: string
  issue_number: number
  title: string
  html_url: string | null
  points_estimate: number | null
  calculated_points: number
  colabscore_setting: IssueSetting | null
}

interface ProjectForm {
  referenceHourlyValue: string
  defaultValidatedHours: string
  defaultDeliveryFactor: string
  defaultImpactFactor: string
  defaultRiskFactor: string
  minPoints: string
  maxPoints: string
  notes: string
}

interface IssueForm {
  validatedHours: string
  deliveryFactor: string
  impactFactor: string
  riskFactor: string
  manualPoints: string
  notes: string
}

const defaultProjectForm: ProjectForm = {
  referenceHourlyValue: "50",
  defaultValidatedHours: "1",
  defaultDeliveryFactor: "1",
  defaultImpactFactor: "1",
  defaultRiskFactor: "1",
  minPoints: "1",
  maxPoints: "1000",
  notes: "",
}

function toFormValue(value: number | string | null | undefined, fallback = "") {
  if (value === null || value === undefined) {
    return fallback
  }

  return String(value)
}

function settingToProjectForm(setting: ProjectSetting | null): ProjectForm {
  return {
    referenceHourlyValue: toFormValue(setting?.reference_hourly_value, "50"),
    defaultValidatedHours: toFormValue(setting?.default_validated_hours, "1"),
    defaultDeliveryFactor: toFormValue(setting?.default_delivery_factor, "1"),
    defaultImpactFactor: toFormValue(setting?.default_impact_factor, "1"),
    defaultRiskFactor: toFormValue(setting?.default_risk_factor, "1"),
    minPoints: toFormValue(setting?.min_points, "1"),
    maxPoints: toFormValue(setting?.max_points, "1000"),
    notes: setting?.notes || "",
  }
}

function settingToIssueForm(setting: IssueSetting | null): IssueForm {
  return {
    validatedHours: toFormValue(setting?.validated_hours),
    deliveryFactor: toFormValue(setting?.delivery_factor),
    impactFactor: toFormValue(setting?.impact_factor),
    riskFactor: toFormValue(setting?.risk_factor),
    manualPoints: toFormValue(setting?.manual_points),
    notes: setting?.notes || "",
  }
}

function nullableNumber(value: string) {
  return value.trim() ? Number(value) : null
}

export default function ResponsavelColabScorePage() {
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selectedIdeaId, setSelectedIdeaId] = useState("")
  const [projectForm, setProjectForm] = useState<ProjectForm>(defaultProjectForm)
  const [issues, setIssues] = useState<ColabScoreIssue[]>([])
  const [issueForms, setIssueForms] = useState<Record<string, IssueForm>>({})
  const [loadingIdeas, setLoadingIdeas] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [savingProject, setSavingProject] = useState(false)
  const [savingIssueId, setSavingIssueId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const ownerIdeas = useMemo(() => {
    const normalizedEmail = ownerEmail.trim().toLowerCase()
    return ideas.filter((idea) => idea.email?.toLowerCase() === normalizedEmail)
  }, [ideas, ownerEmail])

  const selectedIdea = ownerIdeas.find((idea) => idea.id === selectedIdeaId)

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
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao carregar projetos.")
      }

      setIdeas(result.data || [])
      setSelectedIdeaId("")
      setIssues([])
      setMessage(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao carregar projetos.")
    } finally {
      setLoadingIdeas(false)
    }
  }

  const loadSettings = async (ideaId: string) => {
    setLoadingSettings(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/colabscore/settings?ideaId=${encodeURIComponent(ideaId)}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao carregar ColabScore.")
      }

      const nextIssues: ColabScoreIssue[] = result.issues || []
      setProjectForm(settingToProjectForm(result.projectSetting || null))
      setIssues(nextIssues)
      setIssueForms(
        Object.fromEntries(
          nextIssues.map((issue) => [
            issue.id,
            settingToIssueForm(issue.colabscore_setting),
          ]),
        ),
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao carregar ColabScore.")
    } finally {
      setLoadingSettings(false)
    }
  }

  useEffect(() => {
    if (selectedIdeaId) {
      loadSettings(selectedIdeaId)
    }
  }, [selectedIdeaId])

  const updateProjectField = (field: keyof ProjectForm, value: string) => {
    setProjectForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  const updateIssueField = (issueId: string, field: keyof IssueForm, value: string) => {
    setIssueForms((currentForms) => ({
      ...currentForms,
      [issueId]: {
        ...(currentForms[issueId] || settingToIssueForm(null)),
        [field]: value,
      },
    }))
  }

  const saveProjectSettings = async () => {
    if (!selectedIdeaId) {
      return
    }

    setSavingProject(true)
    setMessage(null)

    try {
      const response = await fetch("/api/colabscore/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: selectedIdeaId,
          referenceHourlyValue: Number(projectForm.referenceHourlyValue),
          defaultValidatedHours: Number(projectForm.defaultValidatedHours),
          defaultDeliveryFactor: Number(projectForm.defaultDeliveryFactor),
          defaultImpactFactor: Number(projectForm.defaultImpactFactor),
          defaultRiskFactor: Number(projectForm.defaultRiskFactor),
          minPoints: Number(projectForm.minPoints),
          maxPoints: Number(projectForm.maxPoints),
          notes: projectForm.notes,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao salvar configuração geral.")
      }

      setMessage("Configuração geral salva.")
      await loadSettings(selectedIdeaId)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao salvar configuração.")
    } finally {
      setSavingProject(false)
    }
  }

  const saveIssueSettings = async (issueId: string) => {
    const issueForm = issueForms[issueId] || settingToIssueForm(null)
    setSavingIssueId(issueId)
    setMessage(null)

    try {
      const response = await fetch("/api/colabscore/issue-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectIssueId: issueId,
          validatedHours: nullableNumber(issueForm.validatedHours),
          deliveryFactor: nullableNumber(issueForm.deliveryFactor),
          impactFactor: nullableNumber(issueForm.impactFactor),
          riskFactor: nullableNumber(issueForm.riskFactor),
          manualPoints: nullableNumber(issueForm.manualPoints),
          notes: issueForm.notes,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao salvar configuração da issue.")
      }

      setMessage(`Configuração da issue salva. Preview: ${result.calculated_points} ponto(s).`)

      if (selectedIdeaId) {
        await loadSettings(selectedIdeaId)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido ao salvar issue.")
    } finally {
      setSavingIssueId(null)
    }
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit">
              ColabScore
            </Badge>
            <div>
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">Configurar ColabScore</h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Configurações gerais valem para todas as issues do projeto. Configurações por issue sobrescrevem os valores gerais. Se pontos manuais forem definidos, eles substituem a fórmula.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Buscar projeto</CardTitle>
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
              <CardDescription>Escolha a ideia que terá os parâmetros de pontuação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>Projeto/ideia</Label>
              <Select value={selectedIdeaId} onValueChange={setSelectedIdeaId}>
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
          <>
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl text-foreground">Configuração geral</CardTitle>
                </div>
                <CardDescription>
                  Points = validatedHours × referenceHourlyValue × deliveryFactor × impactFactor × riskFactor
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Valor-hora de referência</Label>
                    <Input type="number" min="0.01" step="0.01" value={projectForm.referenceHourlyValue} onChange={(event) => updateProjectField("referenceHourlyValue", event.target.value)} className="bg-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Horas validadas padrão</Label>
                    <Input type="number" min="0.01" step="0.01" value={projectForm.defaultValidatedHours} onChange={(event) => updateProjectField("defaultValidatedHours", event.target.value)} className="bg-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fator de entrega padrão</Label>
                    <Input type="number" min="0.01" step="0.01" value={projectForm.defaultDeliveryFactor} onChange={(event) => updateProjectField("defaultDeliveryFactor", event.target.value)} className="bg-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fator de impacto padrão</Label>
                    <Input type="number" min="0.01" step="0.01" value={projectForm.defaultImpactFactor} onChange={(event) => updateProjectField("defaultImpactFactor", event.target.value)} className="bg-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fator de risco padrão</Label>
                    <Input type="number" min="0.01" step="0.01" value={projectForm.defaultRiskFactor} onChange={(event) => updateProjectField("defaultRiskFactor", event.target.value)} className="bg-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Pontuação mínima</Label>
                      <Input type="number" min="1" value={projectForm.minPoints} onChange={(event) => updateProjectField("minPoints", event.target.value)} className="bg-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>Pontuação máxima</Label>
                      <Input type="number" min="1" value={projectForm.maxPoints} onChange={(event) => updateProjectField("maxPoints", event.target.value)} className="bg-input" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={projectForm.notes} onChange={(event) => updateProjectField("notes", event.target.value)} className="min-h-[80px] bg-input" />
                </div>
                <Button type="button" onClick={saveProjectSettings} disabled={savingProject || loadingSettings} className="w-fit bg-primary hover:bg-primary/90">
                  {savingProject ? "Salvando..." : "Salvar configuração geral"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Configuração por issue</CardTitle>
                <CardDescription>
                  Overrides por issue são opcionais. Deixe vazio para usar o valor geral do projeto.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {loadingSettings ? (
                  <p className="text-sm text-muted-foreground">Carregando configurações...</p>
                ) : issues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma issue sincronizada para este projeto.</p>
                ) : (
                  issues.map((issue) => {
                    const issueForm = issueForms[issue.id] || settingToIssueForm(null)

                    return (
                      <div key={issue.id} className="rounded-xl border border-border bg-background p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">#{issue.issue_number}</Badge>
                              <Badge variant="outline">{issue.calculated_points} pts preview</Badge>
                              {issue.points_estimate !== null && <Badge variant="outline">{issue.points_estimate} pts estimados</Badge>}
                            </div>
                            <h2 className="font-semibold text-foreground">{issue.title}</h2>
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

                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Horas validadas</Label>
                            <Input type="number" min="0.01" step="0.01" value={issueForm.validatedHours} onChange={(event) => updateIssueField(issue.id, "validatedHours", event.target.value)} placeholder={projectForm.defaultValidatedHours} className="bg-input" />
                          </div>
                          <div className="space-y-2">
                            <Label>Fator de entrega</Label>
                            <Input type="number" min="0.01" step="0.01" value={issueForm.deliveryFactor} onChange={(event) => updateIssueField(issue.id, "deliveryFactor", event.target.value)} placeholder={projectForm.defaultDeliveryFactor} className="bg-input" />
                          </div>
                          <div className="space-y-2">
                            <Label>Fator de impacto</Label>
                            <Input type="number" min="0.01" step="0.01" value={issueForm.impactFactor} onChange={(event) => updateIssueField(issue.id, "impactFactor", event.target.value)} placeholder={projectForm.defaultImpactFactor} className="bg-input" />
                          </div>
                          <div className="space-y-2">
                            <Label>Fator de risco</Label>
                            <Input type="number" min="0.01" step="0.01" value={issueForm.riskFactor} onChange={(event) => updateIssueField(issue.id, "riskFactor", event.target.value)} placeholder={projectForm.defaultRiskFactor} className="bg-input" />
                          </div>
                          <div className="space-y-2">
                            <Label>Pontos manuais fixos</Label>
                            <Input type="number" min="1" value={issueForm.manualPoints} onChange={(event) => updateIssueField(issue.id, "manualPoints", event.target.value)} placeholder="Usar fórmula" className="bg-input" />
                          </div>
                          <div className="space-y-2">
                            <Label>Observações</Label>
                            <Input value={issueForm.notes} onChange={(event) => updateIssueField(issue.id, "notes", event.target.value)} className="bg-input" />
                          </div>
                        </div>

                        <Button type="button" onClick={() => saveIssueSettings(issue.id)} disabled={savingIssueId === issue.id} className="mt-4 bg-primary hover:bg-primary/90">
                          {savingIssueId === issue.id ? "Salvando..." : "Salvar configuração da issue"}
                        </Button>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}
