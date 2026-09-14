import type {
  AIProvider,
  ProviderResult,
  QueryIntent,
} from '../../contracts'

export class OpenAIProvider implements AIProvider {
  async understandQuery(
    _query: string
  ): Promise<ProviderResult<QueryIntent>> {
    throw new Error('OpenAI provider not implemented yet')
  }
}
