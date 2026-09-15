import type {
  ProviderResult,
  SearchProvider,
  SearchResult,
} from '../../../contracts'

export class MockSearchProvider implements SearchProvider {
  async search(): Promise<ProviderResult<SearchResult>> {
    const results: SearchResult[] = [
      {
        id: 'mock-web-1',
        title: 'Cape Town Weekend Activity Guide',
        type: 'web',
        description: 'A web result describing activities in Cape Town.',
        url: 'https://example.com/mock-web-1',
        source: 'mock-web',
        location: {
          name: 'Cape Town',
          address: 'Cape Town, Western Cape',
          latitude: null,
          longitude: null,
        },
        date: null,
        time: null,
        price: null,
        currency: null,
        image: null,
        metadata: {
          category: 'activities',
        },
        retrievedAt: new Date().toISOString(),
      },
    ]

    return {
      success: true,
      data: results,
      error: null,
      metadata: {
        provider: 'mock-web',
        requestId: null,
        retrievedAt: new Date().toISOString(),
        latencyMs: 0,
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
