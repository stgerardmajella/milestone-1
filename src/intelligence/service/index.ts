import type { ProviderRegistry } from '../container'
import type {
  IntelligenceResponse,
  ProviderResult,
  QueryIntent,
} from '../contracts'
import { retrieveResults } from '../retrieval'

export class IntelligenceService {
  private readonly providers: ProviderRegistry

  constructor(providers: ProviderRegistry) {
    this.providers = providers
  }

  getProviders(): ProviderRegistry {
    return this.providers
  }

  async understandQuery(
    query: string,
  ): Promise<ProviderResult<QueryIntent>> {
    return this.providers.ai.understandQuery(query)
  }

  async orchestrate(
    query: string,
  ): Promise<IntelligenceResponse> {
    const understanding = await this.understandQuery(query)

    if (!understanding.success || understanding.data.length === 0) {
      const message =
        understanding.error?.message ??
        'Query understanding failed.'

      throw new Error(message)
    }

    const intent = understanding.data[0]

    const retrieval = await retrieveResults(
      intent,
      this.providers,
    )

    return {
      results: retrieval.results,
      query,
      intent,
      providers: retrieval.providers,
      cost: {
        estimatedZar: 0,
      },
      generatedAt: new Date().toISOString(),
    }
  }
}