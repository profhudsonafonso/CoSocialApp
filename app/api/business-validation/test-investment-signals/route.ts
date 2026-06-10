import { NextResponse } from 'next/server'
import {
  getConfiguredWebSearchProvider,
  runConfiguredWebSearch,
} from '@/lib/business-validation/web-search-providers'

export async function GET() {
  const query = 'site:captable.com.br startup inovação'
  const configuredProvider = getConfiguredWebSearchProvider()

  if (configuredProvider === 'not_configured') {
    return NextResponse.json({
      configuredProvider,
      hasTavilyKey: Boolean(process.env.TAVILY_API_KEY),
      sourceStatuses: [
        {
          source_type: 'investment_signals',
          attempted: false,
          success: false,
          result_count: 0,
          error_message: 'No web search provider configured',
        },
      ],
      results: [],
    })
  }

  try {
    const result = await runConfiguredWebSearch(query)

    return NextResponse.json({
      configuredProvider: result.configuredProvider,
      hasTavilyKey: Boolean(process.env.TAVILY_API_KEY),
      sourceStatuses: [
        {
          source_type: 'investment_signals',
          attempted: true,
          success: true,
          result_count: result.results.length,
          error_message: null,
        },
      ],
      results: result.results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Investment signal test failed.'

    return NextResponse.json(
      {
        configuredProvider,
        hasTavilyKey: Boolean(process.env.TAVILY_API_KEY),
        sourceStatuses: [
          {
            source_type: 'investment_signals',
            attempted: true,
            success: false,
            result_count: 0,
            error_message: message,
          },
        ],
        results: [],
      },
      { status: 500 },
    )
  }
}
