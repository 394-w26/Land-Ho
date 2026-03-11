import { FirebaseError } from 'firebase/app'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'

export type BookingRequestStatus = 'pending' | 'approved' | 'rejected'

export interface BookingRequestRecord {
  id: string
  boatId: string
  boatTitle: string
  boatCoverImage: string
  hostUid: string
  applicantUid: string
  applicantName: string
  applicantAvatar: string
  status: BookingRequestStatus
  createdAt: string
}

export interface CreateBookingRequestInput {
  boatId: string
  boatTitle: string
  boatCoverImage: string
  hostUid: string
  applicantUid: string
  applicantName: string
  applicantAvatar: string
}

const mapBookingDoc = (snapshot: QueryDocumentSnapshot): BookingRequestRecord => {
  const data = snapshot.data() as Record<string, unknown>
  return {
    id: snapshot.id,
    boatId: String(data.boatId ?? ''),
    boatTitle: String(data.boatTitle ?? ''),
    boatCoverImage: String(data.boatCoverImage ?? ''),
    hostUid: String(data.hostUid ?? ''),
    applicantUid: String(data.applicantUid ?? ''),
    applicantName: String(data.applicantName ?? ''),
    applicantAvatar: String(data.applicantAvatar ?? ''),
    status: String(data.status ?? 'pending') as BookingRequestStatus,
    createdAt:
      typeof data.createdAt === 'object' && data.createdAt && 'seconds' in data.createdAt
        ? new Date(Number((data.createdAt as { seconds: number }).seconds) * 1000).toISOString()
        : '',
  }
}

const toReadableBookingError = (error: unknown): string => {
  if (!(error instanceof FirebaseError)) {
    return 'Booking service is temporarily unavailable.'
  }
  if (error.code === 'permission-denied') {
    return 'Permission denied. Please deploy latest Firestore rules and sign in again.'
  }
  if (error.code === 'failed-precondition') {
    return 'Firestore index is missing for booking requests query.'
  }
  if (error.code === 'unauthenticated') {
    return 'Please sign in first.'
  }
  return error.message || 'Booking service is temporarily unavailable.'
}

export const hasPendingBookingRequest = async (
  boatId: string,
  applicantUid: string,
): Promise<boolean> => {
  if (!db) {
    throw new Error('db-not-configured')
  }
  const requestsRef = collection(db, 'bookingRequests')
  const pendingQuery = query(
    requestsRef,
    where('boatId', '==', boatId),
    where('applicantUid', '==', applicantUid),
    where('status', '==', 'pending'),
    limit(1),
  )
  try {
    const snapshot = await getDocs(pendingQuery)
    return !snapshot.empty
  } catch (error) {
    throw new Error(toReadableBookingError(error))
  }
}

export const createBookingRequest = async (input: CreateBookingRequestInput): Promise<string> => {
  if (!db) {
    throw new Error('db-not-configured')
  }
  const requestsRef = collection(db, 'bookingRequests')
  try {
    const created = await addDoc(requestsRef, {
      ...input,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return created.id
  } catch (error) {
    throw new Error(toReadableBookingError(error))
  }
}

export const subscribeHostRequestsByBoat = (
  boatId: string,
  hostUid: string,
  onData: (requests: BookingRequestRecord[]) => void,
  onError: (message: string) => void,
): Unsubscribe => {
  if (!db) {
    onData([])
    return () => undefined
  }
  const requestsRef = collection(db, 'bookingRequests')
  const requestsQuery = query(
    requestsRef,
    where('boatId', '==', boatId),
    where('hostUid', '==', hostUid),
  )
  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      const requests = snapshot.docs
        .map(mapBookingDoc)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      onData(requests)
    },
    (error) => onError(toReadableBookingError(error)),
  )
}

export const getBookingRequest = async (
  requestId: string,
): Promise<BookingRequestRecord | null> => {
  if (!db) throw new Error('db-not-configured')
  const snap = await getDoc(doc(db, 'bookingRequests', requestId))
  if (!snap.exists()) return null
  return mapBookingDoc(snap as QueryDocumentSnapshot)
}

/** Subscribe to all booking requests for a host (all their boats). */
export const subscribeHostRequests = (
  hostUid: string,
  onData: (requests: BookingRequestRecord[]) => void,
  onError: (message: string) => void,
): Unsubscribe => {
  if (!db) {
    onData([])
    return () => undefined
  }
  const requestsRef = collection(db, 'bookingRequests')
  const q = query(requestsRef, where('hostUid', '==', hostUid))
  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs
        .map(mapBookingDoc)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      onData(requests)
    },
    (err) => onError(toReadableBookingError(err)),
  )
}

/** Subscribe to approved booking requests for a sailor (applicant). */
export const subscribeApplicantApprovedRequests = (
  applicantUid: string,
  onData: (requests: BookingRequestRecord[]) => void,
  onError: (message: string) => void,
): Unsubscribe => {
  if (!db) {
    onData([])
    return () => undefined
  }
  const requestsRef = collection(db, 'bookingRequests')
  const q = query(
    requestsRef,
    where('applicantUid', '==', applicantUid),
    where('status', '==', 'approved'),
  )
  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs
        .map(mapBookingDoc)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      onData(requests)
    },
    (err) => onError(toReadableBookingError(err)),
  )
}

export const updateBookingRequestStatus = async (
  requestId: string,
  status: Exclude<BookingRequestStatus, 'pending'>,
): Promise<void> => {
  if (!db) {
    throw new Error('db-not-configured')
  }
  try {
    await updateDoc(doc(db, 'bookingRequests', requestId), {
      status,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    throw new Error(toReadableBookingError(error))
  }
}
