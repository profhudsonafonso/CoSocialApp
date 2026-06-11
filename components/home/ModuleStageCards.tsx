import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const stages = [
  {
    title: "Ideia inicial",
    description: "Quando a pergunta principal ainda é se a oportunidade merece energia.",
    modules: ["Business Validation", "Funding Opportunities for pre-incubation", "ColabAI for pitch/questions"],
    href: "/validar-negocio",
  },
  {
    title: "MVP em construção",
    description: "Quando o projeto precisa de execução rastreável, revisão e reputação.",
    modules: ["GitHub tasks", "ColabScore", "ColabAI Assist", "Dashboard"],
    href: "/contribuir/projetos",
  },
  {
    title: "MVP validado",
    description: "Quando já existe entrega e o foco passa a ser estrutura e crescimento.",
    modules: ["Maturity & Investment Hub", "Legal & Equity Hub", "Funding Opportunities Hub"],
    href: "/maturity-investment",
  },
  {
    title: "Pronto para captação",
    description: "Quando é hora de organizar evidências para editais, investidores ou parceiros.",
    modules: ["Investor Readiness Report", "Legal & Equity", "Funding Opportunities", "Business Validation report"],
    href: "/funding-opportunities",
  },
]

export function ModuleStageCards() {
  return (
    <section id="module-stages" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-3">
            Maturidade do projeto
          </Badge>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">Use o módulo certo para cada estágio</h2>
          <p className="mx-auto mt-3 max-w-3xl text-lg text-muted-foreground">
            O CoSocial não obriga um caminho único: escolha o módulo que responde à próxima pergunta do projeto.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => (
            <Card key={stage.title} className="border-border bg-card">
              <CardContent className="flex h-full flex-col p-6">
                <h3 className="text-xl font-semibold text-foreground">{stage.title}</h3>
                <p className="mt-3 min-h-[72px] text-sm leading-6 text-muted-foreground">{stage.description}</p>
                <div className="mt-5 flex flex-1 flex-col gap-2">
                  {stage.modules.map((module) => (
                    <span key={module} className="rounded-full border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                      {module}
                    </span>
                  ))}
                </div>
                <a href={stage.href} className="mt-6 text-sm font-medium text-primary hover:underline">
                  Ver módulo recomendado
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
