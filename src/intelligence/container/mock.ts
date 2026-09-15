import type { ProviderRegistry } from './index'

import { MockAIProvider } from '../providers/mocks/ai'
import { MockEventProvider } from '../providers/mocks/events'
import { MockPlaceProvider } from '../providers/mocks/places'
import { MockSearchProvider } from '../providers/mocks/search'

export function createMockProviderRegistry(): ProviderRegistry {
  return {
    ai: new MockAIProvider(),
    search: new MockSearchProvider(),
    events: new MockEventProvider(),
    places: new MockPlaceProvider(),
  }
}