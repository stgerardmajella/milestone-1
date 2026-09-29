import { describe, expect, it } from 'vitest'
import type { SearchResult } from '../contracts'
import { deduplicateResults } from './index'

function event(
  overrides: Partial<SearchResult> = {},
): SearchResult {
  return {
    id: 'event-1',
    title: 'MAMMA MIA!',
    type: 'event',
    description: 'A musical.',
    url: 'https://example.com/event',
    source: 'ticketmaster',
    location: {
      name: 'Artscape Opera House',
      address: 'D.F. Malan St, Cape Town',
      latitude: null,
      longitude: null,
    },
    date: '2026-10-03',
    time: '19:30:00',
    price: null,
    currency: null,
    image: null,
    metadata: {},
    retrievedAt: '2026-09-29T10:00:00.000Z',
    ...overrides,
  }
}

describe('deduplicateResults', () => {
  it('deduplicates the same event occurrence from different providers', () => {
    const results = deduplicateResults([
      event({
        id: 'ticketmaster:event-1',
        source: 'ticketmaster',
      }),
      event({
        id: 'directory:event-1',
        source: 'directory',
      }),
    ])

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('ticketmaster:event-1')
    expect(results[0].metadata.sources).toEqual([
      'ticketmaster',
      'directory',
    ])
    expect(results[0].metadata.duplicateProviderIds).toEqual([
      'directory:event-1',
    ])
  })

  it('preserves different performance times', () => {
    const results = deduplicateResults([
      event({
        id: 'event-15',
        time: '15:00:00',
      }),
      event({
        id: 'event-19',
        time: '19:30:00',
      }),
    ])

    expect(results).toHaveLength(2)
  })

  it('preserves different performance dates', () => {
    const results = deduplicateResults([
      event({
        id: 'event-oct-3',
        date: '2026-10-03',
      }),
      event({
        id: 'event-oct-4',
        date: '2026-10-04',
      }),
    ])

    expect(results).toHaveLength(2)
  })

  it('does not deduplicate different event titles', () => {
    const results = deduplicateResults([
      event({
        id: 'mamma-mia',
        title: 'MAMMA MIA!',
      }),
      event({
        id: 'hamilton',
        title: 'Hamilton',
      }),
    ])

    expect(results).toHaveLength(2)
  })

  it('preserves non-event results', () => {
    const results = deduplicateResults([
      event({
        id: 'event-1',
      }),
      event({
        id: 'activity-1',
        type: 'activity',
        title: 'Live Music',
      }),
      event({
        id: 'activity-2',
        type: 'activity',
        title: 'Live Music',
      }),
    ])

    expect(results).toHaveLength(3)
  })

  it('handles events without date and time deterministically', () => {
    const results = deduplicateResults([
      event({
        id: 'event-1',
        date: null,
        time: null,
      }),
      event({
        id: 'event-2',
        date: null,
        time: null,
        source: 'directory',
      }),
    ])

    expect(results).toHaveLength(1)
  })
})
