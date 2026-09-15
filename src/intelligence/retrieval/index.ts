import type {
    ProviderError,
    IntelligenceProviderStatus,
    QueryIntent,
    RankedSearchResult,
    SearchResult,
  } from '../contracts'
  import type { ProviderRegistry } from '../container'
  import { selectSources } from '../source-selection'
  import { selectProvider } from '../provider-selection'
  import { normalizeResults } from '../normalization'
  import { verifier } from '../verification'
  import { resultFilter } from '../filtering'
  import { resultRanker } from '../ranking'
  import type { RetrievalResponse } from './types'
  
  export async function retrieveResults(
    intent: QueryIntent,
    providers: ProviderRegistry,
  ): Promise<RetrievalResponse> {
    const sources = selectSources(intent.category)
    const results: SearchResult[] = []
    const errors: ProviderError[] = []
    const providerStatuses: IntelligenceProviderStatus[] = []
  
    for (const source of sources) {
      const provider = selectProvider(source, providers)
  
      try {
        const response = await provider(intent)
  
        if (response.success) {
          results.push(...response.data)
  
          providerStatuses.push({
            provider: source,
            success: true,
            resultCount: response.data.length,
            error: null,
          })
        } else if (response.error) {
          errors.push(response.error)
  
          providerStatuses.push({
            provider: source,
            success: false,
            resultCount: 0,
            error: response.error,
          })
        }
      } catch {
        const error: ProviderError = {
          code: 'PROVIDER_ERROR',
          message: `${source} provider failed unexpectedly`,
          retryable: false,
        }
  
        errors.push(error)
  
        providerStatuses.push({
          provider: source,
          success: false,
          resultCount: 0,
          error,
        })
      }
    }
  
    const normalizedResults = normalizeResults(results)
    const verifiedResults = verifier.verify(normalizedResults)
  
    const filteredResults = resultFilter.filter(
      verifiedResults,
      intent,
    )
  
    const rankedResults: RankedSearchResult[] = resultRanker.rank(
      filteredResults,
      intent,
    )
  
    return {
      results: rankedResults,
      providers: providerStatuses,
    }
  }