import type { SearchResult } from '../contracts'

function normalizeIdentityPart(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function createEventOccurrenceKey(result: SearchResult): string | null {
  if (result.type !== 'event') {
    return null
  }

  const title = normalizeIdentityPart(result.title)
  const locationName = normalizeIdentityPart(result.location?.name)
  const address = normalizeIdentityPart(result.location?.address)
  const date = normalizeIdentityPart(result.date)
  const time = normalizeIdentityPart(result.time)

  if (!title) {
    return null
  }

  return [
    'event',
    title,
    locationName,
    address,
    date,
    time,
  ].join('|')
}

function mergeDuplicateMetadata(
  primary: SearchResult,
  duplicate: SearchResult,
): SearchResult {
  const existingSources = Array.isArray(
    primary.metadata.sources,
  )
    ? primary.metadata.sources.filter(
        (value): value is string => typeof value === 'string',
      )
    : []

  const sources = Array.from(
    new Set([
      primary.source,
      duplicate.source,
      ...existingSources,
    ]),
  )

  const duplicateIds = Array.isArray(
    primary.metadata.duplicateProviderIds,
  )
    ? primary.metadata.duplicateProviderIds.filter(
        (value): value is string => typeof value === 'string',
      )
    : []

  const mergedDuplicateIds = Array.from(
    new Set([
      ...duplicateIds,
      duplicate.id,
    ]),
  )

  return {
    ...primary,
    metadata: {
      ...primary.metadata,
      sources,
      duplicateProviderIds: mergedDuplicateIds,
    },
  }
}

export function deduplicateResults(
  results: SearchResult[],
): SearchResult[] {
  const seen = new Map<string, number>()
  const deduplicated: SearchResult[] = []

  for (const result of results) {
    const key = createEventOccurrenceKey(result)

    if (key === null) {
      deduplicated.push(result)
      continue
    }

    const existingIndex = seen.get(key)

    if (existingIndex === undefined) {
      seen.set(key, deduplicated.length)
      deduplicated.push(result)
      continue
    }

    deduplicated[existingIndex] = mergeDuplicateMetadata(
      deduplicated[existingIndex],
      result,
    )
  }

  return deduplicated
}
