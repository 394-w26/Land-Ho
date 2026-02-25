import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { CaptainOnboardingProfile, SailorOnboardingProfile } from './onboardingTypes'

/* ── Firestore doc paths ───────────────────── */

const captainDocPath = (uid: string) => doc(db!, 'captainProfiles', uid)
const sailorDocPath = (uid: string) => doc(db!, 'sailorProfiles', uid)

/* ── Captain ───────────────────────────────── */

export const getCaptainProfile = async (uid: string): Promise<CaptainOnboardingProfile | null> => {
  if (!db) throw new Error('db-not-configured')
  const snap = await getDoc(captainDocPath(uid))
  if (!snap.exists()) return null
  const d = snap.data() as Record<string, unknown>
  return {
    uid,
    firstName: String(d.firstName ?? ''),
    lastName: String(d.lastName ?? ''),
    licenseType: String(d.licenseType ?? 'oupv_six_pack') as CaptainOnboardingProfile['licenseType'],
    licenseNumber: String(d.licenseNumber ?? ''),
    licenseImageUrl: String(d.licenseImageUrl ?? ''),
    boatRegistrationNumber: String(d.boatRegistrationNumber ?? ''),
    boatType: String(d.boatType ?? 'sailboat') as CaptainOnboardingProfile['boatType'],
    boatName: String(d.boatName ?? ''),
    backgroundCheckConsent: Boolean(d.backgroundCheckConsent),
    backgroundCheckStatus: String(d.backgroundCheckStatus ?? 'not_started') as CaptainOnboardingProfile['backgroundCheckStatus'],
    liabilityWaiverAccepted: Boolean(d.liabilityWaiverAccepted),
    liabilityWaiverAcceptedAt: String(d.liabilityWaiverAcceptedAt ?? ''),
    completedAt: String(d.completedAt ?? ''),
    updatedAt: String(d.updatedAt ?? ''),
  }
}

export const upsertCaptainProfile = async (
  input: Omit<CaptainOnboardingProfile, 'updatedAt'>,
): Promise<void> => {
  if (!db) throw new Error('db-not-configured')
  await setDoc(
    captainDocPath(input.uid),
    { ...input, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

/* ── Sailor ────────────────────────────────── */

export const getSailorProfile = async (uid: string): Promise<SailorOnboardingProfile | null> => {
  if (!db) throw new Error('db-not-configured')
  const snap = await getDoc(sailorDocPath(uid))
  if (!snap.exists()) return null
  const d = snap.data() as Record<string, unknown>
  return {
    uid,
    firstName: String(d.firstName ?? ''),
    lastName: String(d.lastName ?? ''),
    backgroundCheckConsent: Boolean(d.backgroundCheckConsent),
    backgroundCheckStatus: String(d.backgroundCheckStatus ?? 'not_started') as SailorOnboardingProfile['backgroundCheckStatus'],
    liabilityWaiverAccepted: Boolean(d.liabilityWaiverAccepted),
    liabilityWaiverAcceptedAt: String(d.liabilityWaiverAcceptedAt ?? ''),
    baselineTestPassed: Boolean(d.baselineTestPassed),
    baselineTestScore: Number(d.baselineTestScore ?? 0),
    baselineTestAttempts: Number(d.baselineTestAttempts ?? 0),
    boatEdCertificateUrl: String(d.boatEdCertificateUrl ?? ''),
    completedAt: String(d.completedAt ?? ''),
    updatedAt: String(d.updatedAt ?? ''),
  }
}

export const upsertSailorProfile = async (
  input: Omit<SailorOnboardingProfile, 'updatedAt'>,
): Promise<void> => {
  if (!db) throw new Error('db-not-configured')
  await setDoc(
    sailorDocPath(input.uid),
    { ...input, updatedAt: serverTimestamp() },
    { merge: true },
  )
}
