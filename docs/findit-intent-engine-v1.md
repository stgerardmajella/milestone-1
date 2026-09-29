# Find iT Intent Engine v1

**Project:** Find iT
**Specification:** Intent Engine v1
**Status:** Specification checkpoint
**Date:** 2026-09-29
**Owner:** Dominic MJ Nkosie

---

## 1. Purpose

The Find iT Intent Engine converts a user's natural-language query into a structured representation of what the user is trying to find.

The engine must understand the meaning of a query before Find iT decides where and how to search.

Its primary responsibility is:

> Determine what the user means.

The Intent Engine must not itself perform the search.

---

## 2. Architectural Boundary

The Intent Engine is separated from the Search Planner.

```text
User Query
    |
    v
Intent Engine
    |
    v
QueryIntent
    |
    v
Search Planner
    |
    v
SearchPlan
    |
    v
Providers
    |
    v
Normalize
    |
    v
Verify
    |
    v
Filter
    |
    v
Rank
    |
    v
Results

---

## 3. Core Intent Model

The Intent Engine must determine the user's primary intent.

v1 supports:

- `discovery`
- `information`

`discovery` represents a request to find activities, events, places, or other relevant things.

`information` represents a request where the user primarily wants information rather than a recommendation or discovery result.

The engine must preserve the distinction between the user's raw query and the interpreted intent.

---

## 4. Category Model

Find iT supports the following normalized categories:

```text
all
events
activities
places
web

## 5. Structured Entity Model

The Intent Engine represents important entities separately from the raw query.

v1 supports:

- location
- date
- time
- budget
- people
- relationship
- audience
- mood
- activity

Each interpreted entity must retain provenance and confidence.

This prevents downstream components from having to reinterpret natural-language input.

---

## 6. Location Entity

A location may contain:

- original text
- city
- suburb
- area
- country
- latitude
- longitude

Location information may be partially known.

For example, a query may identify Cape Town without identifying a specific suburb.

The engine must not invent coordinates when none are available.

User location may be supplied separately by the application and must not be falsely represented as having been explicitly stated by the user.

---

## 7. Date Entity

A date intent may contain:

- a start/value date
- an end date
- a relative expression

Examples:

```text
today
tomorrow
this Saturday
this weekend
next week
10 October
10 October to 15 October

---

## 8. Time Entity

A time intent may contain:

- a specific time
- an end time
- a period

Supported periods are:

```text
morning
afternoon
evening
night

---

## 9. Budget Entity

Budget information is represented as a structured constraint.

v1 uses:

```text
currency: ZAR

---

## 10. People Entity

People information may contain:

- total count
- adult count
- child count

Examples:

```text
for two
for four people
two adults
two adults and two children

---

## 11. Relationship and Audience

Relationship describes the social context of the search.

v1 supports:

```text
romantic
couple
friends
family
solo
colleagues
unknown

---

## 12. Interpretation Provenance

Every structured interpretation must identify how it was obtained.

Supported provenance values are:

```text
explicit
inferred
default
unknown

---

## 13. Confidence and Evidence

Every interpretation should carry a confidence value between `0` and `1`.

Confidence describes how strongly the engine supports the interpretation.

The engine should also retain evidence showing which part of the query supported the interpretation.

Example:

```text
Query:
"romantic outdoor activities in Cape Town under R500"

---

## 14. Mood

v1 supports the following normalized moods:

```text
romantic
fun
outdoor
family
adventure
relaxing
nightlife
date_night

---

## 15. Activity

v1 supports the following normalized activities:

```text
pool_table
swimming_pool
bowling
movies
gaming
hiking
beach
food
live_music

---

## 16. Provenance Rules

Interpretations follow this precedence:

```text
explicit > inferred > default > unknown

---

## 17. Confidence

Confidence values must be normalized to a range of `0` to `1`.

Confidence describes the engine's certainty that an interpretation is correct.

It does not describe:

- the quality of a search result
- the popularity of a result
- the ranking of a result
- the reliability of a provider
- whether the user will like a result

Examples:

```text
"romantic activities"

---

## 18. Evidence

Evidence records the part of the user's query that supports an interpretation.

Evidence may include:

- the original text supporting the interpretation
- an optional start offset
- an optional end offset

Evidence may be associated with:

- structured entities
- moods
- activities
- ambiguities
- the overall understanding

Example:

```text
Query:
"romantic outdoor activities in Cape Town under R500"

---

## 19. Search Semantics

Search semantics capture information that influences retrieval and ranking but does not necessarily belong to a structured entity.

The v1 model contains:

```text
preferences
keywords
constraints

---

## 20. Ambiguity

The Intent Engine must explicitly represent ambiguity when a query can reasonably support multiple interpretations.

Each ambiguity contains:

- the affected field
- a description of the uncertainty
- evidence from the user's query

Examples:

```text
"cheap restaurants"

---

## 21. Clarification

The Intent Engine may determine that clarification is required when missing or ambiguous information materially affects the usefulness of the search.

Clarification contains:

- whether clarification is required
- the fields requiring clarification
- an optional reason

Examples of potentially important clarification:

```text
"find something good for the weekend"

---

## 22. SearchPlan

`QueryIntent` describes **what the user means**.

`SearchPlan` describes **how Find iT should search**.

The SearchPlan is generated from the structured QueryIntent and contains:

- providers to search
- search breadth
- structured filters
- ranking signals
- clarification requirements

The planner must consume the interpreted intent rather than independently reinterpreting the raw query.

Example:

```text
Query:
"fun romantic outdoor activities in Cape Town under R500"

---

## 23. Providers

Find iT v1 recognizes these provider categories:

```text
activities
events
places
web

---

## 24. Search Breadth

Search breadth controls how widely Find iT should search after interpreting the user's intent.

v1 supports:

```text
narrow
standard
broad

---

## 25. Search Filters

Search filters convert structured intent into explicit retrieval constraints.

Each filter contains:

- a field
- an operator
- a value

Supported operators are:

```text
eq
neq
lt
lte
gt
gte
between
contains

---

## 26. Ranking Signals

Ranking signals describe which aspects of the interpreted intent should influence result ordering.

v1 supports:

```text
location_relevance
date_relevance
budget_relevance
category_relevance
mood_relevance
activity_relevance
keyword_relevance
preference_relevance

---

## 27. Explanation Support

The Intent Engine should provide enough structured information for Find iT to explain why a result was considered relevant.

Explanation inputs may include:

- interpreted moods
- interpreted activities
- explicit preferences
- relevant keywords
- applicable constraints
- ranking signals
- supporting provider evidence

Example:

```text
Query:
"fun romantic outdoor activities in Cape Town under R500"

## 28. Interpretation Rules

The Intent Engine must interpret natural-language queries without requiring users to use structured search syntax.

Examples:

- "romantic things to do in Cape Town" should identify romantic intent, Cape Town as location, and activities as a likely category.
- "fun outdoor activities under R500" should identify fun and outdoor moods, an upper budget constraint of R500, and activities as the likely category.
- "events this Saturday in Cape Town" should identify events as the category, Cape Town as location, and a relative date requiring calendar resolution.
- "places for 4 friends tonight" should identify places as a likely category, four people, friends as the relationship, and an evening/night time intent.
- "what is happening in Cape Town this weekend" should identify an event/discovery intent, Cape Town as location, and a relative date range.

Interpretation must preserve the distinction between what the user explicitly stated and what the engine inferred.

The engine must not manufacture specific details merely because they are common assumptions.

## 29. Explicit Information

Information explicitly present in the query should receive:

- `source: "explicit"`
- evidence pointing to the relevant query text
- a confidence value appropriate to the clarity of the expression

Examples:

- "under R500" explicitly provides a budget maximum.
- "Cape Town" explicitly provides a location.
- "romantic" explicitly provides a mood.
- "for four people" explicitly provides a people count.

Explicit information should generally be preferred over conflicting inferred information.

## 30. Inferred Information

The engine may infer information when the meaning is strongly supported by the query.

Examples:

- "date night" may infer a romantic relationship context.
- "for the kids" may infer a children/family audience.
- "tonight" may imply an evening/night period.
- "pubs" may imply places and relevant nightlife activity semantics.

Inferred information must remain marked as inferred.

Inference must not silently become an explicit fact.

## 31. Default Information

Defaults may be applied only when required to make a search operational and when the default is defined by the system.

Examples may include:

- default category `all`
- default search breadth `standard`
- default currency `ZAR` for the South African product context

Defaults must remain distinguishable from user-provided information.

A default must never override an explicit user constraint.

## 32. Unknown Information

If the engine cannot reliably determine a value, it should leave that value unknown rather than guessing.

Unknown information should not be converted into an apparently precise value.

For example:

- "somewhere near Cape Town" does not establish an exact suburb.
- "cheap" does not automatically establish a fixed Rand amount unless a defined interpretation rule exists.
- "soon" does not automatically establish an exact date unless the system has a defined temporal interpretation.

Unknown values may influence search breadth or clarification decisions but must not be presented as confirmed facts.

## 33. Relative Dates and Times

Natural-language temporal expressions must be represented semantically before being converted into concrete dates.

Examples include:

- today
- tomorrow
- tonight
- this weekend
- next weekend
- this Saturday
- next Friday
- next week
- this month

The Intent Engine should preserve the original relative expression through the `relative` field where appropriate.

Calendar resolution should occur separately from intent interpretation.

This separation prevents relative expressions from being incorrectly stored as literal calendar dates.

## 34. Date Ranges

A date range must represent both the beginning and end of the requested period when both are known.

Examples:

- "this weekend"
- "Friday to Sunday"
- "from 10 October to 15 October"
- "next week"

The resulting representation must allow providers and retrieval logic to search the entire requested period rather than only the first date.

When a range cannot be resolved reliably, the ambiguity should be recorded rather than silently narrowing the search.

## 35. Budget Semantics

Budget expressions must be interpreted as constraints rather than generic keywords.

Examples:

- "under R500" → maximum budget
- "up to R500" → maximum budget
- "between R300 and R700" → minimum and maximum
- "from R300" → minimum budget
- "free" → maximum budget of R0 when that interpretation is explicitly supported

Budget values must remain numeric and validated.

The engine must preserve the currency.

The current product context uses ZAR.

## 36. People and Group Semantics

People-related expressions should be converted into structured information when possible.

Examples:

- "for two" → count 2
- "for four people" → count 4
- "for a family of five" → count 5 with family relationship/audience semantics
- "for two adults and two children" → count 4, adults 2, children 2

Relationship and audience should remain separate concepts.

For example, "two friends" identifies both a people count and a relationship, while "two adults" primarily identifies an audience composition.

## 37. Location Semantics

Location interpretation should distinguish between:

- city
- suburb
- area
- country
- user location
- explicitly named venue or place

The engine should not assume that a named location is necessarily a city.

For example:

- "Cape Town" may represent a city.
- "Sea Point" may represent a suburb/area.
- "V&A Waterfront" may represent a named place or area.

Location normalization may occur later in the search pipeline.

## 38. Category Interpretation

Category selection should be based on the user's expressed intent and available evidence.

The supported categories are:

- all
- events
- activities
- places
- web

Examples:

- "events this weekend" → events
- "things to do" → activities
- "restaurants near me" → places
- "what does this mean" → web/information
- broad discovery queries without a specific category → all or an inferred category based on evidence

The engine should avoid forcing a narrow category when the query genuinely spans multiple categories.

## 39. End-to-End Principle

The Intent Engine exists to transform an unstructured human query into a structured representation of what the user means.

The architecture is therefore:

```text
User Query
    ↓
Intent Interpretation
    ↓
QueryIntent
    ↓
Search Planning
    ↓
SearchPlan
    ↓
Providers
    ↓
Normalization
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


The Intent Engine is independent from individual providers. Providers are responsible for retrieval, not for interpreting the user's raw natural-language query.

The Search Planner consumes the structured `QueryIntent` and produces a `SearchPlan` describing how Find iT should search.

The resulting search and ranking process must remain traceable to the original query through the interpreted intent, evidence, search plan, and explanation data.

The next implementation stage is natural-language interpretation testing.

No runtime integration should occur until those tests establish that the Intent Engine correctly represents the intended meaning of representative Find iT queries.
