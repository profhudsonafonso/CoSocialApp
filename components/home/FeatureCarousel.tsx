"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { FeatureCardVisual } from "@/components/home/FeatureCardVisual"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface FeatureSlide {
  eyebrow: string
  title: string
  subtitle: string
  bullets: string[]
  cta: string
  href: string
  stageBadge?: string
  visualSrc?: string
  visualAlt?: string
  isFlowImage?: boolean
}

const slides: FeatureSlide[] = [
  {
    eyebrow: "Fluxo completo CoSocial",
    title: "Da ideia à startup",
    subtitle: "Um fluxo integrado para transformar um rabisco inicial em MVP, projeto validado ou empresa.",
    bullets: [],
    cta: "Explorar o fluxo",
    href: "#platform-flow",
    isFlowImage: true,
  },
  {
    eyebrow: "Business Validation",
    title: "Validação de Negócio",
    subtitle: "Compare sua ideia com soluções similares, concorrentes, sinais de mercado e plataformas de investimento.",
    bullets: ["Busca evidências externas", "Analisa novidade, risco e diferenciação", "Gera relatório crítico para decisão"],
    cta: "Validar uma ideia",
    href: "/validar-negocio",
    stageBadge: "Validação",
    visualSrc: "/home/feature-cards/card2.png",
    visualAlt: "Ilustração da Validação de Negócio com evidências externas e relatório crítico",
  },
  {
    eyebrow: "GitHub + colaboração",
    title: "Contribuição por tarefas",
    subtitle: "Transforme ideias em issues, branches, commits e evidências verificáveis.",
    bullets: ["Colaboradores escolhem tarefas", "Entregas ficam registradas", "Revisores aceitam ou pedem ajustes"],
    cta: "Ver projetos para contribuir",
    href: "/contribuir/projetos",
    stageBadge: "Execução",
    visualSrc: "/home/feature-cards/card3.png",
    visualAlt: "Ilustração do fluxo de contribuição por tarefas com issues, branches, commits e revisão",
  },
  {
    eyebrow: "Pontuação e reputação",
    title: "ColabScore",
    subtitle: "Meça contribuições por horas, entrega, impacto, risco e evidências aceitas.",
    bullets: ["Pontuação por projeto", "Base para reputação", "Histórico de entregas aceitas"],
    cta: "Configurar ColabScore",
    href: "/responsavel/colabscore",
    stageBadge: "Pontuação",
    visualSrc: "/home/feature-cards/card4.png",
    visualAlt: "Ilustração do painel ColabScore com pontuação, reputação e entregas aceitas",
  },
  {
    eyebrow: "Assistente de IA",
    title: "ColabAI Assist",
    subtitle: "Use IA para entender tarefas, gerar planos, criar Prompt Packs e revisar entregas.",
    bullets: ["Assistente por issue", "Prompt Pack para IDE", "Créditos internos de IA"],
    cta: "Abrir ColabAI",
    href: "/colabai",
    stageBadge: "IA para colaboração",
    visualSrc: "/home/feature-cards/card5.png",
    visualAlt: "Ilustração do ColabAI Assist com plano técnico, Prompt Pack e revisão de entrega",
  },
  {
    eyebrow: "Governança inicial",
    title: "Legal & Equity Hub",
    subtitle: "Entenda participação, documentos, cap table, diluição e direitos dos colaboradores.",
    bullets: ["Simulador de participação", "Documentos essenciais", "Avisos jurídicos e governança"],
    cta: "Abrir Legal & Equity",
    href: "/legal-equity",
    stageBadge: "Governança",
    visualSrc: "/home/feature-cards/card6.png",
    visualAlt: "Ilustração do Legal & Equity Hub com cap table, diluição e documentos",
  },
  {
    eyebrow: "Maturidade do projeto",
    title: "Maturity & Investment Hub",
    subtitle: "Meça maturidade técnica, comercial, financeira, jurídica e prontidão para investimento.",
    bullets: ["Startup Maturity Index", "Investor Readiness Report", "Próximos passos para captação"],
    cta: "Abrir Maturity Hub",
    href: "/maturity-investment",
    stageBadge: "Maturidade",
    visualSrc: "/home/feature-cards/card7.png",
    visualAlt: "Ilustração do Maturity & Investment Hub com índice de maturidade e relatório para investidores",
  },
  {
    eyebrow: "Editais e financiamento",
    title: "Editais e Financiamento",
    subtitle: "Encontre editais, subvenções, aceleração, grants e oportunidades compatíveis.",
    bullets: ["Filtros por área, estado e estágio", "Match Score de editais", "Checklist e alerta por e-mail"],
    cta: "Buscar oportunidades",
    href: "/funding-opportunities",
    stageBadge: "Financiamento",
    visualSrc: "/home/feature-cards/card8.png",
    visualAlt: "Ilustração do Funding Opportunities Hub com editais, filtros, match score e alertas",
  },
]

export function FeatureCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused) {
      return
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, 6000)

    return () => window.clearInterval(interval)
  }, [isPaused])

  const slide = slides[activeIndex]
  const isFlowImageSlide = Boolean(slide.isFlowImage)

  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length)
  }

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % slides.length)
  }

  return (
    <section id="modules" className="py-20 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="outline" className="mb-3">
              Módulos da plataforma
            </Badge>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">O que dá para fazer no CoSocial</h2>
          </div>
          <p className="max-w-2xl text-muted-foreground">
            Entenda a jornada completa e acesse rapidamente os módulos que já estão disponíveis.
          </p>
        </div>

        <Card
          className="overflow-hidden border-border bg-card"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <CardContent className="p-0">
            <div className={`grid gap-0 ${isFlowImageSlide ? "min-h-[430px] lg:grid-cols-[0.72fr_1.28fr]" : "min-h-[520px] items-center lg:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)]"}`}>
              <div className="flex min-w-0 flex-col justify-between p-6 sm:p-8 lg:p-10">
                <div>
                  <div className="mb-5 flex flex-wrap gap-2">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{slide.eyebrow}</Badge>
                    {slide.stageBadge && (
                      <Badge variant="outline" className="border-secondary/40 text-secondary">
                        {slide.stageBadge}
                      </Badge>
                    )}
                  </div>
                  <h3 className="max-w-3xl text-3xl font-bold leading-tight text-foreground md:text-5xl">
                    {slide.title}
                  </h3>
                  <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                    {slide.subtitle}
                  </p>

                  {!isFlowImageSlide && (
                    <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                      {slide.bullets.map((bullet) => (
                        <li key={bullet} className="rounded-xl border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button className="w-fit bg-primary hover:bg-primary/90" asChild>
                    <a href={slide.href}>
                      {slide.cta}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" aria-label="Slide anterior" onClick={goToPrevious}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" aria-label="Próximo slide" onClick={goToNext}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className={`relative min-w-0 border-t border-border bg-gradient-to-br from-primary/15 via-background to-secondary/20 lg:border-l lg:border-t-0 ${
                isFlowImageSlide ? "min-h-[240px] p-6 lg:p-10" : "min-h-[320px] p-4 sm:p-6 lg:min-h-[520px] lg:p-8"
              }`}>
                <div className="absolute right-6 top-6 z-20 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground shadow-sm">
                  {activeIndex + 1}/{slides.length}
                </div>
                {isFlowImageSlide ? (
                  <div className="flex h-full items-center justify-center pt-8 lg:pt-0">
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-primary/10">
                      <Image
                        src="/home/cosocial-flow.png"
                        alt="Fluxo CoSocial da ideia à startup"
                        fill
                        priority
                        sizes="(min-width: 1024px) 720px, 100vw"
                        className="object-contain p-3"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center pt-10 lg:pt-0">
                    <FeatureCardVisual
                      src={slide.visualSrc ?? "/placeholder.svg"}
                      alt={slide.visualAlt ?? `${slide.title} no CoSocial`}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 flex justify-center gap-2">
          {slides.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Ir para slide ${index + 1}: ${item.title}`}
              className={`h-2.5 rounded-full transition-all ${
                activeIndex === index ? "w-8 bg-primary" : "w-2.5 bg-muted-foreground/35 hover:bg-muted-foreground/60"
              }`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
