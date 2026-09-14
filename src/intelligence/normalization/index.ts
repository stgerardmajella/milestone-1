import type { SearchResult } from '../contracts'

export function normalizeResults(results: SearchResult[]): SearchResult[] {
  return results.map((result) => ({
    ...result,
    title: result.title.trim(),
    description: result.description?.trim() ?? null,
    url: result.url?.trim() ?? null,
    source: result.source.trim(),
  }))
}