export type ParsedSearch = {
    intent: string
    location: string | null
    budget: number | null
    people: number | null
    date: string | null
    relationship: 'couple' | 'family' | 'friends' | null
    preferences: string[]
  }
  
  export type Activity = {
    id: string
    name: string
    description: string
    category: string
    price: number
    location: string
    date: string | null
    start_time: string | null
    end_time: string | null
    image_url: string | null
    rating: number | null
    source_name: string | null
    source_url: string | null
    tags: string[]
  }
  
  export type RankedActivity = {
    activity: Activity
    matchScore: number
    rank: number
    whySelected: string
  }