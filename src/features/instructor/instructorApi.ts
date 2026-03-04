import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type {
  InstructorRequest,
  InstructorRequestStatus,
  InstructorFocusArea,
} from '../onboarding/onboardingTypes'

/* ── Helpers ───────────────────────────────── */

const COLLECTION = 'instructorRequests'

const toTimestamp = (val: unknown): string => {
  if (typeof val === 'object' && val && 'seconds' in val) {
    return new Date(Number((val as { seconds: number }).seconds) * 1000).toISOString()
  }
  return typeof val === 'string' ? val : ''
}

const mapDoc = (snap: QueryDocumentSnapshot): InstructorRequest => {
  const d = snap.data() as Record<string, unknown>
  return {
    id: snap.id,
    sailorUid: String(d.sailorUid ?? ''),
    sailorName: String(d.sailorName ?? ''),
    boatId: String(d.boatId ?? ''),
    boatTitle: String(d.boatTitle ?? ''),
    tripDate: String(d.tripDate ?? ''),
    focusAreas: Array.isArray(d.focusAreas)
      ? (d.focusAreas as string[]).filter(Boolean) as InstructorFocusArea[]
      : [],
    experienceLevel: (['beginner', 'intermediate', 'advanced'].includes(String(d.experienceLevel))
      ? String(d.experienceLevel)
      : 'beginner') as InstructorRequest['experienceLevel'],
    notes: String(d.notes ?? ''),
    status: (['pending', 'matched', 'confirmed', 'completed', 'cancelled'].includes(String(d.status))
      ? String(d.status)
      : 'pending') as InstructorRequestStatus,
    matchedInstructorUid: String(d.matchedInstructorUid ?? ''),
    matchedInstructorName: String(d.matchedInstructorName ?? ''),
    createdAt: toTimestamp(d.createdAt),
    updatedAt: toTimestamp(d.updatedAt),
  }
}

/* ── Create ─────────────────────────────────── */

export interface CreateInstructorRequestInput {
  sailorUid: string
  sailorName: string
  boatId: string
  boatTitle: string
  tripDate: string
  focusAreas: InstructorFocusArea[]
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  notes: string
}

export const createInstructorRequest = async (
  input: CreateInstructorRequestInput,
): Promise<string> => {
  if (!db) throw new Error('db-not-configured')
  const ref = collection(db, COLLECTION)
  const created = await addDoc(ref, {
    ...input,
    status: 'pending',
    matchedInstructorUid: '',
    matchedInstructorName: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return created.id
}

/* ── Read: by sailor ────────────────────────── */

export const getInstructorRequestsBySailor = async (
  sailorUid: string,
): Promise<InstructorRequest[]> => {
  if (!db) throw new Error('db-not-configured')
  const ref = collection(db, COLLECTION)
  const q = query(ref, where('sailorUid', '==', sailorUid))
  try {
    const snap = await getDocs(q)
    return snap.docs
      .map(mapDoc)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? 'unknown'
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Firestore error (${code}): ${msg}`)
  }
}

/* ── Read: by boat (for captains) ───────────── */

export const subscribeInstructorRequestsByBoat = (
  boatId: string,
  onData: (requests: InstructorRequest[]) => void,
  onError: (msg: string) => void,
): Unsubscribe => {
  if (!db) { onData([]); return () => undefined }
  const ref = collection(db, COLLECTION)
  // orderBy omitted — no composite index needed; sort client-side
  const q = query(ref, where('boatId', '==', boatId))
  return onSnapshot(
    q,
    (snap) => {
      const sorted = snap.docs
        .map(mapDoc)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      onData(sorted)
    },
    () => onError('Failed to load instructor requests.'),
  )
}

/* ── Update status ──────────────────────────── */

export const updateInstructorRequestStatus = async (
  requestId: string,
  status: InstructorRequestStatus,
  extra?: { matchedInstructorUid?: string; matchedInstructorName?: string },
): Promise<void> => {
  if (!db) throw new Error('db-not-configured')
  await updateDoc(doc(db, COLLECTION, requestId), {
    status,
    ...(extra ?? {}),
    updatedAt: serverTimestamp(),
  })
}

/* ── Cancel (sailor-side) ───────────────────── */

export const cancelInstructorRequest = async (requestId: string): Promise<void> => {
  return updateInstructorRequestStatus(requestId, 'cancelled')
}
