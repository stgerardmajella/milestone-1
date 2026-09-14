import type { ProviderRegistry } from '../container'
import type { ProviderResult, QueryIntent } from '../contracts'

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
}
