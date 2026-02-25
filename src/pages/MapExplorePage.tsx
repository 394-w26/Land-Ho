import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Map, { Marker, NavigationControl, Popup, type MapRef } from 'react-map-gl/mapbox'
import { db, isFirebaseReady } from '../lib/firebase'
import {
  subscribePublishedBoats,
  type BoatCategory,
  type BoatCoordinates,
  type BoatRecord,
} from '../features/boats/boatsApi'
import { searchLocationSuggestions, type LocationSuggestion } from '../features/location/mapboxGeocode'
import 'mapbox-gl/dist/mapbox-gl.css'

interface LngLatBounds {
  west: number
  south: number
  east: number
  north: number
}

const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined

const categories: { key: 'all' | BoatCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'dayTrip', label: 'Day Trips' },
  { key: 'sunset', label: 'Sunset Cruises' },
  { key: 'training', label: 'Training' },
  { key: 'island', label: 'Island Hops' },
]

const hasCoordinates = (coordinates: BoatCoordinates | null): coordinates is BoatCoordinates => {
  if (!coordinates) {
    return false
  }
  return Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)
}

const hasMapCoordinates = (boat: BoatRecord): boat is BoatRecord & { coordinates: BoatCoordinates } => {
  return hasCoordinates(boat.coordinates)
}

const inBounds = (coordinates: BoatCoordinates, bounds: LngLatBounds | null): boolean => {
  if (!bounds) {
    return true
  }
  return (
    coordinates.lng >= bounds.west &&
    coordinates.lng <= bounds.east &&
    coordinates.lat >= bounds.south &&
    coordinates.lat <= bounds.north
  )
}

function MapExplorePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const mapRef = useRef<MapRef | null>(null)
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})
  const [boats, setBoats] = useState<BoatRecord[]>([])
  const [boatsLoading, setBoatsLoading] = useState(Boolean(db && isFirebaseReady))
  const [boatsError, setBoatsError] = useState('')
  const [category, setCategory] = useState<'all' | BoatCategory>('all')
  const [searchText, setSearchText] = useState('')
  const [seatFilter, setSeatFilter] = useState('')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [bounds, setBounds] = useState<LngLatBounds | null>(null)
  const [selectedBoatIdManual, setSelectedBoatIdManual] = useState('')
  const highlightBoatId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('highlight') ?? ''
  }, [location.search])
  const selectedBoatId = selectedBoatIdManual || highlightBoatId

  useEffect(() => {
    if (!db || !isFirebaseReady) {
      return
    }
    const unsubscribe = subscribePublishedBoats(
      (nextBoats) => {
        setBoats(nextBoats)
        setBoatsLoading(false)
        setBoatsError('')
      },
      (message) => {
        setBoatsLoading(false)
        setBoatsError(message)
      },
    )
    return () => unsubscribe()
  }, [])

  const filteredBoats = useMemo(() => {
    return boats.filter((boat) => {
      const byCategory = category === 'all' || boat.category === category
      const keyword = searchText.trim().toLowerCase()
      // When typing in the "Where" input we should only filter by location
      const bySearch = keyword.length === 0 || boat.location.toLowerCase().includes(keyword)
      const seats = Number(seatFilter || 0)
      const bySeats = seats === 0 || boat.seats >= seats
      return byCategory && bySearch && bySeats
    })
  }, [boats, category, searchText, seatFilter])

  const visibleBoats = useMemo(() => {
    return filteredBoats.filter((boat) => {
      if (!hasCoordinates(boat.coordinates)) {
        return true
      }
      return inBounds(boat.coordinates, bounds)
    })
  }, [filteredBoats, bounds])

  const selectedBoat = useMemo(() => {
    return visibleBoats.find((item) => item.id === selectedBoatId) ?? null
  }, [visibleBoats, selectedBoatId])

  const centeredBoats = useMemo(() => {
    return filteredBoats.filter(hasMapCoordinates)
  }, [filteredBoats])

  const initialViewState = useMemo(() => {
    if (centeredBoats.length === 0) {
      return { longitude: 118.0894, latitude: 24.4798, zoom: 5.2 }
    }
    const lat = centeredBoats.reduce((sum, item) => sum + item.coordinates.lat, 0) / centeredBoats.length
    const lng = centeredBoats.reduce((sum, item) => sum + item.coordinates.lng, 0) / centeredBoats.length
    return { longitude: lng, latitude: lat, zoom: 5.4 }
  }, [centeredBoats])

  const handleCardSelect = (boat: BoatRecord) => {
    setSelectedBoatIdManual(boat.id)
    if (hasCoordinates(boat.coordinates)) {
      mapRef.current?.flyTo({
        center: [boat.coordinates.lng, boat.coordinates.lat],
        zoom: 10.5,
        duration: 600,
      })
    }
  }

  // Debounced location suggestions
  useEffect(() => {
    if (!mapboxToken || !searchText || searchText.trim().length < 2) {
      setSuggestions([])
      setSuggestionsLoading(false)
      return
    }
    let active = true
    setSuggestionsLoading(true)
    const id = window.setTimeout(() => {
      searchLocationSuggestions(searchText, mapboxToken)
        .then((res) => {
          if (!active) return
          setSuggestions(res)
        })
        .catch(() => {
          if (!active) return
          setSuggestions([])
        })
        .finally(() => {
          if (!active) return
          setSuggestionsLoading(false)
        })
    }, 320)
    return () => {
      active = false
      window.clearTimeout(id)
    }
  }, [searchText, mapboxToken])

  // click outside to close suggestions
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      const el = document.querySelector('.suggestionsList')
      const input = document.querySelector('.searchItem input')
      if (el && !el.contains(target) && input && !input.contains(target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const resetFilters = () => {
    setCategory('all')
    setSearchText('')
    setSeatFilter('')
  }

  useEffect(() => {
    if (!highlightBoatId) {
      return
    }
    const target = boats.find((item) => item.id === highlightBoatId)
    if (!target) {
      return
    }
    const card = cardRefs.current[target.id]
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    if (hasCoordinates(target.coordinates)) {
      mapRef.current?.flyTo({
        center: [target.coordinates.lng, target.coordinates.lat],
        zoom: 10.5,
        duration: 700,
      })
    }
    const timer = window.setTimeout(() => {
      navigate('/map', { replace: true })
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [highlightBoatId, boats, navigate])

  return (
    <div className="mapPage">
      <header className="topBar mapTopBar">
        <Link className="brand" to="/" state={{ initialMode: 'guest' }}>
          <img className="brandLogo" src="/logo.png" alt="Land Ho logo" />
          <span>Land Ho</span>
        </Link>
        <div className="mapTopActions">
          <Link className="ghostBtn mapNavBtn" to="/">
            Home listings
          </Link>
        </div>
      </header>

      <section className="searchSection mapSearchSection">
        <div className="searchItem">
          <label>Where</label>
          <input
            placeholder="Search ports or bays"
            value={searchText}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => {
              setSearchText(e.target.value)
              setShowSuggestions(true)
            }}
          />
          {showSuggestions && (suggestions.length > 0 || suggestionsLoading) && (
            <div className="suggestionsList">
              {suggestionsLoading && <div className="suggestionItem muted">Searching...</div>}
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  className="suggestionItem"
                  onClick={() => {
                    setSearchText(s.placeName)
                    setShowSuggestions(false)
                    // set bounds to center around selection
                    const delta = 0.08
                    setBounds({
                      west: s.coordinates.lng - delta,
                      south: s.coordinates.lat - delta,
                      east: s.coordinates.lng + delta,
                      north: s.coordinates.lat + delta,
                    })
                    mapRef.current?.flyTo({
                      center: [s.coordinates.lng, s.coordinates.lat],
                      zoom: 10.5,
                      duration: 600,
                    })
                  }}
                >
                  <div className="suggestionTitle">{s.placeName}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="searchItem">
          <label>Guests</label>
          <input
            placeholder="Minimum seats"
            value={seatFilter}
            onChange={(e) => setSeatFilter(e.target.value)}
          />
        </div>
        <button className="searchBtn" onClick={resetFilters}>
          Reset
        </button>
      </section>

      <section className="categoryTabs">
        {categories.map((item) => (
          <button
            key={item.key}
            className={category === item.key ? 'tab active' : 'tab'}
            onClick={() => setCategory(item.key)}
          >
            {item.label}
          </button>
        ))}
      </section>

      {!mapboxToken && (
        <p className="authNotice">Mapbox token is missing. Set VITE_MAPBOX_ACCESS_TOKEN in your environment.</p>
      )}
      {boatsError && <p className="authNotice">{boatsError}</p>}

      <section className="mapLayout">
        <div className="mapPanel">
          {mapboxToken ? (
            <Map
              ref={mapRef}
              mapboxAccessToken={mapboxToken}
              initialViewState={initialViewState}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              onMoveEnd={(event) => {
                const b = event.target.getBounds()
                if (!b) {
                  return
                }
                setBounds({
                  west: b.getWest(),
                  south: b.getSouth(),
                  east: b.getEast(),
                  north: b.getNorth(),
                })
              }}
            >
              <NavigationControl position="top-right" />
              {visibleBoats
                .filter(hasMapCoordinates)
                .map((boat) => {
                  const active = selectedBoatId === boat.id
                  return (
                    <Marker key={boat.id} longitude={boat.coordinates.lng} latitude={boat.coordinates.lat} anchor="bottom">
                      <button
                        className={active ? 'priceMarker active' : 'priceMarker'}
                        onClick={() => navigate(`/boats/${boat.id}`)}
                      >
                        ${boat.price}
                      </button>
                    </Marker>
                  )
                })}
              {selectedBoat && hasCoordinates(selectedBoat.coordinates) && (
                <Popup
                  longitude={selectedBoat.coordinates.lng}
                  latitude={selectedBoat.coordinates.lat}
                  anchor="top"
                  offset={12}
                  closeButton={false}
                  onClose={() => setSelectedBoatIdManual('')}
                >
                  <div className="mapPopup">
                    <strong>{selectedBoat.title}</strong>
                    <p>{selectedBoat.location}</p>
                    <p>$ {selectedBoat.price} / person</p>
                    <button
                      className="ghostBtn mapPopupBtn"
                      onClick={() => navigate(`/boats/${selectedBoat.id}`)}
                    >
                      Open details
                    </button>
                  </div>
                </Popup>
              )}
            </Map>
          ) : (
            <div className="mapFallback">
              <p>Map is unavailable until Mapbox token is configured.</p>
            </div>
          )}
        </div>

        <aside className="mapListPanel">
          <div className="listHeader mapListHeader">
            <h2>Published sailings</h2>
            <p>{boatsLoading ? 'Loading...' : `${visibleBoats.length} matches`}</p>
          </div>

          <div className="mapCardList">
            {boatsLoading ? (
              <article className="boatCard">
                <div className="cardBody">
                  <p className="muted">Loading sailings from cloud...</p>
                </div>
              </article>
            ) : (
              visibleBoats.map((boat) => {
                const active = selectedBoatId === boat.id
                const flashing = boat.id === highlightBoatId
                const cardClass = active
                  ? `boatCard clickableCard mapCard active ${flashing ? 'mapCardFlash' : ''}`
                  : `boatCard clickableCard mapCard ${flashing ? 'mapCardFlash' : ''}`
                return (
                  <article
                    key={boat.id}
                    className={cardClass}
                    ref={(node) => {
                      cardRefs.current[boat.id] = node
                    }}
                    onClick={() => handleCardSelect(boat)}
                  >
                    <div className="cardImageWrap">
                      <img src={boat.image} alt={boat.title} className="cardImage" />
                    </div>
                    <div className="cardBody">
                      <div className="cardRow">
                        <h3>{boat.title}</h3>
                        <span>★ {boat.rating.toFixed(2)}</span>
                      </div>
                      <p>{boat.location}</p>
                      <p>
                        Captain {boat.captain} · {boat.seats} seats
                      </p>
                      <p className="price">$ {boat.price} / person</p>
                      {!hasCoordinates(boat.coordinates) && (
                        <p className="mapCardHint">Map pin unavailable for this listing.</p>
                      )}
                    </div>
                  </article>
                )
              })
            )}
          </div>

          {!boatsLoading && visibleBoats.length === 0 && (
            <div className="emptyState">
              <p>No sailings match current map and filters.</p>
              <button onClick={resetFilters}>Reset Filters</button>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}

export default MapExplorePage
