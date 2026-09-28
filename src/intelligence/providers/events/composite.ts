import type {
  EventProvider,
  ProviderError,
  ProviderMetadata,
  ProviderResult,
  QueryIntent,
  SearchResult,
} from '../../contracts'

type EventProviderFailure = {
  provider: string
  error: ProviderError
}

export class CompositeEventProvider implements EventProvider {
  private readonly providers: EventProvider[]

  constructor(providers: EventProvider[]) {
    this.providers = providers
  }

  async searchEvents(
    intent: QueryIntent,
  ): Promise<ProviderResult<SearchResult>> {
    const startedAt = Date.now()
    const results: SearchResult[] = []
    const failures: EventProviderFailure[] = []
    let requests = 0
    let estimatedCostZar = 0
    let inputUnits = 0
    let outputUnits = 0
    let hasInputUnits = false
    let hasOutputUnits = false

    for (const provider of this.providers) {
      try {
        const response = await provider.searchEvents(intent)

        requests += response.metadata.usage.requests

        if (response.metadata.estimatedCostZar !== null) {
          estimatedCostZar += response.metadata.estimatedCostZar
        }

        if (response.metadata.usage.inputUnits !== null) {
          inputUnits += response.metadata.usage.inputUnits
          hasInputUnits = true
        }

        if (response.metadata.usage.outputUnits !== null) {
          outputUnits += response.metadata.usage.outputUnits
          hasOutputUnits = true
        }

        if (response.success) {
          results.push(...response.data)
        } else if (response.error) {
          failures.push({
            provider: response.metadata.provider,
            error: response.error,
          })
        }
      } catch (error) {
        failures.push({
          provider: provider.constructor.name,
          error: {
            code: 'PROVIDER_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Event provider failed unexpectedly',
            retryable: false,
          },
        })
      }
    }

    const metadata: ProviderMetadata = {
      provider: 'events-composite',
      requestId: null,
      retrievedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      usage: {
        inputUnits: hasInputUnits ? inputUnits : null,
        outputUnits: hasOutputUnits ? outputUnits : null,
        requests,
      },
      estimatedCostZar,
    }

    if (this.providers.length === 0 || results.length > 0 || failures.length < this.providers.length) {
      return {
        success: true,
        data: results,
        error: null,
        metadata,
      }
    }

    const firstFailure = failures[0]

    return {
      success: false,
      data: [],
      error: firstFailure?.error ?? {
        code: 'PROVIDER_ERROR',
        message: 'All event providers failed.',
        retryable: false,
      },
      metadata,
    }
  }
}
