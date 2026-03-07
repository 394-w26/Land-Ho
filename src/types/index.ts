import {
  type BoatCategory as CloudBoatCategory,
  type BoatCoordinates,
} from '../features/boats/boatsApi'

export type { BoatCoordinates }

export type BoatCategory = 'all' | CloudBoatCategory

export interface BoatCard {
  id: string
  title: string
  location: string
  coordinates: BoatCoordinates | null
  price: number
  rating: number
  seats: number
  captain: string
  date: string
  category: Exclude<BoatCategory, 'all'>
  image: string
  images: string[]
  ownerUid: string
  ownerName: string
}

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
  price: string
  seats: string
  captain: string
  date: string
  category: Exclude<BoatCategory, 'all'>
  images: string[]
}
