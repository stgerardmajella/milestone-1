import { describe, expect, it } from 'vitest'
import { LocalAIProvider } from './local'

describe('LocalAIProvider', () => {
  const provider = new LocalAIProvider()

  it('classifies explicit event queries as events', async () => {
    const result = await provider.understandQuery(
      'events this weekend in Cape Town',
    )

    expect(result.success).toBe(true)
    expect(result.data[0]?.category).toBe('events')
  })

  it('classifies concert queries as events', async () => {
    const result = await provider.understandQuery(
      'concerts in Cape Town',
    )

    expect(result.success).toBe(true)
    expect(result.data[0]?.category).toBe('events')
  })

  it('keeps ordinary activity queries as activities', async () => {
    const result = await provider.understandQuery(
      'fun outdoor activities in Cape Town',
    )

    expect(result.success).toBe(true)
    expect(result.data[0]?.category).toBe('activities')
  })

  it('rejects an empty query', async () => {
    const result = await provider.understandQuery('   ')

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('INVALID_REQUEST')
  })
})
