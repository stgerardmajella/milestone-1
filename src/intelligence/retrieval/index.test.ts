import { describe, expect, it } from 'vitest'
import type {
  EventProvider,
  ProviderResult,
  QueryIntent,
  SearchResult,
} from '../contracts'
import { createMockProviderRegistry } from '../container/mock'
import { CompositeEventProvider } from '../providers/events/composite'
import { retrieveResults } from './index'

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

function eventResult(
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
        description: `Event supplied by ${provider}.`,
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
        price: 100,
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

class SecondaryEventProvider implements EventProvider {
  async searchEvents(): Promise<ProviderResult<SearchResult>> {
    return eventResult('secondary-events', 'secondary-event-1')
  }
}

describe('Events retrieval integration', () => {
  it('retrieves events from multiple providers through the composite registry provider', async () => {
    const providers = createMockProviderRegistry()

    providers.events = new CompositeEventProvider([
      providers.events,
      new SecondaryEventProvider(),
    ])

    const response = await retrieveResults(intent, providers)

    expect(response.results).toHaveLength(2)

    expect(
      response.results.map((item) => item.result.id).sort(),
    ).toEqual([
      'mock-event-1',
      'secondary-event-1',
    ])

    expect(response.results.every(
      (item) => item.result.type === 'event',
    )).toBe(true)

    expect(response.results.every(
      (item) => item.result.metadata.verification !== undefined,
    )).toBe(true)

    expect(response.results.map(
      (item) => item.rank,
    )).toEqual([1, 2])

    expect(response.providers).toHaveLength(1)
    expect(response.providers[0].success).toBe(true)
    expect(response.providers[0].resultCount).toBe(2)
  })
})
