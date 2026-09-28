import { describe, expect, it } from 'vitest'
import type {
  EventProvider,
  ProviderResult,
  QueryIntent,
  SearchResult,
} from '../../contracts'
import { CompositeEventProvider } from './composite'

const intent: QueryIntent = {
  category: 'events',
  intent: 'Find events in Cape Town',
  location: 'Cape Town',
  dateRange: {
    from: null,
    to: null,
  },
  timeRange: {
    from: null,
    to: null,
  },
  people: 2,
  audience: null,
  budget: {
    max: 500,
    currency: 'ZAR',
  },
  preferences: [],
  keywords: ['events'],
  constraints: [],
}

function result(
  provider: string,
  id: string,
): ProviderResult<SearchResult> {
  return {
    success: true,
    data: [
      {
        id,
        title: id,
        type: 'event',
        description: null,
        url: null,
        source: provider,
        location: {
          name: 'Cape Town',
          address: null,
          latitude: null,
          longitude: null,
        },
        date: null,
        time: null,
        price: null,
        currency: 'ZAR',
        image: null,
        metadata: {},
        retrievedAt: new Date().toISOString(),
      },
    ],
    error: null,
    metadata: {
      provider,
      requestId: null,
      retrievedAt: new Date().toISOString(),
      latencyMs: 1,
      usage: {
        inputUnits: null,
        outputUnits: null,
        requests: 1,
      },
      estimatedCostZar: 0,
    },
  }
}

class SuccessfulProvider implements EventProvider {
  private readonly provider: string
  private readonly id: string

  constructor(provider: string, id: string) {
    this.provider = provider
    this.id = id
  }

  async searchEvents(): Promise<ProviderResult<SearchResult>> {
    return result(this.provider, this.id)
  }
}

class FailingProvider implements EventProvider {
  async searchEvents(): Promise<ProviderResult<SearchResult>> {
    return {
      success: false,
      data: [],
      error: {
        code: 'NETWORK',
        message: 'Provider unavailable',
        retryable: true,
      },
      metadata: {
        provider: 'failing-events',
        requestId: null,
        retrievedAt: new Date().toISOString(),
        latencyMs: 1,
        usage: {
          inputUnits: null,
          outputUnits: null,
          requests: 1,
        },
        estimatedCostZar: 0,
      },
    }
  }
}

describe('CompositeEventProvider', () => {
  it('aggregates successful results from multiple event providers', async () => {
    const provider = new CompositeEventProvider([
      new SuccessfulProvider('source-a', 'event-a'),
      new SuccessfulProvider('source-b', 'event-b'),
    ])

    const response = await provider.searchEvents(intent)

    expect(response.success).toBe(true)
    expect(response.data).toHaveLength(2)
    expect(response.data.map((item) => item.id)).toEqual([
      'event-a',
      'event-b',
    ])
    expect(response.metadata.provider).toBe('events-composite')
    expect(response.metadata.usage.requests).toBe(2)
  })

  it('keeps successful results when one provider fails', async () => {
    const provider = new CompositeEventProvider([
      new SuccessfulProvider('source-a', 'event-a'),
      new FailingProvider(),
    ])

    const response = await provider.searchEvents(intent)

    expect(response.success).toBe(true)
    expect(response.data).toHaveLength(1)
    expect(response.data[0].id).toBe('event-a')
    expect(response.error).toBeNull()
  })

  it('reports failure when every provider fails', async () => {
    const provider = new CompositeEventProvider([
      new FailingProvider(),
      new FailingProvider(),
    ])

    const response = await provider.searchEvents(intent)

    expect(response.success).toBe(false)
    expect(response.data).toEqual([])
    expect(response.error?.code).toBe('NETWORK')
  })

  it('returns a successful empty result when there are no providers', async () => {
    const provider = new CompositeEventProvider([])

    const response = await provider.searchEvents(intent)

    expect(response.success).toBe(true)
    expect(response.data).toEqual([])
    expect(response.error).toBeNull()
  })
})
