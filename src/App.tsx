import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { parseSearchQuery } from './lib/parser'
import { filterActivities } from './lib/filter'
import { scoreActivities } from './lib/scoring'
import type { Activity, RankedActivity } from './types/recommendation'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RankedActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

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
    )

    const rankedActivities = scoreActivities(
      eligibleActivities,
      parsedSearch,
    )

    const topResults = rankedActivities.slice(0, 5)

    setResults(topResults)

    const sessionId = crypto.randomUUID()

    const { error: sessionError } = await supabase
      .from('search_sessions')
      .insert({
        id: sessionId,
        original_query: query,
        location: parsedSearch.location,
        budget: parsedSearch.budget,
        date: null,
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
          <span className="eyebrow">MILESTONE 1</span>

          <h1>
            Find something
            <br />
            worth doing.
          </h1>

          <p className="hero-description">
            Tell us what you feel like doing, your budget,
            who you’re with, or anything else that matters.
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

            <span className="result-count">
              {results.length} matches
            </span>
          </div>

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
                    </div>

                    <div className="tag-list">
                      {result.activity.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>

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