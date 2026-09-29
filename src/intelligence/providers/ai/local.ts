import type {
  AIProvider,
  ProviderMetadata,
  ProviderResult,
  QueryIntent,
} from '../../contracts'
import { parseSearchQuery } from '../../../lib/parser'

function createMetadata(startedAt: number): ProviderMetadata {
  return {
    provider: 'local-parser',
    requestId: null,
    retrievedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    usage: {
      inputUnits: null,
      outputUnits: null,
      requests: 1,
    },
    estimatedCostZar: 0,
  }
}

function detectQueryCategory(
  query: string,
): QueryIntent['category'] {
  const lowerQuery = query.toLowerCase()

  const eventTerms = [
    'event',
    'events',
    'concert',
    'concerts',
    'festival',
    'festivals',
    'gig',
    'gigs',
    'show',
    'shows',
  ]

  if (eventTerms.some((term) => lowerQuery.includes(term))) {
    return 'events'
  }

  return 'activities'
}

export class LocalAIProvider implements AIProvider {
  async understandQuery(
    query: string,
  ): Promise<ProviderResult<QueryIntent>> {
    const startedAt = Date.now()
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      return {
        success: false,
        data: [],
        error: {
          code: 'INVALID_REQUEST',
          message: 'Query cannot be empty.',
          retryable: false,
        },
        metadata: createMetadata(startedAt),
      }
    }

    try {
      const parsed = parseSearchQuery(trimmedQuery)

      const intent: QueryIntent = {
        category: detectQueryCategory(trimmedQuery),
        intent: parsed.intent,
        location: parsed.location,
        dateRange: {
          from: parsed.dateFrom ?? parsed.date,
          to: parsed.dateTo ?? parsed.date,
        },
        timeRange: {
          from: null,
          to: null,
        },
        people: parsed.people,
        audience: parsed.relationship,
        budget: {
          max: parsed.budget,
          currency: 'ZAR',
        },
        preferences: parsed.preferences,
        keywords: [],
        constraints: [],
      }

      return {
        success: true,
        data: [intent],
        error: null,
        metadata: createMetadata(startedAt),
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        error: {
          code: 'PROVIDER_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Local query understanding failed.',
          retryable: false,
        },
        metadata: createMetadata(startedAt),
      }
    }
  }
}
