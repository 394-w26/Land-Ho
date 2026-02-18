import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'

export type BoatCategory = 'dayTrip' | 'sunset' | 'training' | 'island'

export interface BoatRecord {
  id: string
  title: string
  location: string
  price: number
  rating: number
  seats: number
  captain: string
  date: string
  category: BoatCategory
  image: string
  images: string[]
  ownerUid: string
  ownerName: string
}

export interface CreateBoatInput {
  title: string
  location: string
  price: number
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
  const images = Array.isArray(data.images)
    ? data.images.map((item) => String(item))
    : data.image
      ? [String(data.image)]
      : []
  const coverImage = String(data.image ?? images[0] ?? '')
  return {
    id: doc.id,
    title: String(data.title ?? ''),
    location: String(data.location ?? ''),
    price: Number(data.price ?? 0),
    rating: Number(data.rating ?? 5),
    seats: Number(data.seats ?? 1),
    captain: String(data.captain ?? ''),
    date: String(data.date ?? ''),
    category: String(data.category ?? 'dayTrip') as BoatCategory,
    image: coverImage,
    images,
    ownerUid: String(data.ownerUid ?? ''),
    ownerName: String(data.ownerName ?? ''),
  }
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
