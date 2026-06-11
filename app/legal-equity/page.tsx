"use client"

import { useMemo, useState } from "react"
import { FileText, Scale, ShieldCheck, Sparkles } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CapTableKey = "founder" | "cofounders" | "colabScorePool" | "platform" | "futureReserve"

interface CapTableInput {
  founder: number
  cofounders: number
  colabScorePool: number
  platform: number
  futureReserve: number
  investor: number
}

const initialCapTable: CapTableInput = {
  founder: 50,
  cofounders: 20,
  colabScorePool: 20,
  platform: 5,
  futureReserve: 5,
  investor: 20,
}

const participantLabels: Record<CapTableKey, string> = {
  founder: "Fundador / dono da ideia",
  cofounders: "Cofundadores",
  colabScorePool: "Pool ColabScore",
  platform: "Out_off_D_Box / CoSocial",
  futureReserve: "Reserva futura",
}

const entrepreneurCards = [
  "Proteja sua ideia",
  "Organize fundadores e colaboradores",
  "Entenda propriedade intelectual",
  "Simule participação e diluição",
  "Prepare documentos iniciais",
]

const collaboratorCards = [
  "Entenda seus pontos",
  "Veja participação estimada",
  "Entenda limites de confidencialidade",
  "Saiba quando pode usar no portfólio",
  "Entenda o que ainda depende de formalização",
]

const documents = [
  ["Termo de consentimento do colaborador", "Registra que o colaborador entende o caráter experimental, educativo e ainda não societário da participação.", "Disponível no MVP"],
  ["NDA / confidencialidade", "Organiza deveres básicos de sigilo sobre informações sensíveis do projeto.", "Minuta futura"],
  ["Termo de contribuição", "Descreve entregas, evidências, pontos e regras iniciais de colaboração.", "Disponível no MVP"],
  ["Termo de uso de portfólio", "Define quando uma entrega pode ser citada publicamente pelo colaborador.", "Minuta futura"],
  ["Termo de propriedade intelectual", "Ajuda a separar autoria, cessão, licença e uso de entregas no produto.", "Minuta futura"],
  ["Acordo entre fundadores", "Alinha responsabilidades, participação esperada, saída e governança inicial.", "Minuta futura"],
  ["Vesting", "Cria regras de aquisição gradual de participação ao longo do tempo.", "Minuta futura"],
  ["Cap table inicial", "Organiza percentuais estimados antes de formalização ou investimento.", "Disponível no MVP"],
  ["Term sheet simplificado", "Resume condições principais de uma negociação futura com investidor.", "Minuta futura"],
  ["Checklist de formalização", "Lista passos práticos antes de constituir empresa ou assinar documentos.", "Disponível no MVP"],
]

const aiActions: Record<string, string> = {
  "Criar termo inicial de colaboração":
    "Resposta demonstrativa. Um termo inicial deve explicar o projeto, a contribuição esperada, a regra de pontos, confidencialidade, limites de uso em portfólio e que participação estimada ainda não é equity formal.",
  "Explicar participação estimada":
    "Resposta demonstrativa. Pontos ColabScore podem indicar uma fatia estimada dentro de um pool interno, mas isso só vira direito societário se houver empresa, contrato e instrumento jurídico específico.",
  "Simular entrada de investidor com 20%":
    "Resposta demonstrativa. Se um investidor entra com 20%, os participantes anteriores ficam com 80% do que tinham antes. Exemplo: uma fatia de 10% passa para 8%.",
  "Listar documentos antes de incluir colaboradores":
    "Resposta demonstrativa. Comece por consentimento, confidencialidade, termo de contribuição, regras de propriedade intelectual, uso de portfólio e checklist de LGPD.",
  "Explicar vesting de forma simples":
    "Resposta demonstrativa. Vesting é uma regra de aquisição gradual: a pessoa só consolida participação se permanecer contribuindo ou cumprir marcos combinados.",
}

function formatPercent(value: number) {
  return `${value.toFixed(2).replace(".00", "")}%`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function LegalEquityPage() {
  const [capTable, setCapTable] = useState<CapTableInput>(initialCapTable)
  const [profit, setProfit] = useState(100000)
  const [reinvestment, setReinvestment] = useState(40)
  const [distributed, setDistributed] = useState(60)
  const [selectedDocument, setSelectedDocument] = useState(documents[0])
  const [aiResponse, setAiResponse] = useState(aiActions["Criar termo inicial de colaboração"])

  // TODO: Connect cap table simulator to real ColabScore.
  // TODO: Save Legal & Equity settings per project.
  // TODO: Generate draft documents using ColabAI.
  // TODO: Export documents to PDF.
  // TODO: Track accepted documents per collaborator.
  // TODO: Add electronic signature integration.
  // TODO: Add legal/accounting expert marketplace.

  const preInvestmentRows = useMemo(() => {
    const keys: CapTableKey[] = ["founder", "cofounders", "colabScorePool", "platform", "futureReserve"]
    return keys.map((key) => ({ label: participantLabels[key], share: capTable[key] }))
  }, [capTable])

  const preInvestmentTotal = preInvestmentRows.reduce((total, row) => total + row.share, 0)
  const dilutionFactor = 1 - capTable.investor / 100
  const postInvestmentRows = [
    ...preInvestmentRows.map((row) => ({
      label: row.label,
      share: Math.max(0, row.share * dilutionFactor),
    })),
    { label: "Investidor futuro", share: capTable.investor },
  ]
  const distributedAmount = profit * (distributed / 100)

  const updateCapTable = (key: keyof CapTableInput, value: string) => {
    setCapTable((current) => ({ ...current, [key]: Number(value) || 0 }))
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit">Conteúdo educativo — não substitui advogado, contador ou consultor especializado.</Badge>
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground md:text-4xl">
                <Scale className="h-8 w-8 text-primary" />
                Legal & Equity Hub
              </h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Entenda direitos, participação, lucros, propriedade intelectual e cenários futuros antes de formalizar o projeto.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card className="border-primary/30 bg-card">
          <CardContent className="grid gap-3 pt-6 text-sm text-muted-foreground md:grid-cols-2">
            <p>Participação estimada por ColabScore não é automaticamente participação societária legal.</p>
            <p>Equity formal exige contratos, constituição de empresa, acordo societário e revisão profissional.</p>
            <p>Documentos gerados por IA são apenas minutas iniciais e precisam de revisão especializada.</p>
            <p>Distribuição de lucro depende de contabilidade, impostos, caixa, contratos e decisões da empresa.</p>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Para o empreendedor</CardTitle>
              <CardDescription>Organize riscos, acordos e próximos passos antes da formalização.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {entrepreneurCards.map((item) => (
                <div key={item} className="rounded-md border border-border bg-background p-3 text-sm text-foreground">{item}</div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Para o colaborador</CardTitle>
              <CardDescription>Entenda pontos, limites e o que ainda depende de instrumento jurídico.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {collaboratorCards.map((item) => (
                <div key={item} className="rounded-md border border-border bg-background p-3 text-sm text-foreground">{item}</div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Documentos essenciais</CardTitle>
            <CardDescription>Exemplos educativos, não contratos prontos para assinatura.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              {documents.map((document) => (
                <Card key={document[0]} className="border-border bg-background">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-foreground">{document[0]}</h3>
                      <Badge variant={document[2] === "Disponível no MVP" ? "secondary" : "outline"}>{document[2]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{document[1]}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDocument(document)}>
                      Ver exemplo
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="rounded-md border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">{selectedDocument[0]}</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{selectedDocument[1]}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Exemplo educativo: este documento deveria explicar objetivo, partes envolvidas, responsabilidades, limites, evidências e necessidade de revisão profissional antes de qualquer assinatura.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Simulador de cap table e diluição</CardTitle>
            <CardDescription>Simule percentuais antes e depois da entrada de um investidor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              {(Object.keys(participantLabels) as CapTableKey[]).map((key) => (
                <div key={key} className="space-y-2">
                  <Label>{participantLabels[key]} %</Label>
                  <Input type="number" value={capTable[key]} onChange={(event) => updateCapTable(key, event.target.value)} className="bg-input" />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Investidor futuro %</Label>
                <Input type="number" value={capTable.investor} onChange={(event) => updateCapTable("investor", event.target.value)} className="bg-input" />
              </div>
            </div>

            {preInvestmentTotal !== 100 && (
              <p className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm text-muted-foreground">
                Atenção: os percentuais pré-investimento somam {formatPercent(preInvestmentTotal)}, não 100%.
              </p>
            )}
            {capTable.investor > 50 && (
              <p className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm text-muted-foreground">
                Atenção: investidor acima de 50% pode alterar controle e governança do projeto.
              </p>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <CapTable title="Antes do investimento" rows={preInvestmentRows} />
              <CapTable title="Depois do investimento" rows={postInvestmentRows} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Simulador de distribuição de lucros</CardTitle>
            <CardDescription>Estimativa simples usando o cap table pós-investimento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Lucro distribuível</Label>
                <Input type="number" value={profit} onChange={(event) => setProfit(Number(event.target.value) || 0)} className="bg-input" />
              </div>
              <div className="space-y-2">
                <Label>Reinvestimento %</Label>
                <Input type="number" value={reinvestment} onChange={(event) => setReinvestment(Number(event.target.value) || 0)} className="bg-input" />
              </div>
              <div className="space-y-2">
                <Label>Distribuído %</Label>
                <Input type="number" value={distributed} onChange={(event) => setDistributed(Number(event.target.value) || 0)} className="bg-input" />
              </div>
            </div>
            {reinvestment + distributed !== 100 && (
              <p className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm text-muted-foreground">
                Reinvestimento e distribuição somam {reinvestment + distributed}%. Ajuste para 100% se quiser uma simulação fechada.
              </p>
            )}
            <p className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
              Lucro distribuível depende de contabilidade, caixa, impostos, contrato social e decisão societária.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 text-left text-sm text-muted-foreground">Participante</th>
                    <th className="py-2 text-right text-sm text-muted-foreground">Participação</th>
                    <th className="py-2 text-right text-sm text-muted-foreground">Valor estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {postInvestmentRows.map((row) => (
                    <tr key={row.label} className="border-b border-border/50">
                      <td className="py-2 text-sm text-foreground">{row.label}</td>
                      <td className="py-2 text-right text-sm text-muted-foreground">{formatPercent(row.share)}</td>
                      <td className="py-2 text-right text-sm font-medium text-foreground">{formatCurrency(distributedAmount * (row.share / 100))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Meus direitos neste projeto</CardTitle>
              <CardDescription>Exemplo educativo para colaboradores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Você possui 2.500 pontos no projeto. Isso pode representar 1,2% de participação estimada dentro do Pool ColabScore. Essa participação ainda não é societária formal.
              </p>
              <p>Para ser formalizada, o projeto precisa atingir maturidade, constituir empresa e assinar instrumento jurídico específico.</p>
              <p className="rounded-md border border-border bg-background p-3">In future versions, this section will connect directly to real ColabScore data.</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Proteção e governança do projeto</CardTitle>
              <CardDescription>Checklist mínimo antes de avançar juridicamente.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {[
                "Quem teve acesso à ideia?",
                "Quem aceitou termos?",
                "Quais entregas geraram propriedade intelectual?",
                "Quais colaboradores têm pontos?",
                "Quais documentos estão pendentes?",
                "O projeto precisa de advogado/contador?",
                "Existe previsão de investidor?",
              ].map((item) => (
                <label key={item} className="flex items-center gap-3 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                  <input type="checkbox" className="h-4 w-4" />
                  {item}
                </label>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Agente jurídico-societário
            </CardTitle>
            <CardDescription>Use IA para organizar perguntas, gerar checklists e preparar minutas iniciais.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="grid gap-2">
              {Object.keys(aiActions).map((action) => (
                <Button key={action} type="button" variant="outline" onClick={() => setAiResponse(aiActions[action])}>
                  {action}
                </Button>
              ))}
            </div>
            <div className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
              <Badge variant="outline">Resposta demonstrativa. Em versão futura, este agente será integrado ao ColabAI.</Badge>
              <p className="mt-4">{aiResponse}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Cuidados jurídicos e limitações
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
            {[
              "As informações são educativas e organizacionais.",
              "A plataforma não substitui advogado, contador ou consultor especializado.",
              "Documentos gerados por IA são minutas iniciais.",
              "Qualquer assinatura deve ser revisada por profissional habilitado.",
              "Participação estimada não significa participação societária formal.",
              "Distribuição de lucros depende de empresa formalizada, contabilidade e contrato.",
              "Propriedade intelectual deve ser regulada por instrumento jurídico específico.",
              "Dados pessoais e documentos devem respeitar a LGPD.",
            ].map((item) => (
              <div key={item} className="rounded-md border border-border bg-background p-3">{item}</div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function CapTable({ title, rows }: { title: string; rows: Array<{ label: string; share: number }> }) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <h3 className="mb-3 font-semibold text-foreground">{title}</h3>
      <table className="w-full">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border/50 last:border-0">
              <td className="py-2 text-sm text-muted-foreground">{row.label}</td>
              <td className="py-2 text-right text-sm font-medium text-foreground">{formatPercent(row.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
