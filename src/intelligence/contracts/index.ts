export type QueryCategory =
  | 'events'
  | 'activities'
  | 'places'
  | 'web'

export type QueryIntent = {
  category: QueryCategory
  intent: string
  location: string | null
  dateRange: {
    from: string | null
    to: string | null
  }
  timeRange: {
    from: string | null
    to: string | null
  }
  people: number | null
  audience: string | null
  budget: {
    max: number | null
    currency: 'ZAR'
  }
  preferences: string[]
  keywords: string[]
  constraints: string[]
}

export type ProviderErrorCode =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'PROVIDER_ERROR'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN'

export type ProviderError = {
  code: ProviderErrorCode
  message: string
  retryable: boolean
}

export type ProviderUsage = {
  inputUnits: number | null
  outputUnits: number | null
  requests: number
}

export type ProviderMetadata = {
  provider: string
  requestId: string | null
  retrievedAt: string
  latencyMs: number
  usage: ProviderUsage
  estimatedCostZar: number | null
}

export type ProviderResult<T> = {
  success: boolean
  data: T[]
  error: ProviderError | null
  metadata: ProviderMetadata
}

export type SearchResultType =
  | 'event'
  | 'activity'
  | 'place'
  | 'web'

export type SearchResult = {
  id: string
  title: string
  type: SearchResultType
  description: string | null
  url: string | null
  source: string
  location: {
    name: string | null
    address: string | null
    latitude: number | null
    longitude: number | null
  } | null
  date: string | null
  time: string | null
  price: number | null
  currency: 'ZAR' | null
  image: string | null
  metadata: Record<string, unknown>
  retrievedAt: string
}

export type Verification = {
  status: 'verified' | 'partial' | 'unverified'
  sourceQuality: number
  freshness: number
  completeness: number
  crossSourceAgreement: number
  notes: string[]
}

export type RankingSignal = {
  name: string
  score: number
  reason: string
}

export type RankedSearchResult = {
  result: SearchResult
  score: number
  rank: number
  signals: RankingSignal[]
  explanation: string
}

export interface AIProvider {
  understandQuery(
    query: string
  ): Promise<ProviderResult<QueryIntent>>
}

export interface SearchProvider {
  search(
    intent: QueryIntent
  ): Promise<ProviderResult<SearchResult>>
}

export interface EventProvider {
  searchEvents(
    intent: QueryIntent
  ): Promise<ProviderResult<SearchResult>>
}

export interface PlaceProvider {
  searchPlaces(
    intent: QueryIntent
  ): Promise<ProviderResult<SearchResult>>
}

export interface ResultNormalizer<TProviderResponse> {
  normalize(
    response: TProviderResponse
  ): SearchResult[]
}

export interface Verifier {
  verify(
    results: SearchResult[]
  ): SearchResult[]
}

export interface Filter {
  filter(
    results: SearchResult[],
    intent: QueryIntent
  ): SearchResult[]
}

export interface Ranker {
  rank(
    results: SearchResult[],
    intent: QueryIntent
  ): RankedSearchResult[]
}

export type ProviderUsageSummary = {
  provider: string
  requests: number
  estimatedCostZar: number
}

export interface CostTracker {
  record(
    metadata: ProviderMetadata
  ): void

  getSessionCost(): number

  getSessionUsage(): ProviderUsageSummary[]
}

export type IntelligenceProviderStatus = {
  provider: string
  success: boolean
  resultCount: number
  error: ProviderError | null
}

export type IntelligenceResponse = {
  results: RankedSearchResult[]
  query: string
  intent: QueryIntent
  providers: IntelligenceProviderStatus[]
  cost: {
    estimatedZar: number
  }
  generatedAt: string
}
