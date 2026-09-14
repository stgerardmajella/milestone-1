import type { ProviderRegistry } from '../container'
import type { QueryIntent, ProviderResult, SearchResult } from '../contracts'
import type { SourceType } from '../source-selection'

export type SelectedProvider = (
  intent: QueryIntent,
) => Promise<ProviderResult<SearchResult>>

export function selectProvider(
  source: SourceType,
  providers: ProviderRegistry,
): SelectedProvider {
  switch (source) {
    case 'events':
      return (intent) => providers.events.searchEvents(intent)

    case 'places':
      return (intent) => providers.places.searchPlaces(intent)

    case 'web':
      return (intent) => providers.search.search(intent)
  }
}