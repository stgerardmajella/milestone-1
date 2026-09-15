import type {
    EventProvider,
    ProviderResult,
    QueryIntent,
    SearchResult,
  } from '../../../contracts'
  
  export class MockEventProvider implements EventProvider {
    async searchEvents(
      _intent: QueryIntent,
    ): Promise<ProviderResult<SearchResult>> {
      const results: SearchResult[] = [
        {
          id: 'mock-event-1',
          title: 'Cape Town Live Music Night',
          type: 'event',
          description: 'A live music event in Cape Town.',
          url: 'https://example.com/mock-event-1',
          source: 'mock-events',
          location: {
            name: 'Cape Town',
            address: 'Cape Town, Western Cape',
            latitude: null,
            longitude: null,
          },
          date: null,
          time: null,
          price: 250,
          currency: 'ZAR',
          image: null,
          metadata: {
            category: 'music',
          },
          retrievedAt: new Date().toISOString(),
        },
      ]
  
      return {
        success: true,
        data: results,
        error: null,
        metadata: {
          provider: 'mock-events',
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