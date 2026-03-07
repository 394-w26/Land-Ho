import { useWeather } from '../hooks/useWeather'

/** Compact inline: sits next to list header. Full: big today + week row. */
export default function WeatherForecast({
  compact = false,
}: {
  compact?: boolean
}) {
  const { periods, loading, error } = useWeather()

  if (loading) {
    return (
      <div className={compact ? 'weatherInline' : 'weatherForecast'}>
        <span className="muted">Loading…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={compact ? 'weatherInline' : 'weatherForecast'}>
        <span className="muted">{error}</span>
      </div>
    )
  }

  const today = periods[0]
  const weekPeriods = periods.slice(1, 6)

  if (compact) {
    return (
      <div className="weatherInline">
        <div className="weatherInlineToday">
          {today.icon && (
            <img src={today.icon} alt="" className="weatherInlineIcon" />
          )}
          <span className="weatherInlineTemp">
            {today.temperature}°{today.temperatureUnit}
          </span>
          <span className="weatherInlineDesc">{today.shortForecast}</span>
        </div>
        <div className="weatherInlineWeek">
          {weekPeriods.map((p) => (
            <span key={p.name} className="weatherInlineDay">
              {p.name.replace(' Night', '')} {p.temperature}°
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="weatherForecast">
      <div className="weatherToday">
        {today.icon && (
          <img src={today.icon} alt="" className="weatherTodayIcon" />
        )}
        <div className="weatherTodayMain">
          <span className="weatherTodayTemp">
            {today.temperature}°{today.temperatureUnit}
          </span>
          <span className="weatherTodayName">{today.name}</span>
        </div>
        <span className="weatherTodayDesc">{today.shortForecast}</span>
      </div>
      <div className="weatherWeek">
        {weekPeriods.map((p) => (
          <div key={p.name} className="weatherWeekDay">
            {p.icon && <img src={p.icon} alt="" className="weatherWeekIcon" />}
            <span className="weatherWeekTemp">
              {p.temperature}°{p.temperatureUnit}
            </span>
            <span className="weatherWeekName">{p.name}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
