import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke,
    },
  },
}))

import { understandQuery } from './index'

const validIntent = {
  category: 'activities',
  intent:
    'Find an activity in Cape Town for two people costing under R500',
  location: 'Cape Town',
  dateRange: {
    from: null,
    to: null,
  },
  timeRange: {
    from: null,
    to: null,
  },
  people: 2,
  audience: null,
  budget: {
    max: 500,
    currency: 'ZAR',
  },
  preferences: [],
  keywords: [],
  constraints: [],
}

const validMetadata = {
  provider: 'understand-query',
  requestId: null,
  retrievedAt: '2026-09-16T07:00:00.000Z',
  latencyMs: 12,
  usage: {
    inputUnits: null,
    outputUnits: null,
    requests: 1,
  },
  estimatedCostZar: null,
}

describe('understandQuery client', () => {
  beforeEach(() => {
    invoke.mockReset()
  })

  it('returns a successful singleton [intent] from the Edge Function', async () => {
    invoke.mockResolvedValue({
      data: {
        intent: validIntent,
      },
      error: null,
    })

    const result = await understandQuery(
      'Find something to do in Cape Town for two people under R500.',
    )

    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.category).toBe('activities')
    expect(result.data[0]?.location).toBe('Cape Town')
    expect(result.data[0]?.people).toBe(2)
    expect(result.data[0]?.budget.max).toBe(500)
    expect(result.metadata.provider).toBe('understand-query')
    expect(Number.isFinite(result.metadata.latencyMs)).toBe(true)

    expect(invoke).toHaveBeenCalledWith(
      'understand-query',
      {
        body: {
          query:
            'Find something to do in Cape Town for two people under R500.',
        },
      },
    )
  })

  it('preserves an empty successful data array', async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        data: [],
        error: null,
        metadata: validMetadata,
      },
      error: null,
    })

    const result = await understandQuery('Find something to do')

    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
    expect(invoke).toHaveBeenCalled()
  })

  it('rejects an invalid provider envelope', async () => {
    invoke.mockResolvedValue({
      data: {
        foo: true,
      },
      error: null,
    })

    const result = await understandQuery('Find something to do')

    expect(result.success).toBe(false)
    expect(result.data).toEqual([])
    expect(result.error?.code).toBe('INVALID_RESPONSE')
    expect(result.error?.retryable).toBe(false)
  })

  it('rejects an invalid QueryIntent', async () => {
    invoke.mockResolvedValue({
      data: {
        intent: {
          category: 'activities',
          location: 'Cape Town',
        },
      },
      error: null,
    })

    const result = await understandQuery('Find something to do')

    expect(result.success).toBe(false)
    expect(result.data).toEqual([])
    expect(result.error?.code).toBe('INVALID_RESPONSE')
    expect(result.error?.message).toBe(
      'Query understanding returned an invalid QueryIntent.',
    )
  })

  it('rejects NaN and Infinity numeric fields', async () => {
    invoke.mockResolvedValue({
      data: {
        intent: {
          ...validIntent,
          people: Number.NaN,
          budget: {
            max: Number.POSITIVE_INFINITY,
            currency: 'ZAR',
          },
        },
      },
      error: null,
    })

    const result = await understandQuery('Find something to do')

    expect(result.success).toBe(false)
    expect(result.data).toEqual([])
    expect(result.error?.code).toBe('INVALID_RESPONSE')
  })

  it('rejects negative people values', async () => {
    invoke.mockResolvedValue({
      data: {
        intent: {
          ...validIntent,
          people: -1,
        },
      },
      error: null,
    })

    const result = await understandQuery('Find something to do')

    expect(result.success).toBe(false)
    expect(result.data).toEqual([])
    expect(result.error?.code).toBe('INVALID_RESPONSE')
  })

  it('rejects negative budget max values', async () => {
    invoke.mockResolvedValue({
      data: {
        intent: {
          ...validIntent,
          budget: {
            max: -1,
            currency: 'ZAR',
          },
        },
      },
      error: null,
    })

    const result = await understandQuery('Find something to do')

    expect(result.success).toBe(false)
    expect(result.data).toEqual([])
    expect(result.error?.code).toBe('INVALID_RESPONSE')
  })

  it('rejects an empty query without invoking the Edge Function', async () => {
    const result = await understandQuery('   ')

    expect(result.success).toBe(false)
    expect(result.data).toEqual([])
    expect(result.error?.code).toBe('INVALID_REQUEST')
    expect(result.error?.message).toBe('Query cannot be empty.')
    expect(result.error?.retryable).toBe(false)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('preserves QUOTA_EXHAUSTED provider failures', async () => {
    invoke.mockResolvedValue({
      data: {
        success: false,
        data: [],
        error: {
          code: 'QUOTA_EXHAUSTED',
          message: 'Quota exhausted',
          retryable: false,
        },
        metadata: validMetadata,
      },
      error: null,
    })

    const result = await understandQuery('Find something to do')

    expect(result.success).toBe(false)
    expect(result.data).toEqual([])
    expect(result.error?.code).toBe('QUOTA_EXHAUSTED')
    expect(result.error?.message).toBe('Quota exhausted')
    expect(result.error?.retryable).toBe(false)
  })

  it('maps Edge Function failures to ProviderError', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
      },
    })

    const result = await understandQuery('Find something to do')

    expect(result.success).toBe(false)
    expect(result.data).toEqual([])
    expect(result.error?.code).toBe('PROVIDER_ERROR')
    expect(result.error?.message).toBe(
      'Edge Function returned a non-2xx status code',
    )
    expect(result.error?.retryable).toBe(true)
  })
})
