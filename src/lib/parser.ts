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
const SUPPORTED_LOCATIONS = [
    'Cape Town',
    'Johannesburg',
    'Durban',
    'Pretoria',
  ]
  function extractLocation(query: string): string {
    const lowerQuery = query.toLowerCase()
  
    for (const location of SUPPORTED_LOCATIONS) {
      if (lowerQuery.includes(location.toLowerCase())) {
        return location
      }
    }
  
    return 'Cape Town'
  }
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

function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex + 1, 0)
}

function extractDateRange(query: string): {
  date: string | null
  dateFrom: string | null
  dateTo: string | null
} {
  const lowerQuery = query.toLowerCase()
  const today = startOfDay(new Date())

  if (lowerQuery.includes('this weekend')) {
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7
    const saturday = new Date(today)
    saturday.setDate(today.getDate() + daysUntilSaturday)

    const sunday = new Date(saturday)
    sunday.setDate(saturday.getDate() + 1)

    return {
      date: null,
      dateFrom: formatDate(saturday),
      dateTo: formatDate(sunday),
    }
  }

  if (lowerQuery.includes('next weekend')) {
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7
    const saturday = new Date(today)
    saturday.setDate(
      today.getDate() + daysUntilSaturday + 7,
    )

    const sunday = new Date(saturday)
    sunday.setDate(saturday.getDate() + 1)

    return {
      date: null,
      dateFrom: formatDate(saturday),
      dateTo: formatDate(sunday),
    }
  }

  const monthNames = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ]

  for (let monthIndex = 0; monthIndex < monthNames.length; monthIndex += 1) {
    if (lowerQuery.includes(`in ${monthNames[monthIndex]}`)) {
      let year = today.getFullYear()

      if (monthIndex < today.getMonth()) {
        year += 1
      }

      const firstDay = new Date(year, monthIndex, 1)
      const lastDay = endOfMonth(year, monthIndex)

      return {
        date: null,
        dateFrom: formatDate(firstDay),
        dateTo: formatDate(lastDay),
      }
    }
  }

  for (let dayIndex = 0; dayIndex < DAY_NAMES.length; dayIndex += 1) {
    if (lowerQuery.includes(DAY_NAMES[dayIndex])) {
      const daysUntilTarget =
        (dayIndex - today.getDay() + 7) % 7

      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + daysUntilTarget)

      const formattedDate = formatDate(targetDate)

      return {
        date: formattedDate,
        dateFrom: formattedDate,
        dateTo: formattedDate,
      }
    }
  }

  return {
    date: null,
    dateFrom: null,
    dateTo: null,
  }
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
    location: extractLocation(query),
    budget: extractBudget(query),
    people: extractPeople(query),
    relationship: extractRelationship(query),
    preferences: extractPreferences(query),
    ...extractDateRange(query),
  }
}