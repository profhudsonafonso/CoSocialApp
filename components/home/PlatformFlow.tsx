import { ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const steps = [
  { title: "Cadastre a ideia", description: "Comece registrando problema, público, estágio e repositório quando existir.", href: "#cadastrar-ideia" },
  { title: "Valide problema, mercado e concorrentes", description: "Use evidências externas para decidir se vale avançar.", href: "/validar-negocio" },
  { title: "Transforme o projeto em tarefas", description: "Converta o trabalho em issues GitHub sincronizadas.", href: "/contribuir/projetos" },
  { title: "Conecte colaboradores", description: "Pessoas escolhem tarefas e recebem branch e claim key.", href: "/contribuir/projetos" },
  { title: "Registre entregas e evidências", description: "Commits, PRs e revisões formam um histórico verificável.", href: "/responsavel/revisar" },
  { title: "Calcule ColabScore", description: "Configure pontos por entrega aceita e mantenha reputação por projeto.", href: "/responsavel/colabscore" },
  { title: "Organize direitos e participação", description: "Simule cap table, documentos essenciais e governança inicial.", href: "/legal-equity" },
  { title: "Meça maturidade", description: "Avalie prontidão técnica, comercial, financeira, jurídica e de investimento.", href: "/maturity-investment" },
  { title: "Busque editais ou investimento", description: "Mapeie oportunidades, requisitos e próximos passos de captação.", href: "/funding-opportunities" },
]

export function PlatformFlow() {
  return (
    <section id="platform-flow" className="py-20 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">Como o CoSocial organiza a jornada</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Uma sequência simples para sair da ideia solta e chegar a um projeto com evidências, contribuição registrada e próximos caminhos de crescimento.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="border-border bg-card">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  {index < steps.length - 1 && <ArrowRight className="hidden h-4 w-4 text-muted-foreground md:block" />}
                </div>
                <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 min-h-[72px] text-sm leading-6 text-muted-foreground">{step.description}</p>
                <a href={step.href} className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
                  Abrir etapa
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
