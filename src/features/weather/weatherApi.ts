/**
 * NOAA Weather API (api.weather.gov)
 * Requires User-Agent per NWS policy.
 */

const USER_AGENT = 'Land Ho Sailing App (https://github.com/land-ho; contact@landho.app)'

export interface ForecastPeriod {
  number: number
  name: string
  startTime: string
  endTime: string
  isDaytime: boolean
  temperature: number
  temperatureUnit: string
  shortForecast: string
  icon?: string
  windSpeed?: string
  windDirection?: string
  probabilityOfPrecipitation?: { value: number | null }
}

export interface WeatherForecast {
  periods: ForecastPeriod[]
  generatedAt: string
}

/** Chicago area gridpoints (LOT office, grid 76,73) */
const CHICAGO_FORECAST_URL = 'https://api.weather.gov/gridpoints/LOT/76,73/forecast'

export async function fetchWeatherForecast(): Promise<WeatherForecast> {
  const res = await fetch(CHICAGO_FORECAST_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  })
  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status}`)
  }
  const data = (await res.json()) as {
    properties?: {
      periods?: ForecastPeriod[]
      generatedAt?: string
    }
  }
  const periods = (data.properties?.periods ?? []) as ForecastPeriod[]
  const generatedAt = data.properties?.generatedAt ?? new Date().toISOString()
  return { periods, generatedAt }
}
