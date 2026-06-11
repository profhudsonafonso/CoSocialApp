const flowSteps = [
  { key: "Ideia", shortLabel: "Ideia" },
  { key: "Validação", shortLabel: "Validação" },
  { key: "Squad", shortLabel: "Squad" },
  { key: "Tarefas GitHub", shortLabel: "Tarefas" },
  { key: "Evidências", shortLabel: "Evidências" },
  { key: "ColabScore", shortLabel: "Score" },
  { key: "Legal & Equity", shortLabel: "Legal" },
  { key: "Maturity Hub", shortLabel: "Maturity" },
  { key: "Editais e Investimento", shortLabel: "Editais" },
  { key: "Startup", shortLabel: "Startup" },
]

interface MiniFlowPositionProps {
  currentStep: string
}

export function MiniFlowPosition({ currentStep }: MiniFlowPositionProps) {
  const currentIndex = flowSteps.findIndex((step) => step.key === currentStep)

  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Onde este módulo entra no fluxo
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {flowSteps.map((step, index) => {
          const isCurrent = step.key === currentStep
          const isCompleted = currentIndex >= 0 && index < currentIndex

          return (
            <div key={step.key} className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : isCompleted
                      ? "border-secondary/50 bg-secondary/10 text-secondary"
                      : "border-border bg-card text-muted-foreground"
                }`}
                aria-current={isCurrent ? "step" : undefined}
                title={step.key}
              >
                {step.shortLabel}
              </span>
              {index < flowSteps.length - 1 && <span className="text-muted-foreground/50">/</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
