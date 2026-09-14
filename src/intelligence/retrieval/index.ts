import type {
    ProviderError,
    ProviderResult,
    QueryIntent,
    SearchResult,
  } from '../contracts'
  import type { ProviderRegistry } from '../container'
  import { selectSources } from '../source-selection'
  import { selectProvider } from '../provider-selection'
  import { normalizeResults } from '../normalization'
  import { verifier } from '../verification'
  import { resultFilter } from '../filtering'
  import { resultRanker } from '../ranking'
  
  export async function retrieveResults(
    intent: QueryIntent,
    providers: ProviderRegistry,
  ): Promise<ProviderResult<SearchResult>> {
    const sources = selectSources(intent.category)
    const results: SearchResult[] = []
    const errors: ProviderError[] = []
  
    for (const source of sources) {
      const provider = selectProvider(source, providers)
  
      try {
        const response = await provider(intent)
  
        if (response.success) {
          results.push(...response.data)
        } else if (response.error) {
          errors.push(response.error)
        }
      } catch {
        errors.push({
          code: 'PROVIDER_ERROR',
          message: `${source} provider failed unexpectedly`,
          retryable: false,
        })
      }
    }
  
    const normalizedResults = normalizeResults(results)
    const verifiedResults = verifier.verify(normalizedResults)
    const filteredResults = resultFilter.filter(
      verifiedResults,
      intent,
    )
  
    const rankedResults = resultRanker.rank(
      filteredResults,
      intent,
    )
  
    const error =
      results.length === 0 && errors.length > 0
        ? errors[0]
        : null
  
    return {
      success: results.length > 0 || errors.length === 0,
      data: rankedResults.map((item) => item.result),
      error,
      metadata: {
        provider: 'intelligence-retrieval',
        requestId: null,
        retrievedAt: new Date().toISOString(),
        latencyMs: 0,
        usage: {
          inputUnits: null,
          outputUnits: null,
          requests: sources.length,
        },
        estimatedCostZar: null,
      },
    }
  }