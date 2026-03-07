import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Map, { Marker, NavigationControl, Popup, type MapRef } from 'react-map-gl/mapbox'
import { type BoatCoordinates } from '../features/boats/boatsApi'
import { searchLocationSuggestions, type LocationSuggestion } from '../features/location/mapboxGeocode'
import { defaultCoordinates } from '../data/constants'
import { type BoatCard, type CruiseLengthFilter, type CruiseTypeFilter, type BoatSizeSort } from '../types'
import MarketplaceControls, { type SuggestionOption } from './MarketplaceControls'
import { Header } from './Header'

interface LngLatBounds {
  west: number
  south: number
  east: number
  north: number
}

interface MarketplaceMapViewProps {
  boats: BoatCard[]
  boatsLoading: boolean
  boatsError: string
  searchText: string
  setSearchText: (value: string) => void
  seatFilter: string
  setSeatFilter: (value: string) => void
  cruiseLength: CruiseLengthFilter
  setCruiseLength: (v: CruiseLengthFilter) => void
  cruiseType: CruiseTypeFilter
  setCruiseType: (v: CruiseTypeFilter) => void
  harborFilter: string
  setHarborFilter: (value: string) => void
  boatSizeSort: BoatSizeSort
  setBoatSizeSort: (v: BoatSizeSort) => void
  onBackToList: () => void
  highlightBoatId?: string
  onHighlightHandled?: () => void
}

const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined

const hasCoordinates = (coordinates: BoatCoordinates | null): coordinates is BoatCoordinates => {
  if (!coordinates) {
    return false
  }
  return Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)
}

const hasMapCoordinates = (boat: BoatCard): boat is BoatCard & { coordinates: BoatCoordinates } => {
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

export default function MarketplaceMapView({
  boats,
  boatsLoading,
  boatsError,
  searchText,
  setSearchText,
  seatFilter,
  setSeatFilter,
  cruiseLength,
  setCruiseLength,
  cruiseType,
  setCruiseType,
  harborFilter,
  setHarborFilter,
  boatSizeSort,
  setBoatSizeSort,
  onBackToList,
  highlightBoatId = '',
  onHighlightHandled,
}: MarketplaceMapViewProps) {
  const navigate = useNavigate()
  const mapRef = useRef<MapRef | null>(null)
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [bounds, setBounds] = useState<LngLatBounds | null>(null)
  const [selectedBoatIdManual, setSelectedBoatIdManual] = useState('')
  const selectedBoatId = selectedBoatIdManual || highlightBoatId

  const visibleBoats = useMemo(() => {
    return boats.filter((boat) => {
      if (!hasCoordinates(boat.coordinates)) {
        return true
      }
      return inBounds(boat.coordinates, bounds)
    })
  }, [boats, bounds])

  const selectedBoat = useMemo(() => {
    return visibleBoats.find((item) => item.id === selectedBoatId) ?? null
  }, [visibleBoats, selectedBoatId])

  const centeredBoats = useMemo(() => {
    return boats.filter(hasMapCoordinates)
  }, [boats])

  const controlSuggestions = useMemo<SuggestionOption[]>(() => {
    return suggestions.map((item) => ({ id: item.id, label: item.placeName }))
  }, [suggestions])

  const initialViewState = useMemo(() => {
    if (centeredBoats.length === 0) {
      return { longitude: defaultCoordinates.lng, latitude: defaultCoordinates.lat, zoom: 10.2 }
    }
    const lat = centeredBoats.reduce((sum, item) => sum + item.coordinates.lat, 0) / centeredBoats.length
    const lng = centeredBoats.reduce((sum, item) => sum + item.coordinates.lng, 0) / centeredBoats.length
    return { longitude: lng, latitude: lat, zoom: 10.2 }
  }, [centeredBoats])

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
  }, [searchText])

  useEffect(() => {
    if (!highlightBoatId) {
      return
    }
    const target = boats.find((item) => item.id === highlightBoatId)
    if (!target) {
      return
    }
    setSelectedBoatIdManual(target.id)
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
      onHighlightHandled?.()
    }, 900)
    return () => window.clearTimeout(timer)
  }, [highlightBoatId, boats, onHighlightHandled])

  const handleCardSelect = (boat: BoatCard) => {
    setSelectedBoatIdManual(boat.id)
    if (hasCoordinates(boat.coordinates)) {
      mapRef.current?.flyTo({
        center: [boat.coordinates.lng, boat.coordinates.lat],
        zoom: 10.5,
        duration: 600,
      })
    }
  }

  const resetFilters = () => {
    setCruiseLength('all')
    setCruiseType('all')
    setHarborFilter('')
    setBoatSizeSort('none')
    setSearchText('')
    setSeatFilter('')
  }

  return (
    <div className="homePage">
      <Header brandText="Land Ho">
        <button className="ghostBtn" onClick={onBackToList}>
          List view
        </button>
      </Header>

      <MarketplaceControls
        searchText={searchText}
        setSearchText={setSearchText}
        seatFilter={seatFilter}
        setSeatFilter={setSeatFilter}
        cruiseLength={cruiseLength}
        setCruiseLength={setCruiseLength}
        cruiseType={cruiseType}
        setCruiseType={setCruiseType}
        harborFilter={harborFilter}
        setHarborFilter={setHarborFilter}
        boatSizeSort={boatSizeSort}
        setBoatSizeSort={setBoatSizeSort}
        suggestions={controlSuggestions}
        suggestionsLoading={suggestionsLoading}
        searchSectionClassName="mapSearchSection"
        onSelectSuggestion={(item) => {
          const selectedSuggestion = suggestions.find((entry) => entry.id === item.id)
          if (!selectedSuggestion) {
            return
          }
          const delta = 0.08
          setBounds({
            west: selectedSuggestion.coordinates.lng - delta,
            south: selectedSuggestion.coordinates.lat - delta,
            east: selectedSuggestion.coordinates.lng + delta,
            north: selectedSuggestion.coordinates.lat + delta,
          })
          mapRef.current?.flyTo({
            center: [selectedSuggestion.coordinates.lng, selectedSuggestion.coordinates.lat],
            zoom: 10.5,
            duration: 600,
          })
        }}
      />

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

