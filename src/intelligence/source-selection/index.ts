import type { QueryCategory } from '../contracts'

export type SourceType =
  | 'events'
  | 'places'
  | 'web'

export function selectSources(category: QueryCategory): SourceType[] {
  switch (category) {
    case 'events':
      return ['events']

    case 'places':
      return ['places']

    case 'activities':
      return ['events', 'places', 'web']

    case 'web':
      return ['web']
  }
}
