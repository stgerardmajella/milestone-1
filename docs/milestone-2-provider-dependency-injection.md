# Milestone 2.2.2B.3 — Provider Configuration and Dependency Injection

## 1. Purpose

Define the composition boundary between the intelligence layer and concrete provider implementations.

The intelligence layer depends on provider interfaces, not vendor-specific classes. This keeps providers replaceable without changing the intelligence pipeline.

## 2. Scope

This step establishes:

- provider configuration
- provider registration
- dependency injection
- provider registry
- composition boundary
- provider replacement and testing

This step does not establish:

- live API calls
- HTTP clients
- provider SDKs
- API credentials
- environment changes
- retry logic
- caching
- UI changes

## 3. Provider Interfaces

The intelligence layer depends on:

- `AIProvider`
- `SearchProvider`
- `EventProvider`
- `PlaceProvider`

The intelligence layer must not directly depend on concrete vendor classes.

## 4. Initial Provider Mapping

| Capability | Interface | Implementation |
|---|---|---|
| Query understanding | `AIProvider` | `OpenAIProvider` |
| General web search | `SearchProvider` | `TavilySearchProvider` |
| Events | `EventProvider` | `TicketmasterEventProvider` |
| Places | `PlaceProvider` | `BravePlaceProvider` |

## 5. Provider Registry

The provider registry is the composition boundary between the intelligence layer and concrete provider implementations.

The registry exposes providers through their interfaces:

```ts
type ProviderRegistry = {
  ai: AIProvider
  search: SearchProvider
  events: EventProvider
  places: PlaceProvider
}
```


## 6. Dependency Injection

Provider implementations are created outside the intelligence layer and supplied to it through the provider registry.

The composition root is responsible for constructing the concrete providers:

```ts
const providers: ProviderRegistry = {
  ai: new OpenAIProvider(),
  search: new TavilySearchProvider(),
  events: new TicketmasterEventProvider(),
  places: new BravePlaceProvider(),
}
```

The intelligence layer receives `providers` as a dependency.

It must not instantiate `OpenAIProvider`, `TavilySearchProvider`, `TicketmasterEventProvider`, or `BravePlaceProvider` directly.

This provides a clean dependency-injection boundary and allows implementations to be replaced without changing intelligence-layer logic.


## 7. Provider Replacement

Provider implementations can be replaced without changing the intelligence-layer interfaces.

For example, a mock provider can implement `AIProvider` for deterministic tests, while a different production provider can later replace `OpenAIProvider`.

The intelligence layer must continue to depend only on the `AIProvider`, `SearchProvider`, `EventProvider`, and `PlaceProvider` interfaces.

Provider replacement therefore occurs at the composition boundary rather than inside intelligence-layer logic.

## 8. Configuration Boundary

Provider selection belongs to the application composition layer.

The intelligence layer receives already-configured provider implementations through the `ProviderRegistry`.

Provider configuration must not be embedded in intelligence-layer business logic.

At this milestone, configuration identifies which implementation is registered for each capability. It does not yet define API keys, environment variables, HTTP configuration, retry policies, or provider-specific runtime settings.

This keeps provider configuration separate from intelligence behavior and allows runtime configuration to be introduced later without changing the provider contracts.

## 9. Composition Root

The composition root is the application-level location where concrete provider implementations are assembled into the `ProviderRegistry`.

The composition root is responsible for selecting implementations and supplying them to the intelligence layer.

Conceptually:

```ts
const providers: ProviderRegistry = {
  ai: new OpenAIProvider(),
  search: new TavilySearchProvider(),
  events: new TicketmasterEventProvider(),
  places: new BravePlaceProvider(),
}
```

The composition root is the only layer that needs to know which concrete implementations are being used.

The intelligence layer operates against the provider interfaces and remains independent of vendor-specific construction details.

## 10. Mock Providers and Testing

The provider interfaces must support mock implementations for deterministic testing.

A mock provider can return predefined `ProviderResult` values without making network requests.

For example, a mock `AIProvider` can return a fixed `QueryIntent`, allowing the intelligence pipeline to be tested independently of the OpenAI service.

The same approach applies to search, event, and place providers.

Mock providers must implement the same interfaces as production providers. This ensures that tests exercise the same contracts used by real implementations.

No external provider calls are required for this milestone.

## 11. Provider Failure Isolation

Provider failures must be isolated from unrelated providers.

If an event provider fails, the intelligence layer should record the provider failure and continue with available place, search, or other providers where appropriate.

The same principle applies to place and general search providers.

An AI provider failure is different because query understanding is required to produce a reliable `QueryIntent`. If the AI provider cannot produce a valid intent, the intelligence pipeline must return a controlled failure rather than executing an unreliable search.

A successful provider response containing zero results must remain distinct from a provider failure.

This distinction is represented by `ProviderResult.success` and `ProviderResult.error`.

## 12. Provider Lifecycle

Provider instances are created at the application composition boundary and supplied to the intelligence layer.

The intelligence layer does not control provider construction or replacement.

Provider lifecycle management is intentionally minimal at this milestone.

The project does not yet require:

- connection pools
- persistent provider sessions
- background workers
- distributed provider management
- provider-specific lifecycle infrastructure

Providers should remain ordinary application dependencies until real runtime requirements justify additional lifecycle management.

## 13. Provider Selection Rules

Provider selection is based on capability rather than vendor identity.

The intelligence layer requests the capability it requires:

- query understanding → `AIProvider`
- general web retrieval → `SearchProvider`
- event retrieval → `EventProvider`
- place retrieval → `PlaceProvider`

The intelligence layer must not contain conditional logic such as vendor-specific provider selection.

Provider selection belongs to the composition layer, where a concrete implementation is assigned to each provider interface.

This allows a provider to be changed without modifying the intelligence pipeline.

## 14. Configuration Ownership

Configuration ownership follows the dependency direction.

The application composition layer owns provider configuration and provider selection.

The intelligence layer owns business rules for interpreting queries, combining provider results, verification, filtering, ranking, and explanation.

Provider implementations own only provider-specific translation and communication details when those are introduced.

This separation prevents provider-specific configuration from leaking into intelligence-layer business logic.

At this milestone, no runtime configuration mechanism is implemented. The purpose is to establish ownership boundaries before live provider integration begins.

## 15. Provider Construction Boundary

Concrete provider instances are constructed outside the intelligence layer.

The composition root is responsible for constructing and registering provider implementations.

For example:

```ts
const providers: ProviderRegistry = {
  ai: new OpenAIProvider(),
  search: new TavilySearchProvider(),
  events: new TicketmasterEventProvider(),
  places: new BravePlaceProvider(),
}
```

The intelligence layer receives the completed `ProviderRegistry` and uses the provider interfaces exposed by it.

This prevents provider construction details from becoming part of intelligence-layer logic.

Provider construction may later incorporate runtime configuration, credentials, or provider-specific options, but those concerns remain outside the intelligence layer.

## 16. Provider Registry Invariants

The `ProviderRegistry` must satisfy the provider contracts defined by the intelligence layer.

Each required capability must have exactly one registered provider:

- `ai`
- `search`
- `events`
- `places`

The registry must not expose vendor-specific behavior to the intelligence layer.

A registered provider may be replaced with another implementation as long as the replacement satisfies the same provider interface.

The intelligence layer may therefore rely on the registry's capabilities without knowing which vendor supplies them.

At this milestone, registry validation is a design requirement rather than a runtime validation mechanism.
