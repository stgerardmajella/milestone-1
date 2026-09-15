import { describe, expect, it } from 'vitest'
import { createMockProviderRegistry } from '../container/mock'
import { IntelligenceService } from './index'

describe('IntelligenceService mock pipeline', () => {
  it('runs the complete intelligence pipeline', async () => {
    const providers = createMockProviderRegistry()
    const service = new IntelligenceService(providers)

    const response = await service.orchestrate(
      'Find something to do in Cape Town for two people under R500.',
    )

    expect(response.query).toBe(
      'Find something to do in Cape Town for two people under R500.',
    )

    expect(response.intent.category).toBe('activities')
    expect(response.intent.location).toBe('Cape Town')
    expect(response.intent.people).toBe(2)
    expect(response.intent.budget.max).toBe(500)

    expect(response.results).toHaveLength(3)

    expect(
        response.results
          .map((item) => item.result.type)
          .sort(),
      ).toEqual([
        'event',
        'place',
        'web',
      ])

    expect(response.results[0].rank).toBe(1)
    expect(response.results[1].rank).toBe(2)
    expect(response.results[2].rank).toBe(3)

    expect(response.results.every((item) => item.score >= 0)).toBe(true)

    expect(response.results.every(
      (item) => item.result.metadata.verification !== undefined,
    )).toBe(true)

    expect(response.providers).toHaveLength(3)

    expect(response.providers.every(
      (provider) => provider.success === true,
    )).toBe(true)

    expect(
        response.results
          .map((item) => item.result.type)
          .sort(),
      ).toEqual([
        'event',
        'place',
        'web',
      ])

    expect(response.providers.map((provider) => provider.resultCount)).toEqual([
      1,
      1,
      1,
    ])
  })
})