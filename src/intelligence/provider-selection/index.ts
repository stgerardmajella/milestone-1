import type {
  EventProvider,
  PlaceProvider,
  SearchProvider,
} from '../contracts'
import type { ProviderRegistry } from '../container'
import type { SourceType } from '../source-selection'

export type SelectedProvider =
  | EventProvider
  | PlaceProvider
  | SearchProvider

export function selectProvider(
  source: SourceType,
  providers: ProviderRegistry,
): SelectedProvider {
  switch (source) {
    case 'events':
      return providers.events

    case 'places':
      return providers.places

    case 'web':
      return providers.search
  }
}
