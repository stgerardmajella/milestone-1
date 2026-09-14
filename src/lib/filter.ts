import type { Activity } from '../types/recommendation'

const HARD_FILTER_PREFERENCES = [
  'food',
  'music',
  'adventure',
]

export function filterActivities(
  activities: Activity[],
  budget: number | null,
  location: string | null,
  preferences: string[],
): Activity[] {
  const requiredPreferences = preferences.filter((preference) =>
    HARD_FILTER_PREFERENCES.includes(preference),
  )

  return activities.filter((activity) => {
    if (budget !== null && activity.price > budget) {
      return false
    }

    if (
      location !== null &&
      activity.location.toLowerCase() !== location.toLowerCase()
    ) {
      return false
    }

    if (
      requiredPreferences.length > 0 &&
      !requiredPreferences.some(
        (preference) =>
          activity.tags.includes(preference) ||
          activity.category.toLowerCase() === preference.toLowerCase(),
      )
    ) {
      return false
    }

    return true
  })
}