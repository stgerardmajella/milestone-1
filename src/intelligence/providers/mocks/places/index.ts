import type {
  PlaceProvider,
  ProviderResult,
  SearchResult,
} from '../../../contracts'

export class MockPlaceProvider implements PlaceProvider {
  async searchPlaces(): Promise<ProviderResult<SearchResult>> {
    const results: SearchResult[] = [
      {
        id: 'mock-place-1',
        title: 'Cape Town Waterfront Restaurant',
        type: 'place',
        description: 'A restaurant in Cape Town suitable for an outing.',
        url: 'https://example.com/mock-place-1',
        source: 'mock-places',
        location: {
          name: 'Cape Town',
          address: 'Cape Town, Western Cape',
          latitude: null,
          longitude: null,
        },
        date: null,
        time: null,
        price: 350,
        currency: 'ZAR',
        image: null,
        metadata: {
          category: 'restaurant',
        },
        retrievedAt: new Date().toISOString(),
      },
    ]

    return {
      success: true,
      data: results,
      error: null,
      metadata: {
        provider: 'mock-places',
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
