import {
  type BoatCategory as CloudBoatCategory,
  type BoatCoordinates,
  type CruiseLength,
  type CruiseType,
} from '../features/boats/boatsApi'

export type { BoatCoordinates, CruiseLength, CruiseType }

export type BoatCategory = 'all' | CloudBoatCategory

export interface BoatCard {
  id: string
  title: string
  location: string
  coordinates: BoatCoordinates | null
  rating: number
  seats: number
  /** Filled by approved bookings; remaining = seats - (seatsTaken ?? 0) */
  seatsTaken?: number
  captain: string
  date: string
  category: Exclude<BoatCategory, 'all'>
  image: string
  images: string[]
  ownerUid: string
  ownerName: string
  durationCategory?: CruiseLength
  cruiseType?: CruiseType
}

/** Filter: length of cruise */
export type CruiseLengthFilter = 'all' | CruiseLength

/** Filter: type of cruise */
export type CruiseTypeFilter = 'all' | CruiseType

/** Sort: boat size (by seats) */
export type BoatSizeSort = 'none' | 'smallToLarge' | 'largeToSmall'

export type AppView = 'market' | 'map' | 'profile'

export type ProfileSection = 'basic' | 'skills'

export interface ExperienceItem {
  id: string
  title: string
  organization: string
  start: string
  end: string
  description: string
}

export interface CertificateItem {
  id: string
  name: string
  issuer: string
  year: string
}

export interface ProfileDraft {
  displayName: string
  city: string
  bio: string
  avatarUrl: string
  skills: string[]
  experiences: ExperienceItem[]
  certificates: CertificateItem[]
}

export interface BoatFormData {
  title: string
  location: string
  seats: string
  captain: string
  date: string
  category: Exclude<BoatCategory, 'all'>
  images: string[]
}
