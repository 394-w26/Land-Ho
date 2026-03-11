import { useEffect } from 'react'
import { fetchWeatherForecast } from '../features/weather/weatherApi'
import type { ForecastPeriod, WeatherForecast } from '../features/weather/weatherApi'
import { useWeather } from '../hooks/useWeather'

function forecastToEmoji(period: Pick<ForecastPeriod, 'shortForecast' | 'isDaytime'>): string {
  const text = (period.shortForecast ?? '').toLowerCase()

  if (text.includes('thunder') || text.includes('storm')) return '⛈️'
  if (text.includes('snow') || text.includes('sleet')) return '❄️'
  if (text.includes('hail')) return '🌨️'
  if (text.includes('rain') || text.includes('showers') || text.includes('drizzle')) return '🌧️'
  if (text.includes('fog') || text.includes('haze') || text.includes('smoke')) return '☁️'
  if (text.includes('wind')) return '💨'
  if (text.includes('cloud') || text.includes('overcast')) return '☁️'
  if (text.includes('partly')) return period.isDaytime ? '⛅' : '🌙'
  if (text.includes('sunny') || text.includes('clear')) return period.isDaytime ? '☀️' : '🌙'

  return '🌡️'
}

export type ForecastMetaForDate = {
  dateIso: string
  periodNumber: number | null
  emoji: string
  matchedPeriodName: string | null
  matchedStartTime: string | null
}

function toIsoDateOnly(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10)
}

function findPeriodForDate(date: Date, forecast: WeatherForecast): ForecastPeriod | null {
  const ts = date.getTime()
  for (const p of forecast.periods ?? []) {
    const start = Date.parse(p.startTime)
    const end = Date.parse(p.endTime)
    if (Number.isFinite(start) && Number.isFinite(end) && ts >= start && ts < end) return p
  }
  return forecast.periods?.[0] ?? null
}

export function getForecastMetaForDate(
  dateInput: Date | string | number,
  forecast: WeatherForecast,
): ForecastMetaForDate {
  const date = new Date(dateInput)
  const period = findPeriodForDate(date, forecast)

  if (!period) {
    return {
      dateIso: toIsoDateOnly(date),
      periodNumber: null,
      emoji: '🌡️',
      matchedPeriodName: null,
      matchedStartTime: null,
    }
  }

  return {
    dateIso: toIsoDateOnly(date),
    periodNumber: typeof period.number === 'number' ? period.number : null,
    emoji: forecastToEmoji(period),
    matchedPeriodName: period.name ?? null,
    matchedStartTime: period.startTime ?? null,
  }
}

export function Weather() {
  useEffect(() => {
    fetchWeatherForecast()
      .then((forecast) => {
        const meta = getForecastMetaForDate(new Date(), forecast)
        console.log(
          `NOAA forecast for ${meta.dateIso}: ${meta.emoji} period #${meta.periodNumber ?? 'n/a'}${
            meta.matchedPeriodName ? ` (${meta.matchedPeriodName})` : ''
          }`,
        )
      })
      .catch((err) => {
        console.error('Weather forecast error:', err)
      })
  }, [])

  return null
}

export const WeatherEmoji = ({ shortForecast }: { shortForecast: string }) => {
  if (!shortForecast) return null
  const emoji = forecastToEmoji({ shortForecast, isDaytime: true })
  return <span className="weatherEmoji">{emoji}</span>
}

function formatHeaderDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function shortLabel(name: string): string {
  const trimmed = name.trim()
  if (trimmed.toLowerCase() === 'this afternoon') return 'PM'
  if (trimmed.toLowerCase() === 'tonight') return 'Nite'
  if (trimmed.length <= 4) return trimmed
  return trimmed.slice(0, 3)
}

export function WeatherInline() {
  const { periods, loading, error } = useWeather()
  const today = periods[0]
  const nextThree = periods.slice(1, 4)

  if (loading) {
    return (
      <div className="weatherInline" aria-label="Weather forecast">
        <div className="weatherInlineDesc">Loading weather…</div>
      </div>
    )
  }

  if (error || !today) {
    return (
      <div className="weatherInline" aria-label="Weather forecast">
        <div className="weatherInlineDesc">{error ?? 'Weather unavailable'}</div>
      </div>
    )
  }

  const emojiToday = forecastToEmoji({ shortForecast: today.shortForecast, isDaytime: today.isDaytime })
  const dateLabel = formatHeaderDate(new Date())

  return (
    <div className="weatherInline" aria-label={`Weather forecast for ${dateLabel}`}>
      <div className="weatherInlineToday">
        <span aria-hidden="true">{emojiToday}</span>
        <span className="weatherInlineTemp">
          {today.temperature}°{today.temperatureUnit}
        </span>
        <span className="weatherInlineDesc">
          <span className="weatherInlineDate">{dateLabel}</span> · {today.shortForecast}
        </span>
      </div>

      <div className="weatherInlineWeek" aria-label="Next forecast periods">
        {nextThree.map((p) => {
          const emoji = forecastToEmoji({ shortForecast: p.shortForecast, isDaytime: p.isDaytime })
          return (
            <span key={p.name} className="weatherInlineDay" title={p.shortForecast}>
              {shortLabel(p.name)} {emoji} {p.temperature}°
            </span>
          )
        })}
      </div>
    </div>
  )
}