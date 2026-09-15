import type {
  PlaceProvider,
  ProviderResult,
  SearchResult,
} from '../../contracts'

export class BravePlaceProvider implements PlaceProvider {
  async searchPlaces(): Promise<ProviderResult<SearchResult>> {
    throw new Error('Brave place provider not implemented yet')
  }
}
