import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export interface UserExperience {
  id: string
  title: string
  organization: string
  start: string
  end: string
  description: string
}

export interface UserCertificate {
  id: string
  name: string
  issuer: string
  year: string
}

export interface UserPublicProfile {
  uid: string
  displayName: string
  avatarUrl: string
  city: string
  bio: string
  skills: string[]
  experiences: UserExperience[]
  certificates: UserCertificate[]
}

export interface UpsertUserPublicProfileInput {
  uid: string
  displayName: string
  avatarUrl: string
  city: string
  bio: string
  skills: string[]
  experiences: UserExperience[]
  certificates: UserCertificate[]
}

const userDocPath = (uid: string) => doc(db!, 'users', uid)

export const upsertUserPublicProfile = async (
  input: UpsertUserPublicProfileInput,
): Promise<void> => {
  if (!db) {
    throw new Error('db-not-configured')
  }
  await setDoc(
    userDocPath(input.uid),
    {
      ...input,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export const getUserPublicProfile = async (uid: string): Promise<UserPublicProfile | null> => {
  if (!db) {
    throw new Error('db-not-configured')
  }
  const snapshot = await getDoc(userDocPath(uid))
  if (!snapshot.exists()) {
    return null
  }
  const data = snapshot.data() as Record<string, unknown>
  const experiences = Array.isArray(data.experiences)
    ? data.experiences.map((item, index) => {
        const entry = item as Record<string, unknown>
        return {
          id: String(entry.id ?? `exp-${index}`),
          title: String(entry.title ?? ''),
          organization: String(entry.organization ?? ''),
          start: String(entry.start ?? ''),
          end: String(entry.end ?? ''),
          description: String(entry.description ?? ''),
        }
      })
    : []
  const certificates = Array.isArray(data.certificates)
    ? data.certificates.map((item, index) => {
        const entry = item as Record<string, unknown>
        return {
          id: String(entry.id ?? `cert-${index}`),
          name: String(entry.name ?? ''),
          issuer: String(entry.issuer ?? ''),
          year: String(entry.year ?? ''),
        }
      })
    : []
  return {
    uid,
    displayName: String(data.displayName ?? ''),
    avatarUrl: String(data.avatarUrl ?? ''),
    city: String(data.city ?? ''),
    bio: String(data.bio ?? ''),
    skills: Array.isArray(data.skills) ? data.skills.map((item) => String(item)) : [],
    experiences,
    certificates,
  }
}
