"use client"

import { useMemo, useState } from "react"
import { Bell, CheckCircle2, ExternalLink, Filter, Search } from "lucide-react"
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
import { mockFundingOpportunities, type FundingOpportunity } from "@/lib/funding-opportunities/mock-opportunities"

type PanelMode = "details" | "alert" | "checklist" | null

const states = ["Todos", "SC", "SP", "RJ", "MG", "PA", "Nacional"]
const areas = ["Todas", "IA", "Saúde", "Educação", "Sustentabilidade", "Tecnologia", "Govtech", "Healthtech", "Edtech", "Greentech"]
const types = ["Todos", "Subvenção econômica", "Pré-incubação", "Incubação", "Aceleração", "Grant", "Prêmio", "Bolsa", "Crédito", "Investimento", "Inovação aberta", "Chamada pública"]
const stages = ["Todos", "Ideia inicial", "Validação do problema", "Protótipo", "MVP", "MVP com usuários", "Clientes/pilotos", "Receita inicial", "Pronto para aceleração", "Pronto para captação"]
const fundingRanges = ["Todos", "Até R$ 50 mil", "R$ 50 mil a R$ 100 mil", "R$ 100 mil a R$ 250 mil", "Acima de R$ 250 mil"]
const deadlines = ["Todos", "Próximos 7 dias", "Próximos 15 dias", "Próximos 30 dias", "Sem prazo definido"]
const checklistItems = [
  "Ler edital completo",
  "Confirmar elegibilidade",
  "Conferir estado/município",
  "Confirmar tipo de proponente",
  "Confirmar estágio exigido",
  "Preparar descrição da proposta",
  "Preparar problema e solução",
  "Preparar mercado e inovação",
  "Preparar modelo de negócio",
  "Preparar perfil da equipe",
  "Preparar documentos",
  "Revisar limites de caracteres",
  "Anexar arquivos",
  "Submeter antes do prazo",
]

function fundingRange(opportunity: FundingOpportunity) {
  if (opportunity.fundingMin === 0 && opportunity.fundingMax === 0) return "Sem valor definido"
  return `${formatCurrency(opportunity.fundingMin)} a ${formatCurrency(opportunity.fundingMax)}`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

function matchLabel(score: number) {
  if (score >= 80) return "Alta compatibilidade"
  if (score >= 60) return "Boa compatibilidade"
  if (score >= 40) return "Compatibilidade média"
  return "Baixa compatibilidade"
}

function deadlineWithin(deadline: string | null, days: number) {
  if (!deadline) return false
  const now = new Date()
  const target = new Date(deadline)
  const diff = target.getTime() - now.getTime()
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000
}

export default function FundingOpportunitiesPage() {
  const [searchText, setSearchText] = useState("")
  const [stateFilter, setStateFilter] = useState("Todos")
  const [areaFilter, setAreaFilter] = useState("Todas")
  const [typeFilter, setTypeFilter] = useState("Todos")
  const [stageFilter, setStageFilter] = useState("Todos")
  const [fundingFilter, setFundingFilter] = useState("Todos")
  const [deadlineFilter, setDeadlineFilter] = useState("Todos")
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [selectedOpportunity, setSelectedOpportunity] = useState<FundingOpportunity | null>(null)
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [alertEmail, setAlertEmail] = useState("")
  const [alertFrequency, setAlertFrequency] = useState("semanal")
  const [alertPreview, setAlertPreview] = useState("")
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  // TODO: Save opportunities per user/project.
  // TODO: Save alert preferences.
  // TODO: Send real e-mail notifications.
  // TODO: Add curated admin opportunity database.
  // TODO: Integrate APIs/RSS/crawlers where permitted.
  // TODO: Connect match score to real project profile.
  // TODO: Connect to Maturity & Investment Hub.
  // TODO: Connect required documents to Legal & Equity Hub.
  // TODO: Use ColabAI to summarize edital PDFs and generate checklists.
  // TODO: Build opportunity detail pages with dynamic routes.
  // TODO: Add status workflow: nova, recomendada, salva, em análise, em preparação, submetida, aprovada, reprovada, perdida, arquivada.

  const filteredOpportunities = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()

    return mockFundingOpportunities.filter((opportunity) => {
      const matchesSearch = !normalizedSearch || [
        opportunity.title,
        opportunity.source,
        opportunity.summary,
        ...opportunity.areas,
      ].join(" ").toLowerCase().includes(normalizedSearch)
      const matchesState = stateFilter === "Todos" || opportunity.state === stateFilter
      const matchesArea = areaFilter === "Todas" || opportunity.areas.includes(areaFilter)
      const matchesType = typeFilter === "Todos" || opportunity.opportunityType === typeFilter
      const matchesStage = stageFilter === "Todos" || opportunity.startupStages.includes(stageFilter)
      const matchesFunding = fundingFilter === "Todos" ||
        (fundingFilter === "Até R$ 50 mil" && opportunity.fundingMax <= 50000) ||
        (fundingFilter === "R$ 50 mil a R$ 100 mil" && opportunity.fundingMax >= 50000 && opportunity.fundingMin <= 100000) ||
        (fundingFilter === "R$ 100 mil a R$ 250 mil" && opportunity.fundingMax >= 100000 && opportunity.fundingMin <= 250000) ||
        (fundingFilter === "Acima de R$ 250 mil" && opportunity.fundingMax > 250000)
      const matchesDeadline = deadlineFilter === "Todos" ||
        (deadlineFilter === "Próximos 7 dias" && deadlineWithin(opportunity.deadline, 7)) ||
        (deadlineFilter === "Próximos 15 dias" && deadlineWithin(opportunity.deadline, 15)) ||
        (deadlineFilter === "Próximos 30 dias" && deadlineWithin(opportunity.deadline, 30)) ||
        (deadlineFilter === "Sem prazo definido" && !opportunity.deadline)

      return matchesSearch && matchesState && matchesArea && matchesType && matchesStage && matchesFunding && matchesDeadline
    })
  }, [areaFilter, deadlineFilter, fundingFilter, searchText, stageFilter, stateFilter, typeFilter])

  const openPanel = (opportunity: FundingOpportunity, mode: PanelMode) => {
    setSelectedOpportunity(opportunity)
    setPanelMode(mode)
    setAlertPreview("")
  }

  const toggleSaved = (opportunityId: string) => {
    setSavedIds((current) =>
      current.includes(opportunityId)
        ? current.filter((id) => id !== opportunityId)
        : [...current, opportunityId],
    )
  }

  const simulateAlert = () => {
    if (!selectedOpportunity) return

    setAlertPreview([
      `Subject: [CoSocial] Novo edital compatível com seu projeto: ${selectedOpportunity.title}`,
      "",
      "Encontramos uma oportunidade compatível com seu projeto.",
      "",
      `Edital: ${selectedOpportunity.title}`,
      `Fonte: ${selectedOpportunity.source}`,
      `Estado: ${selectedOpportunity.state}`,
      `Valor: ${fundingRange(selectedOpportunity)}`,
      `Prazo: ${selectedOpportunity.deadline || "Sem prazo definido"}`,
      `Match Score: ${selectedOpportunity.matchScore}/100`,
      "",
      "Por que recomendamos:",
      "* área compatível;",
      "* estágio compatível;",
      "* valor adequado;",
      "* prazo viável.",
      "",
      "Acesse o painel para ver o checklist e preparar sua submissão.",
    ].join("\n"))
  }

  const checkedCount = checklistItems.filter((item) => checkedItems[item]).length

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">MVP demonstrativo</Badge>
              <Badge variant="outline">Filtros por área, estado, valor e estágio</Badge>
              <Badge variant="outline">Alertas por e-mail em versão futura</Badge>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">Funding Opportunities Hub</h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Busque, filtre e acompanhe editais, chamadas públicas, subvenções, aceleração e oportunidades de financiamento para startups e projetos inovadores.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card className="border-primary/30 bg-card">
          <CardContent className="grid gap-3 pt-6 text-sm text-muted-foreground md:grid-cols-2">
            <p>Este MVP usa oportunidades simuladas para demonstrar o fluxo. Não são editais reais abertos.</p>
            <p>Versões futuras poderão integrar SEBRAE, FINEP, FAPs estaduais, aceleradoras, incubadoras, bancos de desenvolvimento e inovação aberta.</p>
            <p>Oportunidades ficam espalhadas em muitos sites, com prazos curtos e requisitos difíceis de interpretar.</p>
            <p>O módulo organiza filtros, match score, checklist, favoritos e alertas para reduzir perda de oportunidades.</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filtros
            </CardTitle>
            <CardDescription>Oportunidades salvas: {savedIds.length}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2">
              <Label>Busca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Buscar por título, fonte ou área" className="bg-input pl-9" />
              </div>
            </div>
            <FilterSelect label="Estado" value={stateFilter} onValueChange={setStateFilter} options={states} />
            <FilterSelect label="Área" value={areaFilter} onValueChange={setAreaFilter} options={areas} />
            <FilterSelect label="Tipo" value={typeFilter} onValueChange={setTypeFilter} options={types} />
            <FilterSelect label="Estágio" value={stageFilter} onValueChange={setStageFilter} options={stages} />
            <FilterSelect label="Valor" value={fundingFilter} onValueChange={setFundingFilter} options={fundingRanges} />
            <FilterSelect label="Prazo" value={deadlineFilter} onValueChange={setDeadlineFilter} options={deadlines} />
          </CardContent>
        </Card>

        <section className="grid gap-4 lg:grid-cols-2">
          {filteredOpportunities.map((opportunity) => (
            <Card key={opportunity.id} className="border-border bg-card">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{matchLabel(opportunity.matchScore)}</Badge>
                  <Badge variant="outline">{opportunity.status}</Badge>
                  {savedIds.includes(opportunity.id) && <Badge variant="secondary">Salva</Badge>}
                </div>
                <CardTitle className="text-xl text-foreground">{opportunity.title}</CardTitle>
                <CardDescription>{opportunity.source} · {opportunity.state}/{opportunity.city}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Match Score</span>
                    <span className="font-medium text-foreground">{opportunity.matchScore}/100</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${opportunity.matchScore}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {opportunity.areas.map((area) => <Badge key={area} variant="outline">{area}</Badge>)}
                  <Badge variant="outline">{opportunity.opportunityType}</Badge>
                  <Badge variant="outline">{fundingRange(opportunity)}</Badge>
                  <Badge variant="outline">Prazo: {opportunity.deadline || "Sem prazo definido"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{opportunity.summary}</p>
                <p className="text-xs text-muted-foreground">Estágio recomendado: {opportunity.startupStages.join(", ")} · Proponente: {opportunity.applicantTypes.join(", ")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => openPanel(opportunity, "details")}>Ver detalhes</Button>
                  <Button type="button" variant="outline" onClick={() => toggleSaved(opportunity.id)}>{savedIds.includes(opportunity.id) ? "Remover salva" : "Salvar oportunidade"}</Button>
                  <Button type="button" variant="outline" onClick={() => openPanel(opportunity, "alert")}>Ativar alerta</Button>
                  <Button type="button" onClick={() => openPanel(opportunity, "checklist")}>Preparar submissão</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {selectedOpportunity && panelMode && (
          <Card className="border-primary/30 bg-card">
            <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{panelMode === "details" ? "Detalhes da oportunidade" : panelMode === "alert" ? "Alerta por e-mail" : "Checklist de submissão"}</CardTitle>
                <CardDescription>{selectedOpportunity.title}</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={() => setPanelMode(null)}>Fechar</Button>
            </CardHeader>
            <CardContent>
              {panelMode === "details" && <DetailsPanel opportunity={selectedOpportunity} />}
              {panelMode === "alert" && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input value={alertEmail} onChange={(event) => setAlertEmail(event.target.value)} placeholder="seu@email.com" className="bg-input" />
                    </div>
                    <FilterSelect label="Frequência" value={alertFrequency} onValueChange={setAlertFrequency} options={["imediato", "diário", "semanal"]} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <FilterSelect label="Áreas de interesse" value={areaFilter} onValueChange={setAreaFilter} options={areas} />
                      <FilterSelect label="Estados de interesse" value={stateFilter} onValueChange={setStateFilter} options={states} />
                      <FilterSelect label="Valor mínimo" value={fundingFilter} onValueChange={setFundingFilter} options={fundingRanges} />
                      <FilterSelect label="Estágio" value={stageFilter} onValueChange={setStageFilter} options={stages} />
                    </div>
                    <Button type="button" onClick={simulateAlert}>
                      <Bell className="h-4 w-4" />
                      Simular alerta
                    </Button>
                    <p className="text-sm text-muted-foreground">Este MVP não envia e-mails reais. Em versões futuras, os alertas serão enviados mediante consentimento e preferências salvas.</p>
                    <p className="text-sm text-muted-foreground">Alertas por e-mail exigirão consentimento do usuário, opção de descadastro e respeito às boas práticas de privacidade e LGPD.</p>
                  </div>
                  <pre className="min-h-[260px] whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
                    {alertPreview || "A prévia do e-mail aparecerá aqui."}
                  </pre>
                </div>
              )}
              {panelMode === "checklist" && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground">Checklist: {checkedCount}/{checklistItems.length} concluídos</p>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(checkedCount / checklistItems.length) * 100}%` }} />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {checklistItems.map((item) => (
                      <label key={item} className="flex items-center gap-3 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                        <input type="checkbox" checked={Boolean(checkedItems[item])} onChange={(event) => setCheckedItems((current) => ({ ...current, [item]: event.target.checked }))} />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <IntegrationCard
            title="Conexão com Maturity & Investment Hub"
            text="O Funding Opportunities Hub usa o estágio de maturidade do projeto para recomendar editais. Projetos em ideação podem receber pré-incubação; projetos com MVP podem receber aceleração; projetos com clientes ou receita podem receber subvenção, crédito ou captação."
            extra="Maturity Index → Editais compatíveis → Match Score → Checklist → Submissão. Projeto com MVP em desenvolvimento: recomendado buscar pré-incubação, aceleração inicial e grants de validação."
            href="/maturity-investment"
            action="Abrir Maturity Hub"
          />
          <IntegrationCard
            title="Conexão com Legal & Equity Hub"
            text="Alguns editais exigem CNPJ, contrato social, propriedade intelectual, regularidade fiscal ou documentos assinados."
            extra="Este edital exige CNPJ e comprovação de titularidade do software. Recomendamos acessar o Legal & Equity Hub antes de iniciar a submissão."
            href="/legal-equity"
            action="Abrir Legal & Equity Hub"
          />
          <IntegrationCard
            title="Conexão com Business Validation"
            text="Antes de submeter um edital, a CoSocial pode recomendar validar concorrentes, diferenciação, novidade e evidências de mercado."
            extra="Use a validação para preparar respostas sobre mercado, risco, inovação e vantagem competitiva."
            href="/validar-negocio"
            action="Validar negócio"
          />
        </div>

        <Card className="border-primary/30 bg-card">
          <CardHeader>
            <CardTitle>Agente de Editais</CardTitle>
            <CardDescription>Em versões futuras, o ColabAI poderá resumir editais, extrair requisitos, gerar checklist, comparar o edital com o projeto e revisar respostas da proposta.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Futuro</Badge>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function FilterSelect({ label, value, onValueChange, options }: { label: string; value: string; onValueChange: (value: string) => void; options: string[] }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="bg-input">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function DetailsPanel({ opportunity }: { opportunity: FundingOpportunity }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DetailBlock title="Resumo" items={[opportunity.summary, `Fonte: ${opportunity.source}`, `Público: ${opportunity.applicantTypes.join(", ")}`, `Áreas: ${opportunity.areas.join(", ")}`]} />
      <DetailBlock title="Valor e prazo" items={[fundingRange(opportunity), `Prazo: ${opportunity.deadline || "Sem prazo definido"}`, `Match Score: ${opportunity.matchScore}/100`, `Status: ${opportunity.status}`]} />
      <DetailBlock title="Elegibilidade" items={opportunity.eligibility} />
      <DetailBlock title="Documentos exigidos" items={opportunity.requiredDocuments} />
      <DetailBlock title="Critérios de avaliação" items={opportunity.evaluationCriteria} />
      <DetailBlock title="Etapas do processo" items={opportunity.processSteps} />
      <DetailBlock title="Riscos de elegibilidade" items={opportunity.risks} />
      <DetailBlock title="Recomendação e próximos passos" items={[opportunity.recommendation, "Ler edital completo", "Confirmar elegibilidade", "Preparar checklist e documentos"]} />
      <div className="lg:col-span-2">
        <Button variant="outline" asChild>
          <a href={opportunity.url} target="_blank" rel="noreferrer">
            Link oficial/fonte
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  )
}

function DetailBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <h3 className="mb-3 font-semibold text-foreground">{title}</h3>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function IntegrationCard({ title, text, extra, href, action }: { title: string; text: string; extra: string; href: string; action: string }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{extra}</p>
        <Button variant="outline" asChild>
          <a href={href}>{action}</a>
        </Button>
      </CardContent>
    </Card>
  )
}
