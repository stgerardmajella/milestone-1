import type {
    Activity,
    ParsedSearch,
    RankedActivity,
  } from '../types/recommendation'
  
  const PREFERENCE_SCORE = 10
  const BUDGET_SCORE = 5
  const RATING_SCORE = 5
  const RELATIONSHIP_SCORE = 5
  
  const RELATIONSHIP_TAGS: Record<
    NonNullable<ParsedSearch['relationship']>,
    string
  > = {
    couple: 'romantic',
    family: 'family',
    friends: 'fun',
  }
  
  function calculateBudgetScore(
    activity: Activity,
    budget: number | null,
  ): number {
    if (budget === null || budget === 0) {
      return 0
    }
  
    const budgetRatio = activity.price / budget
  
    if (budgetRatio <= 0.5) {
      return BUDGET_SCORE
    }
  
    if (budgetRatio <= 0.8) {
      return 3
    }
  
    return 1
  }
  
  function calculateRatingScore(activity: Activity): number {
    if (activity.rating === null) {
      return 0
    }
  
    return (activity.rating / 5) * RATING_SCORE
  }
  
  function calculateRelationshipScore(
    activity: Activity,
    relationship: ParsedSearch['relationship'],
  ): number {
    if (!relationship) {
      return 0
    }
  
    const matchingTag = RELATIONSHIP_TAGS[relationship]
  
    if (activity.tags.includes(matchingTag)) {
      return RELATIONSHIP_SCORE
    }
  
    return 0
  }
  
  function calculatePreferenceScore(
    activity: Activity,
    preferences: string[],
  ): number {
    let score = 0
  
    for (const preference of preferences) {
      if (activity.tags.includes(preference.toLowerCase())) {
        score += PREFERENCE_SCORE
      }
    }
  
    return score
  }
  
  function buildWhySelected(
    activity: Activity,
    search: ParsedSearch,
  ): string {
    const reasons: string[] = []
  
    if (search.budget !== null && activity.price <= search.budget) {
      reasons.push(`within your R${search.budget} budget`)
    }
  
    for (const preference of search.preferences) {
      const hasPreference = activity.tags.includes(
        preference.toLowerCase(),
      )
  
      if (hasPreference) {
        reasons.push(`matches your ${preference} preference`)
      }
    }
  
    if (search.relationship === 'couple') {
      if (activity.tags.includes('romantic')) {
        reasons.push('suits a couple')
      }
    }
  
    if (activity.rating !== null) {
      reasons.push(`rated ${activity.rating}/5`)
    }
  
    if (reasons.length === 0) {
      return 'Matches the available activity criteria.'
    }
  
    return reasons.join(' and ')
  }
  
  export function scoreActivities(
    activities: Activity[],
    search: ParsedSearch,
  ): RankedActivity[] {
    return activities
      .map((activity) => {
        const preferenceScore = calculatePreferenceScore(
          activity,
          search.preferences,
        )
  
        const budgetScore = calculateBudgetScore(
          activity,
          search.budget,
        )
  
        const ratingScore = calculateRatingScore(activity)
  
        const relationshipScore = calculateRelationshipScore(
          activity,
          search.relationship,
        )
  
        const matchScore =
          preferenceScore +
          budgetScore +
          ratingScore +
          relationshipScore
  
        return {
          activity,
          matchScore: Number(matchScore.toFixed(2)),
          rank: 0,
          whySelected: buildWhySelected(activity, search),
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((result, index) => ({
        ...result,
        rank: index + 1,
      }))
  }