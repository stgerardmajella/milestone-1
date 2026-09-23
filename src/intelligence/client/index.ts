import { supabase } from '../../lib/supabase'
import type {
  AIProvider,
  ProviderError,
  ProviderErrorCode,
  ProviderMetadata,
  ProviderResult,
  QueryIntent,
} from '../contracts'

const QUERY_CATEGORIES = ['events', 'activities', 'places', 'web'] as const

const PROVIDER_ERROR_CODES: ProviderErrorCode[] = [
  'AUTHENTICATION',
  'AUTHORIZATION',
  'RATE_LIMIT',
  'QUOTA_EXHAUSTED',
  'TIMEOUT',
  'NETWORK',
  'INVALID_REQUEST',
  'INVALID_RESPONSE',
  'PROVIDER_ERROR',
  'NOT_CONFIGURED',
  'UNKNOWN',
]

const PROVIDER_NAME = 'understand-query'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNullableFiniteNumber(
  value: unknown,
): value is number | null {
  return value === null || isFiniteNumber(value)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string')
  )
}

function isQueryIntent(value: unknown): value is QueryIntent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const intent = value as Record<string, unknown>

  if (
    !QUERY_CATEGORIES.includes(
      intent.category as (typeof QUERY_CATEGORIES)[number],
    )
  ) {
    return false
  }

  if (typeof intent.intent !== 'string') {
    return false
  }

  if (!isNullableString(intent.location)) {
    return false
  }

  if (
    typeof intent.dateRange !== 'object' ||
    intent.dateRange === null ||
    Array.isArray(intent.dateRange) ||
    typeof intent.timeRange !== 'object' ||
    intent.timeRange === null ||
    Array.isArray(intent.timeRange)
  ) {
    return false
  }

  if (!isNullableFiniteNumber(intent.people)) {
    return false
  }

  if (!isNullableString(intent.audience)) {
    return false
  }

  if (
    typeof intent.budget !== 'object' ||
    intent.budget === null ||
    Array.isArray(intent.budget)
  ) {
    return false
  }

  const budget = intent.budget as Record<string, unknown>

  if (
    !isNullableFiniteNumber(budget.max) ||
    budget.currency !== 'ZAR'
  ) {
    return false
  }

  if (
    !isStringArray(intent.preferences) ||
    !isStringArray(intent.keywords) ||
    !isStringArray(intent.constraints)
  ) {
    return false
  }

  const dateRange = intent.dateRange as Record<string, unknown>
  const timeRange = intent.timeRange as Record<string, unknown>

  return (
    isNullableString(dateRange.from) &&
    isNullableString(dateRange.to) &&
    isNullableString(timeRange.from) &&
    isNullableString(timeRange.to)
  )
}

function isProviderError(value: unknown): value is ProviderError {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const error = value as Record<string, unknown>

  return (
    PROVIDER_ERROR_CODES.includes(error.code as ProviderErrorCode) &&
    typeof error.message === 'string' &&
    typeof error.retryable === 'boolean'
  )
}

function isProviderUsage(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const usage = value as Record<string, unknown>

  return (
    isNullableFiniteNumber(usage.inputUnits) &&
    isNullableFiniteNumber(usage.outputUnits) &&
    isFiniteNumber(usage.requests)
  )
}

function isProviderMetadata(value: unknown): value is ProviderMetadata {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const metadata = value as Record<string, unknown>

  return (
    typeof metadata.provider === 'string' &&
    isNullableString(metadata.requestId) &&
    typeof metadata.retrievedAt === 'string' &&
    isFiniteNumber(metadata.latencyMs) &&
    isProviderUsage(metadata.usage) &&
    isNullableFiniteNumber(metadata.estimatedCostZar)
  )
}

function isProviderResult(
  value: unknown,
): value is ProviderResult<QueryIntent> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const result = value as Record<string, unknown>

  if (typeof result.success !== 'boolean') {
    return false
  }

  if (!Array.isArray(result.data)) {
    return false
  }

  if (!result.data.every((item) => isQueryIntent(item))) {
    return false
  }

  if (!isProviderMetadata(result.metadata)) {
    return false
  }

  if (result.success) {
    return result.error === null
  }

  return (
    result.error !== null &&
    isProviderError(result.error) &&
    result.data.length === 0
  )
}

function looksLikeProviderEnvelope(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const result = value as Record<string, unknown>

  return (
    'success' in result &&
    'data' in result &&
    'error' in result &&
    'metadata' in result
  )
}

function createMetadata(startedAt: number): ProviderMetadata {
  return {
    provider: PROVIDER_NAME,
    requestId: null,
    retrievedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    usage: {
      inputUnits: null,
      outputUnits: null,
      requests: 1,
    },
    estimatedCostZar: null,
  }
}

function createFailure(
  startedAt: number,
  code: ProviderErrorCode,
  message: string,
  retryable: boolean,
): ProviderResult<QueryIntent> {
  return {
    success: false,
    data: [],
    error: {
      code,
      message,
      retryable,
    },
    metadata: createMetadata(startedAt),
  }
}

function mapInvokeError(error: {
  message?: string
}): Pick<ProviderError, 'code' | 'retryable'> {
  const message = error.message?.toLowerCase() ?? ''

  if (message.includes('timeout')) {
    return { code: 'TIMEOUT', retryable: true }
  }

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to send')
  ) {
    return { code: 'NETWORK', retryable: true }
  }

  if (message.includes('not configured') || message.includes('not found')) {
    return { code: 'NOT_CONFIGURED', retryable: false }
  }

  if (
    message.includes('401') ||
    message.includes('unauthorised') ||
    message.includes('unauthorized') ||
    message.includes('jwt')
  ) {
    return { code: 'AUTHENTICATION', retryable: false }
  }

  if (message.includes('403') || message.includes('forbidden')) {
    return { code: 'AUTHORIZATION', retryable: false }
  }

  if (message.includes('429') || message.includes('rate limit')) {
    return { code: 'RATE_LIMIT', retryable: true }
  }

  if (message.includes('400') || message.includes('invalid request')) {
    return { code: 'INVALID_REQUEST', retryable: false }
  }

  if (message.includes('non-2xx') || message.includes('non 2xx')) {
    return { code: 'PROVIDER_ERROR', retryable: true }
  }

  return { code: 'PROVIDER_ERROR', retryable: true }
}

function validatedResult(
  result: ProviderResult<QueryIntent>,
  startedAt: number,
): ProviderResult<QueryIntent> {
  if (isProviderResult(result)) {
    return result
  }

  return createFailure(
    startedAt,
    'INVALID_RESPONSE',
    'Query understanding returned an invalid ProviderResult.',
    false,
  )
}

export class SupabaseAIProvider implements AIProvider {
  async understandQuery(
    query: string,
  ): Promise<ProviderResult<QueryIntent>> {
    const startedAt = Date.now()
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      return createFailure(
        startedAt,
        'INVALID_REQUEST',
        'Query cannot be empty.',
        false,
      )
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        'understand-query',
        {
          body: {
            query: trimmedQuery,
          },
        },
      )

      if (error) {
        const mapped = mapInvokeError(error)

        return createFailure(
          startedAt,
          mapped.code,
          error.message ?? 'Query understanding failed.',
          mapped.retryable,
        )
      }

      if (looksLikeProviderEnvelope(data)) {
        if (!isProviderResult(data)) {
          return createFailure(
            startedAt,
            'INVALID_RESPONSE',
            'Query understanding returned an invalid provider envelope.',
            false,
          )
        }

        return data
      }

      if (
        typeof data !== 'object' ||
        data === null ||
        !('intent' in data)
      ) {
        return createFailure(
          startedAt,
          'INVALID_RESPONSE',
          'Query understanding returned an invalid provider envelope.',
          false,
        )
      }

      const intent = (data as { intent: unknown }).intent

      if (!isQueryIntent(intent)) {
        return createFailure(
          startedAt,
          'INVALID_RESPONSE',
          'Query understanding returned an invalid QueryIntent.',
          false,
        )
      }

      return validatedResult(
        {
          success: true,
          data: [intent],
          error: null,
          metadata: createMetadata(startedAt),
        },
        startedAt,
      )
    } catch (error) {
      return createFailure(
        startedAt,
        'NETWORK',
        error instanceof Error
          ? error.message
          : 'Query understanding failed.',
        true,
      )
    }
  }
}

export async function understandQuery(
  query: string,
): Promise<ProviderResult<QueryIntent>> {
  return new SupabaseAIProvider().understandQuery(query)
}
