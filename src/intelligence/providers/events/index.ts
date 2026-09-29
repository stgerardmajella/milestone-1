import type {
  EventProvider,
  ProviderError,
  ProviderMetadata,
  ProviderResult,
  QueryIntent,
  SearchResult,
} from '../../contracts'

type TicketmasterImage = {
  url?: string
  ratio?: string
  width?: number
  height?: number
  fallback?: boolean
}

type TicketmasterClassification = {
  primary?: boolean
  segment?: { id?: string; name?: string }
  genre?: { id?: string; name?: string }
  subGenre?: { id?: string; name?: string }
  type?: { id?: string; name?: string }
  subType?: { id?: string; name?: string }
  family?: boolean
}

type TicketmasterVenue = {
  id?: string
  name?: string
  postalCode?: string
  timezone?: string
  city?: { name?: string }
  state?: { name?: string; stateCode?: string }
  country?: { name?: string; countryCode?: string }
  address?: {
    line1?: string
    line2?: string
    line3?: string
  }
  location?: {
    longitude?: string | number
    latitude?: string | number
  }
}

type TicketmasterEvent = {
  id?: string
  name?: string
  type?: string
  url?: string
  info?: string
  images?: TicketmasterImage[]
  dates?: {
    start?: {
      localDate?: string
      localTime?: string
      dateTime?: string
    }
    timezone?: string
    status?: {
      code?: string
    }
    spanMultipleDays?: boolean
  }
  classifications?: TicketmasterClassification[]
  promoter?: {
    id?: string
    name?: string
  }
  promoters?: Array<{
    id?: string
    name?: string
  }>
  _embedded?: {
    venues?: TicketmasterVenue[]
    attractions?: Array<{
      id?: string
      name?: string
      url?: string
    }>
  }
}

type TicketmasterResponse = {
  _embedded?: {
    events?: TicketmasterEvent[]
  }
  page?: {
    size?: number
    totalElements?: number
    totalPages?: number
    number?: number
  }
}

type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>

export type TicketmasterEventProviderOptions = {
  apiKey: string
  fetchImpl?: FetchLike
  baseUrl?: string
  pageSize?: number
}

function createMetadata(
  startedAt: number,
  requests: number,
): ProviderMetadata {
  return {
    provider: 'ticketmaster',
    requestId: null,
    retrievedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    usage: {
      inputUnits: null,
      outputUnits: null,
      requests,
    },
    estimatedCostZar: 0,
  }
}

function createError(
  code: ProviderError['code'],
  message: string,
  retryable: boolean,
): ProviderError {
  return {
    code,
    message,
    retryable,
  }
}

function selectImage(images: TicketmasterImage[] | undefined): string | null {
  if (!images || images.length === 0) {
    return null
  }

  const preferred = images.find(
    (image) =>
      image.fallback !== true &&
      image.ratio === '16_9' &&
      typeof image.url === 'string',
  )

  if (preferred?.url) {
    return preferred.url
  }

  const usable = images.find(
    (image) => image.fallback !== true && typeof image.url === 'string',
  )

  return usable?.url ?? null
}

function toNumber(value: string | number | undefined): number | null {
  if (value === undefined) {
    return null
  }

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

function normalizeEvent(
  event: TicketmasterEvent,
  retrievedAt: string,
): SearchResult | null {
  if (!event.id || !event.name) {
    return null
  }

  const venue = event._embedded?.venues?.[0] ?? null
  const primaryClassification =
    event.classifications?.find((classification) => classification.primary) ??
    event.classifications?.[0] ??
    null

  const location =
    venue || event._embedded?.venues?.length
      ? {
          name: venue?.name ?? null,
          address:
            venue?.address?.line1 ??
            venue?.city?.name ??
            null,
          latitude: toNumber(venue?.location?.latitude),
          longitude: toNumber(venue?.location?.longitude),
        }
      : null

  return {
    id: `ticketmaster:${event.id}`,
    title: event.name,
    type: 'event',
    description: event.info ?? null,
    url: event.url ?? null,
    source: 'ticketmaster',
    location,
    date: event.dates?.start?.localDate ?? null,
    time: event.dates?.start?.localTime ?? null,
    price: null,
    currency: null,
    image: selectImage(event.images),
    metadata: {
      providerEventId: event.id,
      timezone: event.dates?.timezone ?? venue?.timezone ?? null,
      status: event.dates?.status?.code ?? null,
      spanMultipleDays: event.dates?.spanMultipleDays ?? false,
      venueId: venue?.id ?? null,
      venueCity: venue?.city?.name ?? null,
      venueState: venue?.state?.name ?? null,
      venueCountry: venue?.country?.name ?? null,
      venuePostalCode: venue?.postalCode ?? null,
      promoter: event.promoter?.name ?? null,
      promoterId: event.promoter?.id ?? null,
      promoters: event.promoters ?? [],
      attraction:
        event._embedded?.attractions?.[0]?.name ??
        null,
      attractionId:
        event._embedded?.attractions?.[0]?.id ??
        null,
      classification: primaryClassification
        ? {
            segment: primaryClassification.segment?.name ?? null,
            genre: primaryClassification.genre?.name ?? null,
            subGenre: primaryClassification.subGenre?.name ?? null,
            type: primaryClassification.type?.name ?? null,
            subType: primaryClassification.subType?.name ?? null,
            family: primaryClassification.family ?? false,
          }
        : null,
    },
    retrievedAt,
  }
}

export class TicketmasterEventProvider implements EventProvider {
  private readonly apiKey: string
  private readonly fetchImpl: FetchLike
  private readonly baseUrl: string
  private readonly pageSize: number

  constructor(options: TicketmasterEventProviderOptions) {
    this.apiKey = options.apiKey
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.baseUrl =
      options.baseUrl ??
      'https://app.ticketmaster.com/discovery/v2'
    this.pageSize = options.pageSize ?? 10
  }

  async searchEvents(
    intent: QueryIntent,
  ): Promise<ProviderResult<SearchResult>> {
    const startedAt = Date.now()

    if (!this.apiKey.trim()) {
      return {
        success: false,
        data: [],
        error: createError(
          'NOT_CONFIGURED',
          'Ticketmaster API key is not configured.',
          false,
        ),
        metadata: createMetadata(startedAt, 0),
      }
    }

    const params = new URLSearchParams()

    params.set('apikey', this.apiKey)
    params.set('countryCode', 'ZA')
    params.set('size', String(this.pageSize))
    params.set('sort', 'date,asc')

    if (intent.location?.trim()) {
      params.set('city', intent.location.trim())
    }

    const keywords = [
      ...intent.keywords,
      ...intent.preferences,
    ]
      .map((value) => value.trim())
      .filter(Boolean)

    if (keywords.length > 0) {
      params.set('keyword', keywords.join(' '))
    }

    if (intent.dateRange.from) {
      params.append(
        'localStartDateTime',
        `${intent.dateRange.from}T00:00:00`,
      )
    }

    if (intent.dateRange.to) {
      params.append(
        'localStartDateTime',
        `${intent.dateRange.to}T23:59:59`,
      )
    }

    const url = `${this.baseUrl}/events.json?${params.toString()}`

    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        const message = `Ticketmaster API request failed with HTTP ${response.status}.`

        if (response.status === 401) {
          return {
            success: false,
            data: [],
            error: createError(
              'AUTHENTICATION',
              message,
              false,
            ),
            metadata: createMetadata(startedAt, 1),
          }
        }

        if (response.status === 403) {
          return {
            success: false,
            data: [],
            error: createError(
              'AUTHORIZATION',
              message,
              false,
            ),
            metadata: createMetadata(startedAt, 1),
          }
        }

        if (response.status === 429) {
          return {
            success: false,
            data: [],
            error: createError(
              'RATE_LIMIT',
              message,
              true,
            ),
            metadata: createMetadata(startedAt, 1),
          }
        }

        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            data: [],
            error: createError(
              'INVALID_REQUEST',
              message,
              false,
            ),
            metadata: createMetadata(startedAt, 1),
          }
        }

        return {
          success: false,
          data: [],
          error: createError(
            'PROVIDER_ERROR',
            message,
            response.status >= 500,
          ),
          metadata: createMetadata(startedAt, 1),
        }
      }

      let payload: TicketmasterResponse

      try {
        payload = (await response.json()) as TicketmasterResponse
      } catch {
        return {
          success: false,
          data: [],
          error: createError(
            'INVALID_RESPONSE',
            'Ticketmaster returned an invalid JSON response.',
            false,
          ),
          metadata: createMetadata(startedAt, 1),
        }
      }

      const retrievedAt = new Date().toISOString()
      const events = payload._embedded?.events ?? []

      const results = events
        .map((event) => normalizeEvent(event, retrievedAt))
        .filter((event): event is SearchResult => event !== null)

      return {
        success: true,
        data: results,
        error: null,
        metadata: createMetadata(startedAt, 1),
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        error: createError(
          'NETWORK',
          error instanceof Error
            ? error.message
            : 'Ticketmaster request failed due to a network error.',
          true,
        ),
        metadata: createMetadata(startedAt, 1),
      }
    }
  }
}
