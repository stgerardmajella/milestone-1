import type {
  AIProvider,
  EventProvider,
  PlaceProvider,
  SearchProvider,
} from '../contracts'

import { TicketmasterEventProvider } from '../providers/events'
import { BravePlaceProvider } from '../providers/places'
import { TavilySearchProvider } from '../providers/search'

export type ProviderRegistry = {
  ai: AIProvider
  search: SearchProvider
  events: EventProvider
  places: PlaceProvider
}

export type ProviderRegistryDependencies = {
  ai: AIProvider
}

export function createProviderRegistry(
  dependencies: ProviderRegistryDependencies,
): ProviderRegistry {
  return {
    ai: dependencies.ai,
    search: new TavilySearchProvider(),
    events: new TicketmasterEventProvider(),
    places: new BravePlaceProvider(),
  }
}