import { type BoatCoordinates } from '../features/boats/boatsApi'
import { type BoatCategory, type ProfileDraft } from '../types'

export const profileStorageKey = 'land-ho-profile-draft'
export const maxBoatImages = 6
export const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined

export const defaultProfileDraft: ProfileDraft = {
  displayName: '',
  city: '',
  bio: '',
  avatarUrl: '',
  skills: [],
  experiences: [],
  certificates: [],
}

export const loadStoredProfileDraft = (): ProfileDraft => {
  try {
    const raw = window.localStorage.getItem(profileStorageKey)
    if (!raw) {
      return defaultProfileDraft
    }
    const parsed = JSON.parse(raw) as Partial<ProfileDraft>
    return {
      displayName: parsed.displayName ?? '',
      city: parsed.city ?? '',
      bio: parsed.bio ?? '',
      avatarUrl: parsed.avatarUrl ?? '',
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experiences: Array.isArray(parsed.experiences) ? parsed.experiences : [],
      certificates: Array.isArray(parsed.certificates) ? parsed.certificates : [],
    }
  } catch {
    return defaultProfileDraft
  }
}

export const locationCoordinatesLookup: Record<string, BoatCoordinates> = {
  'Montrose Harbor': { lat: 41.9639, lng: -87.6383 },
  'Belmont Harbor': { lat: 41.9418, lng: -87.6365 },
  'Diversey Harbor': { lat: 41.9328, lng: -87.6416 },
  'The Playpen Chicago': { lat: 41.929, lng: -87.62 },
  'Navy Pier Marina': { lat: 41.8917, lng: -87.6 },
  'Chicago Harbor': { lat: 41.887, lng: -87.609 },
  'DuSable Harbor': { lat: 41.884, lng: -87.612 },
  'Monroe Harbor': { lat: 41.878, lng: -87.613 },
  'Burnham Harbor': { lat: 41.858, lng: -87.61 },
  '31st Street Harbor': { lat: 41.8383, lng: -87.6075 },
  '59th Street Harbor': { lat: 41.787, lng: -87.579 },
  'Jackson Park Inner Harbor': { lat: 41.773, lng: -87.576 },
  'Jackson Park Outer Harbor': { lat: 41.77, lng: -87.571 },
  'Canal Street Marina': { lat: 41.855, lng: -87.634 },
}

export const chicagoLocations: string[] = Object.keys(locationCoordinatesLookup)

/** Length of cruise filter options */
export const cruiseLengthOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '<3', label: '<3 hours' },
  { value: '3-5', label: '3-5 hours' },
  { value: '6-8', label: '6-8 hours' },
]

/** Type of cruise filter options */
export const cruiseTypeOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sporting', label: 'Sporting' },
  { value: 'leisure', label: 'Leisure' },
]

/** Boat size sort options (by seats) */
export const boatSizeSortOptions: { value: string; label: string }[] = [
  { value: 'none', label: 'No sort' },
  { value: 'smallToLarge', label: 'Small to large' },
  { value: 'largeToSmall', label: 'Large to small' },
]

/** Harbors/Marinas filter: All + Chicago locations */
export const harborFilterOptions: { value: string; label: string }[] = [
  { value: '', label: 'All harbors' },
  ...chicagoLocations.map((loc) => ({ value: loc, label: loc })),
]

export const defaultCoordinates: BoatCoordinates = { lat: 41.8781, lng: -87.6298 }

export const findCoordinatesForLocation = (locationText: string): BoatCoordinates => {
  const trimmed = locationText.trim()
  if (trimmed.length === 0) {
    return defaultCoordinates
  }
  return locationCoordinatesLookup[trimmed] ?? defaultCoordinates
}

export const categories: { key: BoatCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '⛵' },
  { key: 'dayTrip', label: 'Day Trips', icon: '🌊' },
  { key: 'sunset', label: 'Sunset Cruises', icon: '🌇' },
  { key: 'training', label: 'Training', icon: '🧭' },
  { key: 'cruise', label: 'Cruises', icon: '🚢' },
]
