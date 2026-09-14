# Milestone 2.2.2 — Provider Contract Specification

## 1. Purpose

This document defines the application-level contracts between the intelligence layer and external information providers.

The contracts keep providers replaceable, isolate provider-specific response formats, support graceful provider failures, and provide a common normalized result structure for verification, filtering, ranking, explanation, and cost tracking.

This specification is implementation-independent. It defines behavior and data contracts before TypeScript provider implementations are created.

---

## 2. Contract Principles

The intelligence layer follows five principles:

1. Providers are replaceable.
2. Provider-specific response formats never leave the provider/normalizer boundary.
3. A failed provider must not automatically crash the entire search.
4. A successful search with no results is different from a provider failure.
5. Verification and ranking operate only on normalized application data.

Conceptual flow:

User Query
→ AIProvider
→ QueryIntent
→ Provider Selection
→ Provider Retrieval
→ Normalization
→ SearchResult[]
→ Verification
→ Filtering
→ Ranking
→ Explanation
→ Results

---

## 3. Common Provider Result Envelope

All provider operations return a common application-level result envelope.

```ts
type ProviderResult<T> = {
  success: boolean
  data: T[]
  error: ProviderError | null
  metadata: ProviderMetadata
}
```

A successful search with no matches is:

```ts
{
  success: true,
  data: [],
  error: null,
  metadata: ...
}
```

A provider failure is:

```ts
{
  success: false,
  data: [],
  error: {
    code: 'TIMEOUT',
    message: 'Provider request timed out',
    retryable: true
  },
  metadata: ...
}
```

Empty results and provider failures must never be treated as the same condition.

---

## 4. Provider Error Model

Provider-specific errors are translated into an application-level error model.

```ts
type ProviderErrorCode =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'PROVIDER_ERROR'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN'
```

```ts
type ProviderError = {
  code: ProviderErrorCode
  message: string
  retryable: boolean
}
```

The rest of the application must not depend on vendor-specific error formats.

---

## 5. Provider Metadata

Provider calls provide metadata for diagnostics, monitoring, and cost tracking.

```ts
type ProviderMetadata = {
  provider: string
  requestId: string | null
  retrievedAt: string
  latencyMs: number
  usage: {
    inputUnits: number | null
    outputUnits: number | null
    requests: number
  }
  estimatedCostZar: number | null
}
```

Unknown usage values remain null rather than being fabricated.

---

## 6. AIProvider Contract

The AI provider is responsible for understanding the user's natural-language request.

```ts
interface AIProvider {
  understandQuery(
    query: string
  ): Promise<ProviderResult<QueryIntent>>
}
```

The AI receives the original user query and returns a `QueryIntent`.

It does not directly return search results.

If AI fails and no reliable `QueryIntent` can be produced, the application must return a controlled failure rather than silently guessing.

A deterministic fallback parser may be introduced later as an explicit architectural decision.

---

## 7. SearchProvider Contract

The general web retrieval provider is responsible for retrieving relevant web information.

```ts
interface SearchProvider {
  search(
    intent: QueryIntent
  ): Promise<ProviderResult<SearchResult>>
}
```

The provider does not perform application-level ranking or final result selection.

---

## 8. EventProvider Contract

The event provider retrieves structured event information.

```ts
interface EventProvider {
  searchEvents(
    intent: QueryIntent
  ): Promise<ProviderResult<SearchResult>>
}
```

The initial implementation is expected to use Ticketmaster Discovery API.

The intelligence layer depends on `EventProvider`, not directly on Ticketmaster.

Additional event providers can therefore be introduced later without redesigning the intelligence layer.

---

## 9. PlaceProvider Contract

The place provider retrieves information about physical places and points of interest.

```ts
interface PlaceProvider {
  searchPlaces(
    intent: QueryIntent
  ): Promise<ProviderResult<SearchResult>>
}
```

The initial implementation is expected to use Brave Place Search.

The intelligence layer depends on `PlaceProvider`, not directly on Brave.

---

## 10. Normalization Contract

Each provider may return a different response structure.

Provider-specific responses must be normalized before entering verification, filtering, or ranking.

```ts
interface ResultNormalizer<TProviderResponse> {
  normalize(
    response: TProviderResponse
  ): SearchResult[]
}
```

Conceptual examples:

Ticketmaster response
→ TicketmasterNormalizer
→ SearchResult[]

Brave response
→ BravePlaceNormalizer
→ SearchResult[]

Tavily response
→ TavilyNormalizer
→ SearchResult[]

Provider-specific schemas must not leak into the rest of the intelligence layer.

---

## 11. Normalized SearchResult

All providers ultimately produce the common `SearchResult` structure.

```ts
type SearchResult = {
  id: string
  title: string
  type:
    | 'event'
    | 'activity'
    | 'place'
    | 'web'
  description: string | null
  url: string | null
  source: string
  location: {
    name: string | null
    address: string | null
    latitude: number | null
    longitude: number | null
  } | null
  date: string | null
  time: string | null
  price: number | null
  currency: 'ZAR' | null
  image: string | null
  metadata: Record<string, unknown>
  retrievedAt: string
}
```

Provider-specific information that is not required by the core intelligence layer may remain inside `metadata`.

---

## 12. Verification Contract

Verification occurs after normalization.

```ts
interface Verifier {
  verify(
    results: SearchResult[]
  ): SearchResult[]
}
```

Verification information will eventually use:

```ts
type Verification = {
  status: 'verified' | 'partial' | 'unverified'
  sourceQuality: number
  freshness: number
  completeness: number
  crossSourceAgreement: number
  notes: string[]
}
```

Verification represents the strength of available evidence. It does not guarantee that every external fact is absolutely true.

---

## 13. Filtering Contract

Filtering is deterministic and application-owned.

```ts
interface Filter {
  filter(
    results: SearchResult[],
    intent: QueryIntent
  ): SearchResult[]
}
```

Filtering may remove results that fail explicit constraints such as:

- maximum budget
- requested location
- requested date
- requested time
- other hard constraints

Filtering must not depend on provider-specific response schemas.

---

## 14. Ranking Contract

Ranking is deterministic and application-owned during the prototype phase.

```ts
interface Ranker {
  rank(
    results: SearchResult[],
    intent: QueryIntent
  ): RankedSearchResult[]
}
```

```ts
type RankedSearchResult = {
  result: SearchResult
  score: number
  rank: number
  signals: RankingSignal[]
  explanation: string
}
```

```ts
type RankingSignal = {
  name: string
  score: number
  reason: string
}
```

Ranking signals may include:

- location match
- budget fit
- preference match
- relationship or audience fit
- source quality
- freshness
- verification strength

The explicit signals allow the application to explain why a result ranked highly.

---

## 15. CostTracker Contract

Cost tracking is application-owned and independent of individual providers.

```ts
interface CostTracker {
  record(
    metadata: ProviderMetadata
  ): void

  getSessionCost(): number

  getSessionUsage(): ProviderUsageSummary[]
}
```

```ts
type ProviderUsageSummary = {
  provider: string
  requests: number
  estimatedCostZar: number
}
```

The system should be able to determine the approximate cost of an individual search.

---

## 16. Provider Failure Policy

Provider failure must be isolated wherever possible.

### AI Provider Failure

AI failure means no reliable `QueryIntent` exists.

```text
AIProvider
→ failure
→ controlled search failure
```

The application must not silently invent an intent.

### Event Provider Failure

```text
Ticketmaster
→ failure
→ record provider error
→ continue with other available providers
```

### Place Provider Failure

```text
Brave Places
→ failure
→ record provider error
→ continue with other available providers
```

### Search Provider Failure

```text
Tavily
→ failure
→ record provider error
→ continue with other available providers
```

An individual provider failure should not automatically terminate the entire search.

---

## 17. Empty-Result Policy

An empty result is valid application behavior.

```ts
{
  success: true,
  data: [],
  error: null
}
```

This means:

> The provider was successfully queried, but no matching results were found.

It does not mean the provider failed.

---

## 18. Provider Configuration Failure

A provider that has not been configured returns a controlled error.

```ts
{
  success: false,
  data: [],
  error: {
    code: 'NOT_CONFIGURED',
    message: 'Event provider is not configured',
    retryable: false
  }
}
```

This allows architecture development and testing before all external credentials are available.

---

## 19. Provider Orchestration

The intelligence layer orchestrates provider calls.

```text
User Query
    ↓
AIProvider
    ↓
QueryIntent
    ↓
Provider Selection
    ↓
┌──────────────┬───────────────┬──────────────┐
│ EventProvider│ SearchProvider│ PlaceProvider│
└──────┬───────┴───────┬───────┴──────┬───────┘
       ↓               ↓              ↓
   Normalize       Normalize      Normalize
       └───────────────┬──────────────┘
                       ↓
                  SearchResult[]
                       ↓
                   Verification
                       ↓
                    Filtering
                       ↓
                     Ranking
                       ↓
                   Explanation
                       ↓
                    Results
```

Cost tracking operates alongside provider calls.

---

## 20. Final Intelligence Response

The UI receives an application-level response rather than raw provider responses.

```ts
type IntelligenceResponse = {
  results: RankedSearchResult[]
  query: string
  intent: QueryIntent
  providers: {
    provider: string
    success: boolean
    resultCount: number
    error: ProviderError | null
  }[]
  cost: {
    estimatedZar: number
  }
  generatedAt: string
}
```

The frontend therefore remains independent of individual external providers.

---

## 21. Initial Provider Mapping

| Responsibility | Provider |
|---|---|
| Query understanding | OpenAI GPT-5.6 Luna |
| General web search | Tavily |
| Events | Ticketmaster Discovery API |
| Places | Brave Place Search |
| Activities | Combination of Events, Places, and Web |
| Extraction | Provider retrieval plus application normalizers |
| Verification | Application |
| Filtering | Application |
| Ranking | Application |
| Explanation | Application |
| Cost tracking | Application |

These provider choices remain replaceable because the application depends on contracts rather than vendor implementations.

---

## 22. Milestone Boundary

This document defines contracts only.

It does not yet implement:

- external API calls
- API credentials
- provider SDKs
- live web searching
- production authentication
- production retry infrastructure
- advanced caching
- distributed infrastructure
- paid infrastructure

The next implementation stage is to create the TypeScript interfaces and shared intelligence types based on these contracts.

---

## 23. Architectural Summary

```text
                    AIProvider
                        ↓
                   QueryIntent
                        ↓
                Provider Selection
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
 EventProvider    SearchProvider   PlaceProvider
        ↓               ↓               ↓
 Event Normalizer  Web Normalizer  Place Normalizer
        └───────────────┼───────────────┘
                        ↓
                  SearchResult[]
                        ↓
                    Verifier
                        ↓
                     Filter
                        ↓
                     Ranker
                        ↓
                  Explanation
                        ↓
               IntelligenceResponse

              CostTracker operates
               alongside providers
```

The architecture isolates external providers from the application's core intelligence logic while allowing graceful degradation when individual providers fail.
