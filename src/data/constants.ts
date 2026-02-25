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
  'Sanya Bay': { lat: 18.2528, lng: 109.5119 },
  'Xiamen Wuyuan Bay': { lat: 24.5096, lng: 118.1881 },
  'Qingdao Olympic Sailing Center': { lat: 36.0604, lng: 120.3755 },
  'Zhoushan Islands': { lat: 29.9853, lng: 122.2072 },
  'Shenzhen Dapeng': { lat: 22.5954, lng: 114.5422 },
  'Beihai Silver Beach': { lat: 21.4171, lng: 109.1512 },
}

export const defaultCoordinates: BoatCoordinates = { lat: 24.4798, lng: 118.0894 }

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
  { key: 'island', label: 'Island Hops', icon: '🏝️' },
]
