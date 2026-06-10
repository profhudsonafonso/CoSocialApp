import { MAX_WEB_RESULTS_PER_QUERY } from './business-validation-config'

export type ConfiguredWebSearchProvider = 'tavily' | 'google_custom_search' | 'serpapi' | 'brave' | 'not_configured'

export interface NormalizedWebSearchResult {
  title: string
  url: string | null
  snippet: string
  provider: Exclude<ConfiguredWebSearchProvider, 'not_configured'>
  raw: unknown
}

export interface WebSearchRunResult {
  configuredProvider: ConfiguredWebSearchProvider
  results: NormalizedWebSearchResult[]
}

function compact(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function logWebSearch(provider: ConfiguredWebSearchProvider, query: string, resultCount: number, error?: string) {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  console.log('[business-validation-web-search]', {
    configuredProvider: provider,
    query,
    resultCount,
    error: error || null,
  })
}

export function getConfiguredWebSearchProvider(): ConfiguredWebSearchProvider {
  if (process.env.TAVILY_API_KEY) return 'tavily'
  if (process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID) return 'google_custom_search'
  if (process.env.SERPAPI_KEY) return 'serpapi'
  if (process.env.BRAVE_SEARCH_API_KEY) return 'brave'
  return 'not_configured'
}

export async function searchWithTavily(query: string): Promise<NormalizedWebSearchResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      max_results: MAX_WEB_RESULTS_PER_QUERY,
    }),
  })
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Tavily HTTP ${response.status}: ${text}`)
  }

  const payload = text ? JSON.parse(text) as { results?: Array<Record<string, unknown>> } : {}

  return (payload.results || []).map((result) => ({
    title: compact(result.title) || 'Untitled result',
    url: compact(result.url) || null,
    snippet: compact(result.content),
    provider: 'tavily' as const,
    raw: result,
  })).filter((result) => result.url || result.title !== 'Untitled result')
}

async function searchWithGoogleCustomSearch(query: string): Promise<NormalizedWebSearchResult[]> {
  const url = new URL('https://www.googleapis.com/customsearch/v1')
  url.searchParams.set('key', process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || '')
  url.searchParams.set('cx', process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID || '')
  url.searchParams.set('q', query)
  url.searchParams.set('num', String(MAX_WEB_RESULTS_PER_QUERY))

  const response = await fetch(url)
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Google Custom Search HTTP ${response.status}: ${text}`)
  }

  const payload = text ? JSON.parse(text) as { items?: Array<Record<string, unknown>> } : {}

  return (payload.items || []).map((item) => ({
    title: compact(item.title) || 'Google result',
    url: compact(item.link) || null,
    snippet: compact(item.snippet),
    provider: 'google_custom_search' as const,
    raw: item,
  })).filter((result) => result.url || result.title !== 'Google result')
}

async function searchWithSerpApi(query: string): Promise<NormalizedWebSearchResult[]> {
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('api_key', process.env.SERPAPI_KEY || '')
  url.searchParams.set('q', query)
  url.searchParams.set('num', String(MAX_WEB_RESULTS_PER_QUERY))

  const response = await fetch(url)
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`SerpAPI HTTP ${response.status}: ${text}`)
  }

  const payload = text ? JSON.parse(text) as { organic_results?: Array<Record<string, unknown>> } : {}

  return (payload.organic_results || []).map((result) => ({
    title: compact(result.title) || 'SerpAPI result',
    url: compact(result.link) || null,
    snippet: compact(result.snippet),
    provider: 'serpapi' as const,
    raw: result,
  })).filter((result) => result.url || result.title !== 'SerpAPI result')
}

async function searchWithBrave(query: string): Promise<NormalizedWebSearchResult[]> {
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${MAX_WEB_RESULTS_PER_QUERY}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY || '',
      },
    },
  )
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Brave HTTP ${response.status}: ${text}`)
  }

  const payload = text ? JSON.parse(text) as { web?: { results?: Array<Record<string, unknown>> } } : {}

  return (payload.web?.results || []).map((result) => ({
    title: compact(result.title) || 'Brave result',
    url: compact(result.url) || null,
    snippet: compact(result.description),
    provider: 'brave' as const,
    raw: result,
  })).filter((result) => result.url || result.title !== 'Brave result')
}

export async function runConfiguredWebSearch(query: string): Promise<WebSearchRunResult> {
  const configuredProvider = getConfiguredWebSearchProvider()

  try {
    if (configuredProvider === 'tavily') {
      const results = await searchWithTavily(query)
      logWebSearch(configuredProvider, query, results.length)
      return { configuredProvider, results }
    }

    if (configuredProvider === 'google_custom_search') {
      const results = await searchWithGoogleCustomSearch(query)
      logWebSearch(configuredProvider, query, results.length)
      return { configuredProvider, results }
    }

    if (configuredProvider === 'serpapi') {
      const results = await searchWithSerpApi(query)
      logWebSearch(configuredProvider, query, results.length)
      return { configuredProvider, results }
    }

    if (configuredProvider === 'brave') {
      const results = await searchWithBrave(query)
      logWebSearch(configuredProvider, query, results.length)
      return { configuredProvider, results }
    }

    logWebSearch(configuredProvider, query, 0, 'No web search provider configured.')
    return { configuredProvider, results: [] }
  } catch (error) {
    logWebSearch(
      configuredProvider,
      query,
      0,
      error instanceof Error ? error.message : 'Web search provider failed.',
    )
    throw error
  }
}
