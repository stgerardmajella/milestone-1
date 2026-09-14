import type { Activity } from '../types/recommendation'

export function filterActivities(
  activities: Activity[],
  budget: number | null,
): Activity[] {
  return activities.filter((activity) => {
    if (budget !== null && activity.price > budget) {
      return false
    }

    return true
  })
}