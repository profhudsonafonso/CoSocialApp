"use client"

import { useMemo, useState } from "react"
import { BarChart3, ClipboardCopy, Rocket, ShieldCheck, TrendingUp } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const dimensions = [
  {
    name: "Maturidade técnica",
    score: 72,
    weight: 0.2,
    indicators: [
      "Issues concluídas: 32",
      "Pull requests revisados: 10",
      "Releases: 2",
      "Deploy publicado: Sim",
      "Testes automatizados: Parcial",
      "Documentação técnica: Parcial",
    ],
  },
  {
    name: "Maturidade de produto",
    score: 75,
    weight: 0.2,
    indicators: [
      "Protótipo: Sim",
      "MVP: Sim",
      "MVP publicado: Sim",
      "Roadmap: Sim",
      "Feedback de usuários: Parcial",
      "Onboarding: Não",
    ],
  },
  {
    name: "Maturidade comercial",
    score: 60,
    weight: 0.2,
    indicators: [
      "Entrevistas: 20",
      "Leads: 50",
      "Usuários testando: 12",
      "Clientes pagantes: 2",
      "Pilotos: 1",
      "Propostas enviadas: 5",
    ],
  },
  {
    name: "Maturidade financeira",
    score: 55,
    weight: 0.15,
    indicators: [
      "Receita mensal: R$ 3.000",
      "Custo mensal: R$ 1.500",
      "Margem estimada: 50%",
      "Runway: 6 meses",
      "Ticket médio: R$ 300",
      "Clientes pagantes: 10",
    ],
  },
  {
    name: "Maturidade jurídica/societária",
    score: 50,
    weight: 0.15,
    indicators: [
      "Termo de colaboração: Pendente",
      "NDA: Parcial",
      "Cap table inicial: Simulado",
      "Acordo entre fundadores: Pendente",
      "Propriedade intelectual: Pendente",
      "CNPJ: Não",
    ],
  },
  {
    name: "Maturidade de investimento",
    score: 48,
    weight: 0.1,
    indicators: [
      "Pitch deck: Pendente",
      "One-pager: Parcial",
      "Investor readiness report: Pendente",
      "Uso do capital: Parcial",
      "Riscos mapeados: Parcial",
      "Data room básico: Não",
    ],
  },
]

const opportunities = [
  "Formalizar acordo entre fundadores.",
  "Organizar documentos de propriedade intelectual.",
  "Validar mais 5 clientes potenciais.",
  "Consolidar métricas financeiras.",
  "Preparar pitch deck.",
  "Criar one-pager para investidores.",
  "Definir uso do capital.",
  "Atualizar cap table no Legal & Equity Hub.",
  "Registrar mais evidências de tração comercial.",
  "Melhorar documentação técnica e testes.",
]

const readiness = {
  strengths: ["MVP publicado", "Tarefas concluídas", "Primeiros usuários", "Evidências técnicas"],
  attention: ["Documentos societários pendentes", "Receita ainda inicial", "Pitch deck incompleto", "Data room inexistente"],
  milestones: ["Validar 5 clientes", "Organizar cap table", "Definir uso do capital", "Preparar one-pager", "Criar projeções financeiras"],
}

function getStage(score: number) {
  if (score <= 20) return "Ideia inicial"
  if (score <= 40) return "Validação inicial"
  if (score <= 60) return "MVP em desenvolvimento"
  if (score <= 75) return "MVP validado"
  if (score <= 90) return "Pronto para captação inicial"
  return "Pronto para rodada estruturada"
}

export default function MaturityInvestmentPage() {
  const [showOpportunities, setShowOpportunities] = useState(false)
  const [report, setReport] = useState("")
  const maturityIndex = useMemo(
    () => Math.round(dimensions.reduce((total, dimension) => total + dimension.score * dimension.weight, 0)),
    [],
  )
  const stage = getStage(maturityIndex)

  // TODO: Connect technical maturity to GitHub issues, commits, PRs and releases.
  // TODO: Connect commercial maturity to leads, interviews, pilots and customers.
  // TODO: Connect financial maturity to revenue, costs, MRR, ARR, CAC, LTV and runway.
  // TODO: Connect legal maturity to Legal & Equity Hub.
  // TODO: Connect contribution maturity to ColabScore.
  // TODO: Save maturity settings per project.
  // TODO: Generate real Investor Readiness Report with ColabAI.
  // TODO: Export report to PDF.
  // TODO: Build controlled investor showcase.

  const generateReport = () => {
    setReport([
      "# Investor Readiness Report",
      "",
      "## Resumo do projeto",
      "Projeto demonstrativo com MVP funcional, contribuições registradas e sinais iniciais de validação.",
      "",
      "## Problema resolvido",
      "Organiza colaboração, validação e execução de ideias com evidências mensuráveis.",
      "",
      "## Solução",
      "Fluxo integrado com ideias, tarefas GitHub, ColabScore, validação de negócio e hubs de apoio.",
      "",
      "## Estágio atual",
      `${stage} (${maturityIndex}/100).`,
      "",
      "## Equipe e contribuições",
      "Contribuições simuladas de fundadores, colaboradores técnicos e responsáveis de validação.",
      "",
      "## ColabScore acumulado",
      "Métrica demonstrativa ainda não conectada nesta tela.",
      "",
      ...dimensions.flatMap((dimension) => [
        `## ${dimension.name}`,
        `${dimension.score}/100. Indicadores: ${dimension.indicators.join("; ")}.`,
        "",
      ]),
      "## Principais riscos",
      "Documentação societária pendente, receita inicial, pitch deck incompleto e data room inexistente.",
      "",
      "## Principais evidências",
      "MVP publicado, tarefas concluídas, primeiros usuários e evidências técnicas.",
      "",
      "## Próximos marcos",
      opportunities.join(" "),
      "",
      "## Recomendação de prontidão",
      "Este projeto apresenta maturidade geral de 68/100, com MVP funcional e sinais iniciais de validação. Antes de iniciar captação, recomenda-se organizar acordo societário, atualizar cap table, consolidar projeções financeiras e preparar pitch deck.",
    ].join("\n"))
  }

  const copyReport = async () => {
    if (report) {
      await navigator.clipboard.writeText(report)
    }
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">MVP demonstrativo</Badge>
              <Badge variant="outline">Não é recomendação de investimento</Badge>
            </div>
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground md:text-4xl">
                <TrendingUp className="h-8 w-8 text-primary" />
                Maturity & Investment Hub
              </h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Meça a evolução do projeto com indicadores técnicos, comerciais, financeiros, jurídicos e de investimento.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card className="border-primary/30 bg-card">
          <CardContent className="grid gap-3 pt-6 text-sm text-muted-foreground md:grid-cols-2">
            <p>O Maturity & Investment Hub transforma evidências do projeto em um Startup Maturity Index de 0 a 100.</p>
            <p>ColabScore mede contribuições individuais; este hub mede evolução do projeto como negócio.</p>
            <p>Legal & Equity Hub organiza direitos, documentos e participação. Este módulo observa prontidão e riscos.</p>
            <p>Este primeiro MVP usa dados simulados; versões futuras conectarão GitHub, ColabScore, validação de negócio, dados financeiros e clientes.</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[280px_1fr] lg:items-center">
            <div className="flex flex-col items-center justify-center rounded-md border border-border bg-background p-6 text-center">
              <div className="text-sm text-muted-foreground">Startup Maturity Index</div>
              <div className="mt-2 text-6xl font-bold text-primary">{maturityIndex}</div>
              <div className="text-sm text-muted-foreground">/100</div>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${maturityIndex}%` }} />
              </div>
            </div>
            <div className="space-y-4">
              <Badge variant="secondary">{stage}</Badge>
              <h2 className="text-2xl font-bold text-foreground">MVP validado com lacunas para captação</h2>
              <p className="text-muted-foreground">
                Próximo passo: Organizar cap table, validar receita e preparar Investor Readiness Report.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" onClick={() => setShowOpportunities((current) => !current)}>
                  Ver oportunidades de melhoria
                </Button>
                <Button type="button" variant="outline" onClick={generateReport}>
                  Gerar Investor Readiness Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {showOpportunities && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Oportunidades de melhoria</CardTitle>
              <CardDescription>Ações simuladas para aumentar prontidão antes de captação.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {opportunities.map((item) => (
                <div key={item} className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">{item}</div>
              ))}
            </CardContent>
          </Card>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dimensions.map((dimension) => (
            <Card key={dimension.name} className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-lg">
                  {dimension.name}
                  <Badge variant="outline">{dimension.score}/100</Badge>
                </CardTitle>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${dimension.score}%` }} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-2">
                {dimension.indicators.map((indicator) => (
                  <div key={indicator} className="rounded-md border border-border bg-background p-2 text-sm text-muted-foreground">{indicator}</div>
                ))}
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Fórmula de maturidade</CardTitle>
            <CardDescription>Índice demonstrativo ponderado por seis dimensões.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Startup Maturity Index = (Técnica × 0.20) + (Produto × 0.20) + (Comercial × 0.20) + (Financeira × 0.15) + (Jurídica/Societária × 0.15) + (Investimento × 0.10)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody>
                  {dimensions.map((dimension) => (
                    <tr key={dimension.name} className="border-b border-border/50">
                      <td className="py-2 text-sm text-muted-foreground">{dimension.name}</td>
                      <td className="py-2 text-right text-sm text-muted-foreground">{dimension.score} × {dimension.weight.toFixed(2)}</td>
                      <td className="py-2 text-right text-sm font-medium text-foreground">{(dimension.score * dimension.weight).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {report && (
          <Card className="border-border bg-card">
            <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>Investor Readiness Report</CardTitle>
                <CardDescription>Relatório demonstrativo gerado localmente.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={copyReport}>
                <ClipboardCopy className="h-4 w-4" />
                Copiar relatório
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm leading-6 text-foreground">{report}</pre>
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Prontidão para investimento</CardTitle>
            <CardDescription>Resumo visual para discutir próximos passos com equipe, mentores e parceiros.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <ReadinessColumn title="Pontos fortes" items={readiness.strengths} />
            <ReadinessColumn title="Pontos de atenção" items={readiness.attention} />
            <ReadinessColumn title="Próximos marcos" items={readiness.milestones} />
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Vitrine de startups maduras
            </CardTitle>
            <CardDescription>
              Em versões futuras, projetos com índice acima de 70 poderão ser exibidos em uma vitrine controlada para mentores, parceiros e investidores convidados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Futuro</Badge>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Cuidados regulatórios
            </CardTitle>
            <CardDescription>
              As informações apresentadas neste módulo têm finalidade educativa, organizacional e de apoio à análise de maturidade.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
            {[
              "A CoSocial não garante retorno financeiro.",
              "A CoSocial não realiza recomendação de investimento.",
              "A CoSocial não substitui análise jurídica, contábil, financeira ou regulatória.",
              "A CoSocial não realiza ofertas públicas de valores mobiliários neste MVP.",
              "A CoSocial não vende produtos de investimento.",
              "O maturity score não é recomendação de investimento.",
              "Investidores devem realizar sua própria análise de risco.",
              "Funcionalidades futuras de captação exigem revisão legal e regulatória.",
            ].map((item) => (
              <div key={item} className="rounded-md border border-border bg-background p-3">{item}</div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function ReadinessColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
        <BarChart3 className="h-4 w-4 text-primary" />
        {title}
      </h3>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-md border border-border bg-card p-2 text-sm text-muted-foreground">{item}</div>
        ))}
      </div>
    </div>
  )
}
