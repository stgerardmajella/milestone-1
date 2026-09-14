import type { ProviderRegistry } from '../container'

export class IntelligenceService {
  private readonly providers: ProviderRegistry

  constructor(providers: ProviderRegistry) {
    this.providers = providers
  }

  getProviders(): ProviderRegistry {
    return this.providers
  }
}