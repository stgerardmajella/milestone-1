import type {
    IntelligenceProviderStatus,
    RankedSearchResult,
  } from '../contracts'
  
  export type RetrievalResponse = {
    results: RankedSearchResult[]
    providers: IntelligenceProviderStatus[]
  }