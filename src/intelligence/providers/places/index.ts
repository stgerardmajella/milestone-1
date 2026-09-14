import type {
  PlaceProvider,
  ProviderResult,
  QueryIntent,
  SearchResult,
} from '../../contracts'

export class BravePlaceProvider implements PlaceProvider {
  async searchPlaces(
    _intent: QueryIntent
  ): Promise<ProviderResult<SearchResult>> {
    throw new Error('Brave place provider not implemented yet')
  }
}
