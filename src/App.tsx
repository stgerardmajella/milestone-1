import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Activity = {
  id: string
  name: string
  category: string
  price: number
  location: string
  rating: number | null
}

function App() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadActivities() {
      const { data, error } = await supabase
        .from('activities')
        .select('id, name, category, price, location, rating')
        .limit(5)

      if (error) {
        setError(error.message)
      } else {
        setActivities(data ?? [])
      }

      setLoading(false)
    }

    loadActivities()
  }, [])

  if (loading) {
    return <p>Loading activities...</p>
  }

  if (error) {
    return <p>Supabase error: {error}</p>
  }

  return (
    <main>
      <h1>Milestone 1</h1>
      <p>Activities loaded from Supabase:</p>

      <ul>
        {activities.map((activity) => (
          <li key={activity.id}>
            {activity.name} — R{activity.price} — {activity.category}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App