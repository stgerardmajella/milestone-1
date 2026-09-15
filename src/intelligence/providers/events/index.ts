import type {
  EventProvider,
  ProviderResult,
  SearchResult,
} from '../../contracts'

export class TicketmasterEventProvider implements EventProvider {
  async searchEvents(): Promise<ProviderResult<SearchResult>> {
    throw new Error('Ticketmaster event provider not implemented yet')
  }
}
