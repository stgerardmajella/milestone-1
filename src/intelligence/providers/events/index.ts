import type {
  EventProvider,
  ProviderResult,
  QueryIntent,
  SearchResult,
} from '../../contracts'

export class TicketmasterEventProvider implements EventProvider {
  async searchEvents(
    _intent: QueryIntent
  ): Promise<ProviderResult<SearchResult>> {
    throw new Error('Ticketmaster event provider not implemented yet')
  }
}
