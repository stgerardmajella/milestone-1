import type {
    AIProvider,
    ProviderResult,
    QueryIntent,
  } from '../../../contracts'
  
  export class MockAIProvider implements AIProvider {
    async understandQuery(
      query: string,
    ): Promise<ProviderResult<QueryIntent>> {
      const intent: QueryIntent = {
        category: 'activities',
        intent: query,
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
        audience: 'general',
        budget: {
          max: 500,
          currency: 'ZAR',
        },
        preferences: [],
        keywords: [],
        constraints: [],
      }
  
      return {
        success: true,
        data: [intent],
        error: null,
        metadata: {
          provider: 'mock-ai',
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