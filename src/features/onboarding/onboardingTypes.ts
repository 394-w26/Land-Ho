/* ──────────────────────────────────────────────
   Shared onboarding types for Captain & Sailor
   ────────────────────────────────────────────── */

/** Status of a single verification step */
export type VerificationStatus = 'not_started' | 'pending' | 'approved' | 'rejected'

/* ── Captain ───────────────────────────────── */

export type BoatType =
  | 'sailboat'
  | 'motorboat'
  | 'catamaran'
  | 'yacht'
  | 'pontoon'
  | 'fishing'
  | 'jetski'
  | 'other'

export type CaptainLicenseType = 'oupv_six_pack' | 'master_50_ton' | 'master_100_ton' | 'other'

export interface CaptainOnboardingProfile {
  uid: string

  /* identity */
  firstName: string
  lastName: string

  /* credential */
  licenseType: CaptainLicenseType
  licenseNumber: string
  licenseImageUrl: string          // uploaded photo / scan of credential

  /* boat */
  boatRegistrationNumber: string
  boatType: BoatType
  boatName: string

  /* compliance */
  backgroundCheckConsent: boolean  // user clicked "I agree"
  backgroundCheckStatus: VerificationStatus
  liabilityWaiverAccepted: boolean
  liabilityWaiverAcceptedAt: string // ISO date

  /* overall */
  completedAt: string              // ISO date when all steps done — empty = not done
  updatedAt: string
}

/* ── Sailor ────────────────────────────────── */

export interface SailorOnboardingProfile {
  uid: string

  /* identity */
  firstName: string
  lastName: string

  /* compliance */
  backgroundCheckConsent: boolean
  backgroundCheckStatus: VerificationStatus
  liabilityWaiverAccepted: boolean
  liabilityWaiverAcceptedAt: string

  /* baseline test */
  baselineTestPassed: boolean
  baselineTestScore: number        // 0-100
  baselineTestAttempts: number

  /* boat-ed certificate */
  boatEdCertificateUrl: string     // uploaded image / PDF

  /* overall */
  completedAt: string
  updatedAt: string
}

/* ── Instructor Request ─────────────────────── */

export type InstructorRequestStatus = 'pending' | 'matched' | 'confirmed' | 'completed' | 'cancelled'

export type InstructorFocusArea =
  | 'sailing_basics'
  | 'navigation'
  | 'docking_anchoring'
  | 'knot_tying'
  | 'safety_procedures'
  | 'weather_reading'
  | 'boat_handling'
  | 'general'

export interface InstructorRequest {
  id: string
  sailorUid: string
  sailorName: string
  boatId: string
  boatTitle: string
  tripDate: string                 // ISO date of the trip
  focusAreas: InstructorFocusArea[]
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  notes: string                    // free-text from the sailor
  status: InstructorRequestStatus
  matchedInstructorUid: string     // captain UID if matched
  matchedInstructorName: string
  createdAt: string
  updatedAt: string
}

/* ── Baseline quiz ─────────────────────────── */

export interface BaselineQuestion {
  id: string
  category: 'boat_anatomy' | 'harbor_anatomy' | 'knots'
  question: string
  choices: string[]
  correctIndex: number
  explanation: string
}
