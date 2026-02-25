import type { BoatCoordinates } from '../boats/boatsApi'

export interface LocationSuggestion {
  id: string
  placeName: string
  coordinates: BoatCoordinates
}

interface MapboxFeature {
  id?: string
  place_name?: string
  center?: [number, number]
}

interface MapboxGeocodeResponse {
  features?: MapboxFeature[]
}

const buildForwardUrl = (queryText: string, token: string): string => {
  const encoded = encodeURIComponent(queryText)
  return `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&autocomplete=true&limit=5`
}

const buildReverseUrl = (coordinates: BoatCoordinates, token: string): string => {
  return `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?access_token=${token}&limit=1`
}

const mapFeatureToSuggestion = (feature: MapboxFeature): LocationSuggestion | null => {
  if (!feature.center || feature.center.length < 2) {
    return null
  }
  const lng = Number(feature.center[0])
  const lat = Number(feature.center[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }
  return {
    id: feature.id ?? `${lat}-${lng}`,
    placeName: String(feature.place_name ?? 'Selected location'),
    coordinates: { lat, lng },
  }
}

export const searchLocationSuggestions = async (
  queryText: string,
  token: string,
): Promise<LocationSuggestion[]> => {
  const trimmed = queryText.trim()
  if (trimmed.length < 2) {
    return []
  }
  const response = await fetch(buildForwardUrl(trimmed, token))
  if (!response.ok) {
    throw new Error('search-failed')
  }
  const payload = (await response.json()) as MapboxGeocodeResponse
  return (payload.features ?? [])
    .map(mapFeatureToSuggestion)
    .filter((item): item is LocationSuggestion => item !== null)
}

export const reverseLookupLocation = async (
  coordinates: BoatCoordinates,
  token: string,
): Promise<string> => {
  const response = await fetch(buildReverseUrl(coordinates, token))
  if (!response.ok) {
    throw new Error('reverse-lookup-failed')
  }
  const payload = (await response.json()) as MapboxGeocodeResponse
  const first = payload.features?.[0]
  return String(first?.place_name ?? '')
}
