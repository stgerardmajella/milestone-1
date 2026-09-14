import type { SearchResult, Verification, Verifier } from '../contracts'

function verifyResult(result: SearchResult): Verification {
  const notes: string[] = []

  const sourceQuality = result.source.trim().length > 0 ? 1 : 0
  const completeness =
    [
      result.title,
      result.description,
      result.url,
      result.location,
      result.date,
      result.time,
      result.price,
    ].filter((value) => value !== null && value !== '').length / 7

  const freshness = 1

  const crossSourceAgreement = 0

  if (sourceQuality === 0) {
    notes.push('No source was provided.')
  }

  if (completeness < 0.5) {
    notes.push('Result contains limited information.')
  }

  notes.push('Cross-source agreement has not been established.')

  const score =
    sourceQuality * 0.4 +
    freshness * 0.2 +
    completeness * 0.3 +
    crossSourceAgreement * 0.1

  const status =
    score >= 0.8
      ? 'verified'
      : score >= 0.5
        ? 'partial'
        : 'unverified'

  return {
    status,
    sourceQuality,
    freshness,
    completeness,
    crossSourceAgreement,
    notes,
  }
}

export const verifier: Verifier = {
  verify(results: SearchResult[]): SearchResult[] {
    return results.map((result) => ({
      ...result,
      metadata: {
        ...result.metadata,
        verification: verifyResult(result),
      },
    }))
  },
}