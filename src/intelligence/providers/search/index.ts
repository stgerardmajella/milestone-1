import type {
  ProviderResult,
  SearchProvider,
  SearchResult,
} from '../../contracts'

export class TavilySearchProvider implements SearchProvider {
  async search(): Promise<ProviderResult<SearchResult>> {
    throw new Error('Tavily search provider not implemented yet')
  }
}
