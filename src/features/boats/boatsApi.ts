import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'

export type BoatCategory = 'dayTrip' | 'sunset' | 'training' | 'cruise'

/** Length of cruise for filtering */
export type CruiseLength = '<3' | '3-5' | '6-8'

/** Type of cruise for filtering */
export type CruiseType = 'sporting' | 'leisure'

export interface BoatCoordinates {
  lat: number
  lng: number
}

export interface BoatRecord {
  id: string
  title: string
  location: string
  coordinates: BoatCoordinates | null
  rating: number
  seats: number
  captain: string
  date: string
  category: BoatCategory
  image: string
  images: string[]
  ownerUid: string
  ownerName: string
  /** Number of seats filled by approved bookings (managed by booking flow). */
  seatsTaken?: number
  durationCategory?: CruiseLength
  cruiseType?: CruiseType
}

export interface CreateBoatInput {
  title: string
  location: string
  coordinates: BoatCoordinates
  seats: number
  captain: string
  date: string
  category: BoatCategory
  image: string
  images: string[]
  ownerUid: string
  ownerName: string
}

const mapBoatDoc = (doc: QueryDocumentSnapshot): BoatRecord => {
  const data = doc.data() as Record<string, unknown>
  const rawCoordinates = data.coordinates as Record<string, unknown> | undefined
  const lat = Number(rawCoordinates?.lat)
  const lng = Number(rawCoordinates?.lng)
  const coordinates =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? {
          lat,
          lng,
        }
      : null
  const images = Array.isArray(data.images)
    ? data.images.map((item) => String(item))
    : data.image
      ? [String(data.image)]
      : []
  const coverImage = String(data.image ?? images[0] ?? '')
  const durationCategory = data.durationCategory as BoatRecord['durationCategory']
  const cruiseType = data.cruiseType as BoatRecord['cruiseType']
  const seatsTaken = Number(data.seatsTaken ?? 0)
  return {
    id: doc.id,
    title: String(data.title ?? ''),
    location: String(data.location ?? ''),
    coordinates,
    rating: Number(data.rating ?? 5),
    seats: Number(data.seats ?? 1),
    captain: String(data.captain ?? ''),
    date: String(data.date ?? ''),
    category: String(data.category ?? 'dayTrip') as BoatCategory,
    image: coverImage,
    images,
    ownerUid: String(data.ownerUid ?? ''),
    ownerName: String(data.ownerName ?? ''),
    ...(Number.isFinite(seatsTaken) && seatsTaken > 0 ? { seatsTaken } : {}),
    ...(durationCategory && { durationCategory }),
    ...(cruiseType && { cruiseType }),
  }
}

/** Increment or decrement seatsTaken for a boat (e.g. when approving/rejecting a booking). */
export const incrementBoatSeatsTaken = async (
  boatId: string,
  delta: 1 | -1,
): Promise<void> => {
  if (!db) throw new Error('db-not-configured')
  await updateDoc(doc(db, 'boats', boatId), {
    seatsTaken: increment(delta),
    updatedAt: serverTimestamp(),
  })
}

export const subscribePublishedBoats = (
  onData: (boats: BoatRecord[]) => void,
  onError: (message: string) => void,
): Unsubscribe => {
  if (!db) {
    onData([])
    return () => undefined
  }
  const boatsRef = collection(db, 'boats')
  const boatsQuery = query(boatsRef, orderBy('createdAt', 'desc'))
  return onSnapshot(
    boatsQuery,
    (snapshot) => {
      onData(snapshot.docs.map(mapBoatDoc))
    },
    () => {
      onError('Failed to load boats from cloud.')
    },
  )
}

export const createBoatListing = async (input: CreateBoatInput): Promise<string> => {
  if (!db) {
    throw new Error('db-not-configured')
  }
  const boatsRef = collection(db, 'boats')
  const next = await addDoc(boatsRef, {
    ...input,
    status: 'published',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return next.id
}

export const deleteBoatListing = async (boatId: string): Promise<void> => {
  if (!db) {
    throw new Error('db-not-configured')
  }
  await deleteDoc(doc(db, 'boats', boatId))
}

export const updateBoatListing = async (
  boatId: string,
  input: Omit<CreateBoatInput, 'ownerUid' | 'ownerName'>,
): Promise<void> => {
  if (!db) {
    throw new Error('db-not-configured')
  }
  await updateDoc(doc(db, 'boats', boatId), {
    ...input,
    updatedAt: serverTimestamp(),
  })
}

export const getBoatListingById = async (boatId: string): Promise<BoatRecord | null> => {
  if (!db) {
    throw new Error('db-not-configured')
  }
  const snapshot = await getDoc(doc(db, 'boats', boatId))
  if (!snapshot.exists()) {
    return null
  }
  return mapBoatDoc(snapshot as QueryDocumentSnapshot)
}
