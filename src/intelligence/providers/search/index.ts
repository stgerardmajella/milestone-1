import type {
  ProviderResult,
  QueryIntent,
  SearchProvider,
  SearchResult,
} from '../../contracts'

export class TavilySearchProvider implements SearchProvider {
  async search(
    _intent: QueryIntent
  ): Promise<ProviderResult<SearchResult>> {
    throw new Error('Tavily search provider not implemented yet')
  }
}
