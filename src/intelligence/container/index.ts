import type {
  AIProvider,
  EventProvider,
  PlaceProvider,
  SearchProvider,
} from '../contracts'

import { OpenAIProvider } from '../providers/ai'
import { TicketmasterEventProvider } from '../providers/events'
import { BravePlaceProvider } from '../providers/places'
import { TavilySearchProvider } from '../providers/search'

export type ProviderRegistry = {
  ai: AIProvider
  search: SearchProvider
  events: EventProvider
  places: PlaceProvider
}

export function createProviderRegistry(): ProviderRegistry {
  return {
    ai: new OpenAIProvider(),
    search: new TavilySearchProvider(),
    events: new TicketmasterEventProvider(),
    places: new BravePlaceProvider(),
  }
}