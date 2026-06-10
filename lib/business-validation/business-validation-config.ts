function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback)

  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

export const MAX_INVESTMENT_QUERIES_PER_RUN = numberFromEnv('MAX_INVESTMENT_QUERIES_PER_RUN', 3)
export const MAX_WEB_RESULTS_PER_QUERY = numberFromEnv('MAX_WEB_RESULTS_PER_QUERY', 3)
export const MAX_TOTAL_INVESTMENT_RESULTS = numberFromEnv('MAX_TOTAL_INVESTMENT_RESULTS', 10)
