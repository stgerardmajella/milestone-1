\# Milestone 2.1 — Intelligence Layer Design Specification



\## 1. Purpose



Milestone 2 makes the application's intelligence layer real while preserving the useful foundations established in Milestone 1.



The objective is to establish a provider-independent architecture for:



\* understanding natural-language user requests

\* determining user intent

\* selecting appropriate information sources

\* retrieving information

\* normalizing provider responses

\* verifying information

\* filtering results using hard constraints

\* ranking results using explainable signals

\* explaining why results were selected

\* tracking external-provider costs



Milestone 2 establishes this architecture before the full live-search MVP of Milestone 3.



\---



\## 2. Core Intelligence Pipeline



The intended pipeline is:



User Query

→ Query Understanding

→ QueryIntent

→ Source Selection

→ Provider Retrieval

→ Normalization

→ Verification

→ Filtering

→ Ranking

→ Explanation

→ Results



Cost tracking operates alongside external provider calls.



\---



\## 3. QueryIntent



`QueryIntent` is the central contract between natural-language user requests and the rest of the intelligence layer.



Conceptually:



```text

QueryIntent

├── category

├── intent

├── location

├── dateRange

├── timeRange

├── people

├── audience

├── budget

├── preferences

├── keywords

└── constraints

```



The initial conceptual TypeScript structure is:



```ts

type QueryIntent = {

&#x20; category: 'events' | 'activities' | 'places' | 'web'

&#x20; intent: string



&#x20; location: string | null



&#x20; dateRange: {

&#x20;   from: string | null

&#x20;   to: string | null

&#x20; }



&#x20; timeRange: {

&#x20;   from: string | null

&#x20;   to: string | null

&#x20; }



&#x20; people: number | null



&#x20; audience: string | null



&#x20; budget: {

&#x20;   max: number | null

&#x20;   currency: 'ZAR'

&#x20; }



&#x20; preferences: string\[]



&#x20; keywords: string\[]



&#x20; constraints: string\[]

}

```



The exact TypeScript implementation may be refined during implementation.



\---



\## 4. Query Categories



The initial categories are:



\### events



Requests involving events such as:



\* concerts

\* festivals

\* exhibitions

\* shows

\* sporting events

\* other scheduled events



\### activities



Requests asking for things to do or experiences.



Examples:



\* date activities

\* outdoor activities

\* family activities

\* adventure activities

\* recreational activities



\### places



Requests involving physical places or businesses.



Examples:



\* restaurants

\* cafés

\* attractions

\* venues

\* shops

\* landmarks



\### web



General-purpose information requests that do not require a specialized event, activity, or place provider.



The `web` category acts as a general web-information capability rather than a specialized recommendation category.



\---



\## 5. Provider Layer



The intelligence layer will use provider interfaces rather than coupling application logic directly to external vendors.



Initial conceptual interfaces:



```text

AIProvider

SearchProvider

EventProvider

PlaceProvider

ContentExtractor

Verifier

Ranker

CostTracker

```



The initial provider mapping is:



```text

AIProvider

└── OpenAI



SearchProvider

└── Tavily



EventProvider

└── Ticketmaster



PlaceProvider

└── Brave Places

```



These provider choices are provisional implementation recommendations and must remain replaceable.



\---



\## 6. Provider Independence



The application must not depend directly on provider-specific response formats.



For example:



```text

Ticketmaster

&#x20;   ↓

TicketmasterProvider

&#x20;   ↓

Normalized SearchResult

```



and:



```text

Tavily

&#x20;   ↓

TavilyProvider

&#x20;   ↓

Normalized SearchResult

```



The rest of the intelligence layer consumes the normalized structure.



This allows providers to be replaced or additional providers to be added without rewriting the application's core intelligence logic.



\---



\## 7. SearchResult



All providers should ultimately produce a common internal result structure.



Conceptually:



```text

SearchResult

├── id

├── title

├── type

├── description

├── url

├── source

├── location

├── date

├── time

├── price

├── image

├── metadata

├── retrievedAt

├── verification

├── ranking

└── explanation

```



The exact TypeScript representation will be defined during implementation.



The UI should consume normalized results rather than provider-specific objects.



\---



\## 8. Normalization



External providers return different data structures.



Provider-specific adapters are responsible for converting those structures into `SearchResult`.



Example:



```text

Provider Response

&#x20;     ↓

Provider Adapter

&#x20;     ↓

Normalized SearchResult

&#x20;     ↓

Common Intelligence Pipeline

```



Normalization occurs before verification, filtering, and ranking.



\---



\## 9. Verification



Verification is a separate stage from ranking.



A result should not be considered trustworthy simply because an external provider returned it.



Initial verification signals may include:



\* source quality

\* freshness

\* completeness

\* cross-source agreement

\* URL accessibility

\* date consistency

\* location consistency



Conceptually:



```text

verification

├── status

├── confidence

├── checks

└── warnings

```



Verification should remain deterministic and explainable wherever practical.



\---



\## 10. Filtering



Hard constraints are applied before ranking.



Conceptually:



```text

QueryIntent

&#x20;   ↓

Hard Constraints

&#x20;   ↓

Filter

&#x20;   ↓

Possible Results

```



Examples of hard constraints include:



\* maximum budget

\* required date

\* required location

\* required number of people

\* explicit user requirements



A result that fundamentally violates a hard constraint should not receive a high ranking simply because it matches other preferences.



\---



\## 11. Ranking



After hard filtering, remaining results are ranked.



Initial ranking signals may include:



\* relevance

\* preference match

\* location match

\* date match

\* budget fit

\* source quality

\* freshness

\* verification confidence



The initial ranking system should remain deterministic and explainable.



Milestone 1's existing scoring system provides a foundation for this component.



\---



\## 12. Explanation



The existing Milestone 1 `whySelected` concept should be preserved and generalized.



The system should be able to explain why a result ranked highly using actual ranking signals.



Example:



> Within your R500 budget, suitable for a couple, available Saturday, and highly rated.



Explanations must be derived from actual result data and ranking signals rather than invented by an AI model.



\---



\## 13. Cost Tracking



External provider usage should be measurable from the beginning.



Conceptually:



```text

ProviderCall

├── provider

├── operation

├── timestamp

├── units

├── estimatedCost

└── success

```



The purpose is to determine the approximate cost of an individual search and eventually the cost of testing the application with larger groups of users.



The initial implementation should remain lightweight and should not require a separate paid infrastructure service.



\---



\## 14. Milestone 1 Reuse



Milestone 1 already provides useful intelligence foundations.



The intended migration is:



```text

Milestone 1              Milestone 2

────────────────────────────────────────

parser.ts          →     Query Understanding

filter.ts          →     Hard Filtering

scoring.ts         →     Ranking

Activity           →     SearchResult

whySelected        →     Explanation

Supabase           →     Application Storage

```



Existing functionality should not be deleted simply because the architecture is being expanded.



Refactoring should occur only where there is a clear architectural or functional reason.



\---



\## 15. AI Responsibility



AI should primarily interpret the user's natural-language request.



For example:



```text

User:

"Something fun and romantic to do in Cape Town

this Saturday for under R500"



&#x20;       ↓



AI / Query Understanding



&#x20;       ↓



QueryIntent

```



The AI should not be responsible for performing the entire research workflow.



The application remains responsible for:



\* selecting providers

\* retrieving information

\* normalizing results

\* verifying results

\* applying hard constraints

\* ranking results

\* calculating costs

\* generating explanations from actual signals



This keeps the system controllable, testable, explainable, and cost-efficient.



\---



\## 16. Initial Provider Strategy



The prototype is being developed with no investment budget.



Therefore, provider selection should prioritize:



1\. free or very low-cost prototype usage

2\. no unnecessary infrastructure costs

3\. useful South African and Cape Town coverage

4\. API reliability

5\. integration simplicity

6\. permitted and appropriate API usage

7\. provider replaceability

8\. reasonable future scalability



Initial recommendations:



| Capability                | Provider                     |

| ------------------------- | ---------------------------- |

| AI / intent understanding | OpenAI                       |

| General web search        | Tavily                       |

| Places                    | Brave Places                 |

| Events                    | Ticketmaster Discovery API   |

| Extraction                | Tavily and application logic |

| Verification              | Application logic            |

| Ranking                   | Application logic            |

| Storage                   | Supabase                     |

| Cost tracking             | Application logic            |



These choices remain subject to validation during Milestone 2 implementation and testing.



\---



\## 17. Architectural Principle



The system should follow this principle:



> AI understands the request. Providers supply information. Our application verifies, filters, ranks, and explains the results.



No single external provider should become the application's intelligence layer.



\---



\## 18. Milestone Boundary



Milestone 2 establishes and implements the intelligence architecture.



Milestone 3 will use this architecture to create the Live MVP in which the application actually searches the internet and returns live results.



Therefore, Milestone 2 should not prematurely optimize for large-scale production infrastructure.



The prototype should remain:



\* simple

\* testable

\* inexpensive

\* provider-independent

\* explainable

\* extensible



