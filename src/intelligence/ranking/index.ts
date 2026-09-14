import type {
    QueryIntent,
    RankedSearchResult,
    Ranker,
    SearchResult,
  } from '../contracts'
  
  function getVerificationScore(result: SearchResult): number {
    const verification = result.metadata.verification
  
    if (
      typeof verification !== 'object' ||
      verification === null ||
      Array.isArray(verification)
    ) {
      return 0
    }
  
    const value = verification as {
      sourceQuality?: unknown
      freshness?: unknown
      completeness?: unknown
      crossSourceAgreement?: unknown
    }
  
    const sourceQuality =
      typeof value.sourceQuality === 'number'
        ? value.sourceQuality
        : 0
  
    const freshness =
      typeof value.freshness === 'number'
        ? value.freshness
        : 0
  
    const completeness =
      typeof value.completeness === 'number'
        ? value.completeness
        : 0
  
    const crossSourceAgreement =
      typeof value.crossSourceAgreement === 'number'
        ? value.crossSourceAgreement
        : 0
  
    return (
      sourceQuality * 0.4 +
      freshness * 0.2 +
      completeness * 0.3 +
      crossSourceAgreement * 0.1
    )
  }
  
  function getKeywordScore(
    result: SearchResult,
    intent: QueryIntent,
  ): number {
    const terms = [
      ...intent.keywords,
      ...intent.preferences,
    ]
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean)
  
    if (terms.length === 0) {
      return 0
    }
  
    const searchableText = [
      result.title,
      result.description,
      ...Object.values(result.metadata).filter(
        (value): value is string => typeof value === 'string',
      ),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  
    const matches = terms.filter((term) =>
      searchableText.includes(term),
    ).length
  
    return matches / terms.length
  }
  
  function getBudgetScore(
    result: SearchResult,
    intent: QueryIntent,
  ): number {
    const maximum = intent.budget.max
  
    if (maximum === null || result.price === null) {
      return 0.5
    }
  
    if (result.price > maximum) {
      return 0
    }
  
    if (maximum === 0) {
      return 1
    }
  
    return 1 - result.price / maximum
  }
  
  function getLocationScore(
    result: SearchResult,
    intent: QueryIntent,
  ): number {
    if (intent.location === null || result.location === null) {
      return 0.5
    }
  
    const requestedLocation = intent.location
      .trim()
      .toLowerCase()
  
    const resultLocation = [
      result.location.name,
      result.location.address,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  
    return resultLocation.includes(requestedLocation) ? 1 : 0
  }
  
  function createSignals(
    result: SearchResult,
    intent: QueryIntent,
  ) {
    const verificationScore = getVerificationScore(result)
    const keywordScore = getKeywordScore(result, intent)
    const budgetScore = getBudgetScore(result, intent)
    const locationScore = getLocationScore(result, intent)
  
    return [
      {
        name: 'relevance',
        score: keywordScore,
        reason:
          keywordScore > 0
            ? 'Matches the requested keywords or preferences.'
            : 'No keyword or preference match was found.',
      },
      {
        name: 'verification',
        score: verificationScore,
        reason:
          verificationScore > 0
            ? 'Contains stronger verification signals.'
            : 'No verification signals are available.',
      },
      {
        name: 'budget',
        score: budgetScore,
        reason:
          result.price !== null
            ? 'Price is within the requested budget.'
            : 'No price information is available.',
      },
      {
        name: 'location',
        score: locationScore,
        reason:
          locationScore === 1
            ? 'Matches the requested location.'
            : 'Location match is uncertain.',
      },
    ]
  }
  
  export const resultRanker: Ranker = {
    rank(
      results: SearchResult[],
      intent: QueryIntent,
    ): RankedSearchResult[] {
      const ranked = results.map((result) => {
        const signals = createSignals(result, intent)
  
        const score =
          signals.reduce(
            (total, signal) => total + signal.score,
            0,
          ) / signals.length
  
        return {
          result,
          score,
          rank: 0,
          signals,
          explanation:
            'Ranked using deterministic relevance, verification, budget, and location signals.',
        }
      })
  
      return ranked
        .sort((a, b) => b.score - a.score)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }))
    },
  }