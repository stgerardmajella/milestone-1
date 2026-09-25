import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { supabase } from './lib/supabase'
import { parseSearchQuery } from './lib/parser'
import { understandQueryLocally } from './intelligence/client'
import { filterActivities } from './lib/filter'
import { scoreActivities } from './lib/scoring'
import {
  calculateDistanceKm,
  createNavigationUrl,
  formatDistanceKm,
} from './intelligence/geolocation'

import type { QueryIntent } from './intelligence/contracts'
import type {
  Activity,
  ParsedSearch,
  RankedActivity,
} from './types/recommendation'

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = Math.random() * 16 | 0
    const value = character === 'x'
      ? randomValue
      : (randomValue & 0x3) | 0x8

    return value.toString(16)
  })
}

function isValidIsoCalendarDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function queryIntentToParsedSearch(
  intent: QueryIntent,
  fallbackSearch: ParsedSearch,
): ParsedSearch {
  let relationship: ParsedSearch['relationship'] = null

  if (
    intent.audience === 'couple' ||
    intent.preferences.includes('romantic')
  ) {
    relationship = 'couple'
  } else if (intent.audience === 'family') {
    relationship = 'family'
  } else if (intent.audience === 'friends') {
    relationship = 'friends'
  }

  const aiDate = intent.dateRange.from
  const isIsoDate = isValidIsoCalendarDate(aiDate)

  return {
    intent: intent.intent,
    location: intent.location,
    budget: intent.budget.max,
    people: intent.people,
    date: isIsoDate ? aiDate : fallbackSearch.date,
    relationship,
    preferences: [
      ...new Set([
        ...intent.preferences,
        ...intent.keywords,
      ]),
    ],
  }
}

const FILTER_PREFERENCE_MAP: Record<string, string> = {
  Romantic: 'romantic',
  Fun: 'fun',
  Outdoor: 'outdoor',
  Family: 'family',
  Adventure: 'adventure',
  Food: 'food',
  'Live music': 'music',
}

function App() {
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [maxPrice, setMaxPrice] = useState(1000)
  const [filtersApplied, setFiltersApplied] = useState(false)

  const [baseResults, setBaseResults] = useState<RankedActivity[]>([])
  const [results, setResults] = useState<RankedActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const filterGroups = {
    moods: [
      'Romantic',
      'Fun',
      'Outdoor',
      'Family',
      'Adventure',
      'Relaxing',
      'Nightlife',
      'Date night',
    ],
    activities: [
      'Pool table',
      'Swimming pool',
      'Bowling',
      'Movies',
      'Gaming',
      'Hiking',
      'Beach',
      'Food',
      'Live music',
    ],
  }

  function toggleFilter(filter: string) {
    setSelectedFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter],
    )
  }

  function applyLocalFilters(sourceResults: RankedActivity[]): RankedActivity[] {
    const filterPreferences = selectedFilters
      .map((filter) => FILTER_PREFERENCE_MAP[filter])
      .filter((preference): preference is string => Boolean(preference))

    const filteredActivities = filterActivities(
      sourceResults.map((result) => result.activity),
      maxPrice,
      null,
      filterPreferences,
    )

    const allowedIds = new Set(filteredActivities.map((activity) => activity.id))

    return sourceResults.filter((result) => allowedIds.has(result.activity.id))
  }


  function clearFilters() {
    setSelectedFilters([])
    setMaxPrice(1000)
    setFiltersApplied(false)
    setResults(baseResults)
  }

  function applyFilters() {
    setResults(applyLocalFilters(baseResults))
    setFiltersApplied(true)
    setFiltersOpen(false)
  }


function getActivityDistance(result: RankedActivity): string | null {
  if (
    userLocation === null ||
    result.activity.latitude === null ||
    result.activity.longitude === null
  ) {
    return null
  }

  const distanceKm = calculateDistanceKm(
    userLocation,
    {
      latitude: result.activity.latitude,
      longitude: result.activity.longitude,
    },
  )

  return formatDistanceKm(distanceKm)
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    setLocationError('Location services are not available on this device.')
    return
  }

  setLocationLoading(true)
  setLocationError(null)

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })

      setLocationLoading(false)
    },
    (positionError) => {
      let message = 'We could not determine your location.'

      if (positionError.code === GeolocationPositionError.PERMISSION_DENIED) {
        message = 'Location permission was denied. You can still use Find iT without it.'
      } else if (
        positionError.code === GeolocationPositionError.POSITION_UNAVAILABLE
      ) {
        message = 'Your location is currently unavailable.'
      } else if (
        positionError.code === GeolocationPositionError.TIMEOUT
      ) {
        message = 'Finding your location took too long. Please try again.'
      }

      setLocationError(message)
      setLocationLoading(false)
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000,
    },
  )
}
  async function runRecommendation(event: FormEvent) {
    event.preventDefault()

    if (!query.trim()) {
      return
    }

    setLoading(true)
    setError(null)
    setHasSearched(true)

    const { data, error: supabaseError } = await supabase
  .from('activities')
  .select(`
    id,
    name,
    description,
    category,
    price,
    location,
    latitude,
    longitude,
    date,
    start_time,
    end_time,
    image_url,
    rating,
    source_name,
    source_url,
    activity_tags (
      tag
    )
  `)

    if (supabaseError) {
      setError(supabaseError.message)
      setLoading(false)
      return
    }

    const activities = (data ?? []).map((activity) => ({
      id: activity.id,
      name: activity.name,
      description: activity.description,
      category: activity.category,
      price: activity.price,
      location: activity.location,
      latitude: activity.latitude,
      longitude: activity.longitude,
      date: activity.date,
      start_time: activity.start_time,
      end_time: activity.end_time,
      image_url: activity.image_url,
      rating: activity.rating,
      source_name: activity.source_name,
      source_url: activity.source_url,
      tags: activity.activity_tags?.map((item) => item.tag) ?? [],
    })) as Activity[]

    const fallbackSearch = parseSearchQuery(query)
    const understanding = await understandQueryLocally(query)
    let parsedSearch: ParsedSearch

    if (!understanding.success) {
      const providerError = understanding.error

      setError(
        providerError?.message ?? 'Query understanding failed.',
      )
      setLoading(false)
      return
    } else {
      const [intent] = understanding.data

      if (!intent) {
        setError('Query understanding succeeded but produced no intent.')
        setLoading(false)
        return
      }

      parsedSearch = queryIntentToParsedSearch(
        intent,
        fallbackSearch,
      )
    }

    const eligibleActivities = filterActivities(
      activities,
      parsedSearch.budget,
      parsedSearch.location,
      parsedSearch.preferences,
    )

    const rankedActivities = scoreActivities(
      eligibleActivities,
      parsedSearch,
    )

    const topResults = rankedActivities.slice(0, 5)

    setBaseResults(topResults)
    setResults(topResults)

    const sessionId = createSessionId()

    const { error: sessionError } = await supabase
      .from('search_sessions')
      .insert({
        id: sessionId,
        original_query: query,
        location: parsedSearch.location,
        budget: parsedSearch.budget,
        date: parsedSearch.date,
        people: parsedSearch.people,
        intent: parsedSearch.intent,
      })

    if (sessionError) {
      setError(
        `Recommendations worked, but the search could not be saved: ${sessionError.message}`,
      )
      setLoading(false)
      return
    }

    if (topResults.length > 0) {
      const searchResults = topResults.map((result) => ({
        session_id: sessionId,
        activity_id: result.activity.id,
        match_score: result.matchScore,
        rank: result.rank,
        why_selected: result.whySelected,
      }))

      const { error: resultsError } = await supabase
        .from('search_results')
        .insert(searchResults)

      if (resultsError) {
        setError(
          `Recommendations worked, but the results could not be saved: ${resultsError.message}`,
        )
        setLoading(false)
        return
      }
    }

    setLoading(false)
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="header-inner">
        <div className="brand" aria-label="Find iT">
  <svg
    className="brand-mark"
    viewBox="0 0 32 32"
    aria-hidden="true"
  >
    <path
      d="M16 2.5C9.1 2.5 3.5 8 3.5 14.8c0 8.2 8.1 12.7 11.5 14.7.6.3 1.3.3 1.9 0 4.4-2 11.5-6.5 11.5-14.7C28.5 8 22.9 2.5 16 2.5Z"
      fill="currentColor"
    />
    <circle
      cx="16"
      cy="14"
      r="4.2"
      fill="white"
    />
  </svg>

  <span className="brand-name">
    Find <strong>iT</strong>
  </span>
</div>

          <form onSubmit={runRecommendation} className="header-search-form">
            <div className="header-search">
              <span className="search-icon" aria-hidden="true">⌕</span>

              <input
                id="search"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for activities, places, events..."
                aria-label="Search for activities, places, events"
              />

              <button
                type="submit"
                className="header-search-button"
                disabled={loading || !query.trim()}
                aria-label={loading ? 'Searching' : 'Search'}
              >
                {loading ? '...' : 'Search'}
              </button>
            </div>
          </form>

          <button
            type="button"
            className="location-selector"
            onClick={requestUserLocation}
            disabled={locationLoading}
          >
            <span className="location-pin" aria-hidden="true">⌖</span>
            <span>{locationLoading ? 'Finding you...' : 'Cape Town'}</span>
            <span className="location-chevron" aria-hidden="true">⌄</span>
          </button>

          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Open menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <nav className="category-nav" aria-label="Search categories">
        <div className="category-nav-inner">
          <button type="button" className="category-pill active">
            All
          </button>
          <button type="button" className="category-pill">
            Events
          </button>
          <button type="button" className="category-pill">
            Activities
          </button>
          <button type="button" className="category-pill">
            Places
          </button>
          <button type="button" className="category-pill">
            Web
          </button>
        </div>
      </nav>

      {loading && (
        <section className="status-section">
          <div className="loader" />
          <h2>Finding something for you...</h2>
          <p>
            Understanding your request and finding the best matches.
          </p>
        </section>
      )}

      {error && (
        <section className="status-section error">
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </section>
      )}

      {!loading && !error && hasSearched && (
        <section className="results-section">
          <div className="results-toolbar">
            <div>
              <span className="results-kicker">DISCOVER</span>
              <h1>Find something worth doing.</h1>
            </div>

            <div className="results-toolbar-right">
              <span className="result-count">
                {results.length} {results.length === 1 ? 'match' : 'matches'}
              </span>

              {!userLocation && (
                <button
                  type="button"
                  className="distance-button"
                  onClick={requestUserLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? 'Finding you...' : 'Show distance'}
                </button>
              )}
            </div>
          </div>

          <section className="filters-section" aria-label="Search filters">
            <div className="filters-bar">
              <button
                type="button"
                className={filtersApplied ? 'filters-toggle active' : 'filters-toggle'}
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
              >
                <span>Filters</span>
                {selectedFilters.length > 0 && (
                  <span className="filters-count">{selectedFilters.length}</span>
                )}
              </button>

              {filtersApplied && (
                <span className="filters-applied-label">Filters applied</span>
              )}

              {filtersApplied && (
                <button
                  type="button"
                  className="filters-clear-inline"
                  onClick={clearFilters}
                >
                  Clear
                </button>
              )}
            </div>

            {filtersOpen && (
              <div className="filter-panel">
                <div className="filter-panel-header">
                  <div>
                    <h2>Refine your search</h2>
                    <p className="filter-selection-summary">
                      {selectedFilters.length === 0
                        ? 'Choose what matters to you.'
                        : selectedFilters.length + ' filter' + (selectedFilters.length === 1 ? '' : 's') + ' selected'}
                    </p>
                  </div>
                </div>

                <div className="filter-group">
                  <h3>Mood</h3>
                  <div className="filter-chips">
                    {filterGroups.moods.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        className={selectedFilters.includes(filter) ? 'filter-chip selected' : 'filter-chip'}
                        onClick={() => toggleFilter(filter)}
                        aria-pressed={selectedFilters.includes(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filter-group">
                  <h3>Activities</h3>
                  <div className="filter-chips">
                    {filterGroups.activities.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        className={selectedFilters.includes(filter) ? 'filter-chip selected' : 'filter-chip'}
                        onClick={() => toggleFilter(filter)}
                        aria-pressed={selectedFilters.includes(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filter-group price-filter-group">
                  <div className="price-filter-heading">
                    <h3>Maximum price</h3>
                    <span>R{maxPrice}</span>
                  </div>

                  <input
                    className="price-range"
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(Number(event.target.value))}
                    aria-label="Maximum price"
                  />

                  <button
                    type="button"
                    className={maxPrice === 0 ? 'free-filter-button selected' : 'free-filter-button'}
                    onClick={() => setMaxPrice(0)}
                    aria-pressed={maxPrice === 0}
                  >
                    Free
                  </button>
                </div>

                <div className="filter-panel-actions">
                  <button
                    type="button"
                    className="filter-clear-button"
                    onClick={clearFilters}
                  >
                    Clear all
                  </button>

                  <button
                    type="button"
                    className="filter-apply-button"
                    onClick={applyFilters}
                  >
                    Apply filters
                  </button>
                </div>
              </div>
            )}
          </section>

          {locationError && (
            <div className="location-message">
              <p>{locationError}</p>
            </div>
          )}

          {userLocation && (
            <div className="location-message">
              <p>
                Distance is calculated approximately from your current location.
              </p>
            </div>
          )}

          <div className="query-summary">
            <span>{query}</span>
          </div>

          {results.length === 0 ? (
            <div className="empty-state">
              <h3>No activities found</h3>
              <p>
                Try increasing your budget or changing your request.
              </p>
            </div>
          ) : (
            <div className="results-grid">
              {results.map((result) => {
                const primaryTag = result.activity.tags?.[0] ?? result.activity.category;
                const distance = getActivityDistance(result);

                return (
                  <article
                    key={result.activity.id}
                    className="activity-card"
                  >
                    {result.activity.image_url ? (
                      <div className="activity-image-wrap">
                        <img
                          className="activity-image"
                          src={result.activity.image_url}
                          alt={result.activity.name}
                        />
                      </div>
                    ) : (
                      <div className="activity-image-wrap activity-image-placeholder">
                        <span>Find iT</span>
                      </div>
                    )}

                    <div className="card-content">
                      <h2>{result.activity.name}</h2>

                      <div className="activity-meta">
                        <span className="meta-item">
                          <span className="meta-icon" aria-hidden="true">ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“</span>
                          R{result.activity.price}
                        </span>

                        <span className="meta-item">
                          <span className="meta-icon" aria-hidden="true">ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¾ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸</span>
                          {result.activity.category}
                        </span>

                        {distance && (
                          <span className="meta-item">
                            {distance} away
                          </span>
                        )}
                      </div>

                      <p className="description">
                        {result.activity.description}
                      </p>

                      <div className="card-footer">
                        <div className="tag-list">
                          <span className="tag">
                            <span aria-hidden="true">ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦</span>
                            {primaryTag}
                          </span>
                        </div>

                        {result.activity.latitude !== null &&
                          result.activity.longitude !== null && (
                            <a
                              className="directions-link"
                              href={createNavigationUrl({
                                latitude: result.activity.latitude,
                                longitude: result.activity.longitude,
                              })}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Directions
                            </a>
                          )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {!hasSearched && !loading && (
        <section className="welcome-section">
          <div className="welcome-content">
            <span className="results-kicker">DISCOVER</span>
            <h1>Discover. Explore. Find iT.</h1>
            <p>
              Tell us what you feel like doing, where you want to go,
              your budget, who you are with, or anything else that matters.
            </p>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <span>Discover. Explore. Find <strong>iT.</strong></span>
      </footer>
    </main>
  )
}

export default App
