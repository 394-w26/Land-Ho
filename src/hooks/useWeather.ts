import { useEffect, useState } from 'react'
import { fetchWeatherForecast } from '../features/weather/weatherApi'

export interface WeatherPeriod {
  name: string
  temperature: number
  temperatureUnit: string
  shortForecast: string
  isDaytime: boolean
  icon?: string
}

export function useWeather() {
  const [periods, setPeriods] = useState<WeatherPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchWeatherForecast()
      .then((data) => {
        if (!cancelled && data?.periods) {
          setPeriods(
            data.periods.map((p) => ({
              name: p.name,
              temperature: p.temperature,
              temperatureUnit: p.temperatureUnit ?? 'F',
              shortForecast: p.shortForecast ?? '',
              isDaytime: p.isDaytime ?? true,
              icon: p.icon,
            })),
          )
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load weather')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { periods, loading, error }
}
