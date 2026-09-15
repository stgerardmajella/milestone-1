import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { parseSearchQuery } from './lib/parser'
import { filterActivities } from './lib/filter'
import { scoreActivities } from './lib/scoring'
import {
  calculateDistanceKm,
  createNavigationUrl,
  formatDistanceKm,
} from './intelligence/geolocation'
import type { Activity, RankedActivity } from './types/recommendation'

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

function App() {
  const [query, setQuery] = useState('')
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

    const parsedSearch = parseSearchQuery(query)

  

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
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">Find iT</span>

          <h1>
            Find something
            <br />
            worth doing.
          </h1>

          <p className="hero-description">
          Tell us what you feel like doing, your budget,
          who going with, or anything else that matters.
          </p>

          <form onSubmit={runRecommendation} className="search-form">
            <div className="search-box">
              <input
                id="search"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What would you like to do?"
                aria-label="What would you like to do?"
              />

              <button
                type="submit"
                disabled={loading || !query.trim()}
              >
                {loading ? 'Researching...' : 'Find activities'}
              </button>
            </div>

            <p className="example-query">
            Try: “I have R300 and want something fun to do with
            my girlfriend Saturday.”
            </p>
          </form>
        </div>
      </section>

      {loading && (
        <section className="status-section">
          <div className="loader" />
          <h2>Researching activities...</h2>
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
          <div className="results-header">
  <div>
    <span className="eyebrow">YOUR RESULTS</span>
    <h2>Recommended for you</h2>
  </div>

  <div>
    <span className="result-count">
      {results.length} matches
    </span>

    {!userLocation && (
      <button
        type="button"
        onClick={requestUserLocation}
        disabled={locationLoading}
      >
        {locationLoading ? 'Finding you...' : 'Show distance'}
      </button>
    )}
  </div>
</div>

{/* STEP 6 — Location status message */}
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
            <span>“{query}”</span>
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
              {results.map((result) => (
                <article
                  key={result.activity.id}
                  className="activity-card"
                >
                  <div className="card-top">
                    <span className="rank">
                      #{result.rank}
                    </span>

                    <span className="match-score">
                      Match score {result.matchScore}
                    </span>
                  </div>

                  <div className="card-content">
                    <span className="category">
                      {result.activity.category}
                    </span>

                    <h3>{result.activity.name}</h3>

                    <p className="description">
                      {result.activity.description}
                    </p>

                    <div className="activity-meta">
  <span>
    R{result.activity.price}
  </span>

  <span>
  ★ {result.activity.rating ?? '—'}
</span>

  <span>
    {result.activity.location}
  </span>

  {getActivityDistance(result) && (
    <span>
      {getActivityDistance(result)} away
    </span>
  )}
</div>

                    <div className="tag-list">
                      {result.activity.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
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

                    <div className="why-selected">
                      <strong>Why this was selected</strong>
                      <p>{result.whySelected}.</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {!hasSearched && !loading && (
        <section className="intro-section">
          <div>
            <span className="eyebrow">HOW IT WORKS</span>
            <h2>Simple in. Smart out.</h2>
          </div>

          <div className="steps">
            <div className="step">
              <span>01</span>
              <h3>Tell us what you want</h3>
              <p>
                Describe your plans naturally, just like you would
                to a person.
              </p>
            </div>

            <div className="step">
              <span>02</span>
              <h3>We understand it</h3>
              <p>
                Your request is converted into useful criteria such
                as budget, people and preferences.
              </p>
            </div>

            <div className="step">
              <span>03</span>
              <h3>Get your best matches</h3>
              <p>
                Activities are filtered, scored and ranked to give
                you the strongest matches.
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

export default App


