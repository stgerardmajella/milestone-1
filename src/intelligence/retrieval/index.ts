import type {
    ProviderResult,
    QueryIntent,
    SearchResult,
  } from '../contracts'
  import type { ProviderRegistry } from '../container'
  import { selectSources } from '../source-selection'
  import { selectProvider } from '../provider-selection'
  
  export async function retrieveResults(
    intent: QueryIntent,
    providers: ProviderRegistry,
  ): Promise<ProviderResult<SearchResult>> {
    const sources = selectSources(intent.category)
    const results: SearchResult[] = []
  
    for (const source of sources) {
      const provider = selectProvider(source, providers)
      const response = await provider(intent)
  
      if (response.success) {
        results.push(...response.data)
      }
    }
  
    return {
      success: true,
      data: results,
      error: null,
      metadata: {
        provider: 'intelligence-retrieval',
        requestId: null,
        retrievedAt: new Date().toISOString(),
        latencyMs: 0,
        usage: {
          inputUnits: null,
          outputUnits: null,
          requests: 0,
        },
        estimatedCostZar: null,
      },
    }
  }