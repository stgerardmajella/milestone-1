import type { Filter, QueryIntent, SearchResult } from '../contracts'

function matchesBudget(
  result: SearchResult,
  intent: QueryIntent,
): boolean {
  const maximum = intent.budget.max

  if (maximum === null || result.price === null) {
    return true
  }

  return result.price <= maximum
}

function matchesDate(
  result: SearchResult,
  intent: QueryIntent,
): boolean {
  const { from, to } = intent.dateRange

  if (from === null && to === null) {
    return true
  }

  if (result.date === null) {
    return true
  }

  if (from !== null && result.date < from) {
    return false
  }

  if (to !== null && result.date > to) {
    return false
  }

  return true
}

function matchesTime(
  result: SearchResult,
  intent: QueryIntent,
): boolean {
  const { from, to } = intent.timeRange

  if (from === null && to === null) {
    return true
  }

  if (result.time === null) {
    return true
  }

  if (from !== null && result.time < from) {
    return false
  }

  if (to !== null && result.time > to) {
    return false
  }

  return true
}

function matchesLocation(
  result: SearchResult,
  intent: QueryIntent,
): boolean {
  if (intent.location === null || result.location === null) {
    return true
  }

  const requestedLocation = intent.location.toLowerCase()
  const resultLocation = [
    result.location.name,
    result.location.address,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return resultLocation.includes(requestedLocation)
}

function matchesAllConstraints(
  result: SearchResult,
  intent: QueryIntent,
): boolean {
  return (
    matchesBudget(result, intent) &&
    matchesDate(result, intent) &&
    matchesTime(result, intent) &&
    matchesLocation(result, intent)
  )
}

export const resultFilter: Filter = {
  filter(
    results: SearchResult[],
    intent: QueryIntent,
  ): SearchResult[] {
    return results.filter((result) =>
      matchesAllConstraints(result, intent),
    )
  },
}