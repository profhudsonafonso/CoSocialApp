import {
  BarChart3,
  BrainCircuit,
  Calculator,
  ClipboardCheck,
  FileText,
  HandCoins,
  LayoutDashboard,
  Lightbulb,
  Scale,
  Search,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const groups = [
  {
    title: "Tenho uma ideia",
    items: [
      { icon: Lightbulb, title: "Cadastrar ideia", description: "Registre problema, público e proposta inicial.", cta: "Cadastrar", href: "#cadastrar-ideia" },
      { icon: Search, title: "Validar negócio", description: "Teste novidade, risco e diferenciação com evidências.", cta: "Validar", href: "/validar-negocio" },
      { icon: HandCoins, title: "Buscar editais", description: "Encontre oportunidades por estágio, área e região.", cta: "Buscar", href: "/funding-opportunities" },
    ],
  },
  {
    title: "Quero contribuir",
    items: [
      { icon: Users, title: "Ver projetos", description: "Veja projetos com repositórios GitHub conectados.", cta: "Ver projetos", href: "/contribuir/projetos" },
      { icon: ClipboardCheck, title: "Pegar uma tarefa", description: "Escolha uma issue e gere sua branch de trabalho.", cta: "Escolher tarefa", href: "/contribuir/projetos" },
      { icon: BrainCircuit, title: "Usar ColabAI", description: "Entenda tarefas e gere planos ou Prompt Packs.", cta: "Abrir IA", href: "/colabai" },
    ],
  },
  {
    title: "Sou responsável por projeto",
    items: [
      { icon: ClipboardCheck, title: "Revisar entregas", description: "Aceite, rejeite e registre comentários de revisão.", cta: "Revisar", href: "/responsavel/revisar" },
      { icon: Calculator, title: "Configurar ColabScore", description: "Ajuste critérios de pontuação por projeto e issue.", cta: "Configurar", href: "/responsavel/colabscore" },
      { icon: LayoutDashboard, title: "Acompanhar dashboard", description: "Veja projetos, tarefas aceitas e pontos concedidos.", cta: "Ver dashboard", href: "#dashboard" },
    ],
  },
  {
    title: "Quero preparar a startup",
    items: [
      { icon: Scale, title: "Legal & Equity", description: "Organize participação, documentos e governança.", cta: "Abrir hub", href: "/legal-equity" },
      { icon: BarChart3, title: "Maturity Hub", description: "Meça maturidade e prontidão para investimento.", cta: "Medir", href: "/maturity-investment" },
      { icon: FileText, title: "Investor Readiness", description: "Prepare próximos passos e evidências para captação.", cta: "Preparar", href: "/maturity-investment" },
    ],
  },
]

export function QuickAccessGrid() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">Acesse rapidamente</h2>
          <p className="mt-3 text-lg text-muted-foreground">Escolha o que deseja fazer agora.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.title} className="border-border bg-card">
              <CardContent className="p-5 sm:p-6">
                <h3 className="text-lg font-semibold text-foreground">{group.title}</h3>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {group.items.map((item) => (
                    <a
                      key={item.title}
                      href={item.href}
                      className="group flex min-h-[210px] flex-col rounded-2xl border border-border bg-background p-4 transition hover:border-primary/60 hover:bg-primary/5"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h4 className="mt-4 font-semibold text-foreground">{item.title}</h4>
                      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full border-border group-hover:border-primary group-hover:bg-primary/10"
                        tabIndex={-1}
                      >
                        {item.cta}
                      </Button>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
