import type { ParsedSearch } from '../types/recommendation'

const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

function extractBudget(query: string): number | null {
  const match = query.match(/r\s?(\d+(?:[.,]\d+)?)/i)

  if (!match) {
    return null
  }

  return Number(match[1].replace(',', '.'))
}

function extractPeople(query: string): number | null {
  const lowerQuery = query.toLowerCase()

  if (
    lowerQuery.includes('girlfriend') ||
    lowerQuery.includes('boyfriend') ||
    lowerQuery.includes('partner') ||
    lowerQuery.includes('wife') ||
    lowerQuery.includes('husband')
  ) {
    return 2
  }

  const peopleMatch = lowerQuery.match(
    /(\d+)\s+(?:people|person|persons|friends)/,
  )

  if (peopleMatch) {
    return Number(peopleMatch[1])
  }

  return null
}

function extractRelationship(
  query: string,
): ParsedSearch['relationship'] {
  const lowerQuery = query.toLowerCase()

  if (
    lowerQuery.includes('girlfriend') ||
    lowerQuery.includes('boyfriend') ||
    lowerQuery.includes('partner') ||
    lowerQuery.includes('wife') ||
    lowerQuery.includes('husband') ||
    lowerQuery.includes('couple')
  ) {
    return 'couple'
  }

  if (
    lowerQuery.includes('family') ||
    lowerQuery.includes('kids') ||
    lowerQuery.includes('children')
  ) {
    return 'family'
  }

  if (
    lowerQuery.includes('friends') ||
    lowerQuery.includes('friend group')
  ) {
    return 'friends'
  }

  return null
}

function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
  
    return `${year}-${month}-${day}`
  }
  
  function extractDate(query: string): string | null {
    const lowerQuery = query.toLowerCase()
    const today = new Date()
  
    for (let dayIndex = 0; dayIndex < DAY_NAMES.length; dayIndex += 1) {
      if (lowerQuery.includes(DAY_NAMES[dayIndex])) {
        const daysUntilTarget =
          (dayIndex - today.getDay() + 7) % 7
  
        const targetDate = new Date(today)
        targetDate.setDate(today.getDate() + daysUntilTarget)
  
        return formatDate(targetDate)
      }
    }
  
    return null
  }

function extractPreferences(query: string): string[] {
  const lowerQuery = query.toLowerCase()
  const preferences: string[] = []

  const supportedPreferences = [
    'fun',
    'outdoor',
    'indoor',
    'romantic',
    'family',
    'food',
    'music',
    'adventure',
    'free',
  ]

  for (const preference of supportedPreferences) {
    if (lowerQuery.includes(preference)) {
      preferences.push(preference)
    }
  }

  return preferences
}

export function parseSearchQuery(query: string): ParsedSearch {
  return {
    intent: 'activity',
    location: 'Cape Town',
    budget: extractBudget(query),
    people: extractPeople(query),
    date: extractDate(query),
    relationship: extractRelationship(query),
    preferences: extractPreferences(query),
  }
}