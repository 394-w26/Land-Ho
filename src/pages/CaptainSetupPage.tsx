import { useEffect, useState, type ChangeEvent } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth, isFirebaseReady } from '../lib/firebase'
import { uploadImageToStorage } from '../lib/storage'
import {
  getCaptainProfile,
  upsertCaptainProfile,
} from '../features/onboarding/onboardingApi'
import type {
  BoatType,
  CaptainLicenseType,
  CaptainOnboardingProfile,
} from '../features/onboarding/onboardingTypes'

type Step = 'identity' | 'credential' | 'boat' | 'compliance' | 'review'
const STEPS: { key: Step; label: string }[] = [
  { key: 'identity', label: '1. Name' },
  { key: 'credential', label: '2. Credential' },
  { key: 'boat', label: '3. Boat Info' },
  { key: 'compliance', label: '4. Compliance' },
  { key: 'review', label: '5. Review' },
]

const LICENSE_OPTIONS: { value: CaptainLicenseType; label: string }[] = [
  { value: 'oupv_six_pack', label: 'OUPV / Six‑Pack' },
  { value: 'master_50_ton', label: 'Master 50 Ton' },
  { value: 'master_100_ton', label: 'Master 100 Ton' },
  { value: 'other', label: 'Other' },
]

const BOAT_TYPE_OPTIONS: { value: BoatType; label: string }[] = [
  { value: 'sailboat', label: 'Sailboat' },
  { value: 'motorboat', label: 'Motorboat' },
  { value: 'catamaran', label: 'Catamaran' },
  { value: 'yacht', label: 'Yacht' },
  { value: 'pontoon', label: 'Pontoon' },
  { value: 'fishing', label: 'Fishing Boat' },
  { value: 'jetski', label: 'Jet Ski' },
  { value: 'other', label: 'Other' },
]

const emptyDraft: Omit<CaptainOnboardingProfile, 'updatedAt'> = {
  uid: '',
  firstName: '',
  lastName: '',
  licenseType: 'oupv_six_pack',
  licenseNumber: '',
  licenseImageUrl: '',
  boatRegistrationNumber: '',
  boatType: 'sailboat',
  boatName: '',
  backgroundCheckConsent: false,
  backgroundCheckStatus: 'not_started',
  liabilityWaiverAccepted: false,
  liabilityWaiverAcceptedAt: '',
  completedAt: '',
}

function CaptainSetupPage() {
  const navigate = useNavigate()
  const [viewer, setViewer] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('identity')
  const [draft, setDraft] = useState(emptyDraft)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  /* auth listener */
  useEffect(() => {
    if (!auth || !isFirebaseReady) {
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setViewer(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  /* load existing captain profile */
  useEffect(() => {
    if (!viewer) return
    let active = true
    const run = async () => {
      try {
        const existing = await getCaptainProfile(viewer.uid)
        if (active && existing) {
          setDraft({ ...existing })
        } else if (active) {
          setDraft((prev) => ({
            ...prev,
            uid: viewer.uid,
            firstName: viewer.displayName?.split(' ')[0] ?? '',
            lastName: viewer.displayName?.split(' ').slice(1).join(' ') ?? '',
          }))
        }
      } catch {
        /* ignore — fresh start */
        if (active) {
          setDraft((prev) => ({ ...prev, uid: viewer.uid }))
        }
      }
    }
    void run()
    return () => { active = false }
  }, [viewer])

  /* helpers */
  const patch = (partial: Partial<typeof draft>) =>
    setDraft((prev) => ({ ...prev, ...partial }))

  const handleLicenseUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !viewer) return
    setUploading(true)
    setNotice('Uploading credential image…')
    try {
      const url = await uploadImageToStorage(`captain-credentials/${viewer.uid}`, file)
      patch({ licenseImageUrl: url })
      setNotice('Credential image uploaded.')
    } catch {
      setNotice('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const identityValid = draft.firstName.trim().length >= 1 && draft.lastName.trim().length >= 1
  const credentialValid =
    draft.licenseType.length > 0 &&
    draft.licenseNumber.trim().length >= 2 &&
    draft.licenseImageUrl.length > 0
  const boatValid =
    draft.boatRegistrationNumber.trim().length >= 2 &&
    draft.boatType.length > 0
  const complianceValid = draft.backgroundCheckConsent && draft.liabilityWaiverAccepted
  const allValid = identityValid && credentialValid && boatValid && complianceValid

  const saveAndContinue = async (nextStep: Step) => {
    if (!viewer) { setNotice('Please sign in first.'); return }
    setSaving(true)
    setNotice('Saving…')
    try {
      await upsertCaptainProfile({ ...draft, uid: viewer.uid })
      setNotice('')
      setStep(nextStep)
    } catch {
      setNotice('Save failed. Check your connection and retry.')
    } finally {
      setSaving(false)
    }
  }

  const submitProfile = async () => {
    if (!viewer) return
    if (!allValid) { setNotice('Please complete all required steps first.'); return }
    setSaving(true)
    setNotice('Finalizing captain profile…')
    try {
      await upsertCaptainProfile({
        ...draft,
        uid: viewer.uid,
        backgroundCheckStatus: 'pending',
        completedAt: new Date().toISOString(),
      })
      setNotice('Captain profile submitted! Your background check is now pending review.')
    } catch {
      setNotice('Submission failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  /* ── Render ─────────────────────────────── */

  if (loading) {
    return <div className="setupPage"><p className="muted">Loading…</p></div>
  }

  if (!viewer) {
    return (
      <div className="setupPage">
        <p className="authNotice">Please sign in to set up your captain profile.</p>
        <button className="ghostBtn" onClick={() => navigate('/')}>Back to home</button>
      </div>
    )
  }

  return (
    <div className="setupPage">
      <header className="topBar">
        <div className="brand">
          <img className="brandLogo" src="/logo.png" alt="Land Ho logo" />
          <span>Captain Setup</span>
        </div>
        <button className="ghostBtn" onClick={() => navigate('/')}>Back to home</button>
      </header>

      {/* step indicator */}
      <nav className="setupSteps">
        {STEPS.map((s) => (
          <button
            key={s.key}
            className={step === s.key ? 'setupStepBtn active' : 'setupStepBtn'}
            onClick={() => setStep(s.key)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <section className="setupCard">
        {/* ─── Step 1: Identity ─── */}
        {step === 'identity' && (
          <>
            <h2>First &amp; Last Name</h2>
            <p className="hintText">Exactly as it appears on your captain credential.</p>
            <div className="formRow">
              <label>First Name *</label>
              <input value={draft.firstName} onChange={(e) => patch({ firstName: e.target.value })} placeholder="John" />
            </div>
            <div className="formRow">
              <label>Last Name *</label>
              <input value={draft.lastName} onChange={(e) => patch({ lastName: e.target.value })} placeholder="Doe" />
            </div>
            <div className="setupActions">
              <button
                className="publishBtn"
                disabled={!identityValid || saving}
                onClick={() => void saveAndContinue('credential')}
              >
                Save &amp; Continue
              </button>
            </div>
          </>
        )}

        {/* ─── Step 2: Credential ─── */}
        {step === 'credential' && (
          <>
            <h2>Captain Credential</h2>
            <p className="hintText">Provide your USCG license or equivalent credential.</p>
            <div className="formRow">
              <label>License Type *</label>
              <select
                value={draft.licenseType}
                onChange={(e) => patch({ licenseType: e.target.value as CaptainLicenseType })}
              >
                {LICENSE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="formRow">
              <label>License / Credential Number *</label>
              <input
                value={draft.licenseNumber}
                onChange={(e) => patch({ licenseNumber: e.target.value })}
                placeholder="e.g. 1234567"
              />
            </div>
            <div className="formRow">
              <label>Upload Credential Photo *</label>
              <input type="file" accept="image/*" onChange={handleLicenseUpload} />
              {uploading && <small className="hintText">Uploading…</small>}
              {draft.licenseImageUrl && (
                <img src={draft.licenseImageUrl} alt="Credential" className="setupPreviewImg" />
              )}
            </div>
            <div className="setupActions">
              <button className="ghostBtn" onClick={() => setStep('identity')}>Back</button>
              <button
                className="publishBtn"
                disabled={!credentialValid || saving}
                onClick={() => void saveAndContinue('boat')}
              >
                Save &amp; Continue
              </button>
            </div>
          </>
        )}

        {/* ─── Step 3: Boat Info ─── */}
        {step === 'boat' && (
          <>
            <h2>Boat Information</h2>
            <div className="formRow">
              <label>Boat Registration Number *</label>
              <input
                value={draft.boatRegistrationNumber}
                onChange={(e) => patch({ boatRegistrationNumber: e.target.value })}
                placeholder="e.g. FL 1234 AB"
              />
            </div>
            <div className="formRow">
              <label>Boat Type *</label>
              <select
                value={draft.boatType}
                onChange={(e) => patch({ boatType: e.target.value as BoatType })}
              >
                {BOAT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="formRow">
              <label>Boat Name (optional)</label>
              <input
                value={draft.boatName}
                onChange={(e) => patch({ boatName: e.target.value })}
                placeholder="e.g. Sea Breeze"
              />
            </div>
            <div className="setupActions">
              <button className="ghostBtn" onClick={() => setStep('credential')}>Back</button>
              <button
                className="publishBtn"
                disabled={!boatValid || saving}
                onClick={() => void saveAndContinue('compliance')}
              >
                Save &amp; Continue
              </button>
            </div>
          </>
        )}

        {/* ─── Step 4: Compliance ─── */}
        {step === 'compliance' && (
          <>
            <h2>Background Check &amp; Liability</h2>
            <div className="complianceBlock">
              <h3>Background Check</h3>
              <p className="hintText">
                By checking the box below you authorize Land Ho to initiate a third‑party
                background check. Results are typically available within 3–5 business days.
              </p>
              <label className="checkboxRow">
                <input
                  type="checkbox"
                  checked={draft.backgroundCheckConsent}
                  onChange={(e) => patch({ backgroundCheckConsent: e.target.checked })}
                />
                <span>I consent to a background check *</span>
              </label>
            </div>

            <div className="complianceBlock">
              <h3>Liability Waiver</h3>
              <div className="waiverBox">
                <p>
                  I acknowledge that serving as a captain on the Land Ho platform involves
                  inherent risks associated with maritime activities. I agree to hold harmless
                  Land Ho, its officers, and affiliates from any claims arising out of my use
                  of the platform. I confirm that I carry adequate vessel insurance and will
                  operate within all applicable USCG and local regulations.
                </p>
              </div>
              <label className="checkboxRow">
                <input
                  type="checkbox"
                  checked={draft.liabilityWaiverAccepted}
                  onChange={(e) =>
                    patch({
                      liabilityWaiverAccepted: e.target.checked,
                      liabilityWaiverAcceptedAt: e.target.checked
                        ? new Date().toISOString()
                        : '',
                    })
                  }
                />
                <span>I have read and accept the liability waiver *</span>
              </label>
            </div>

            <div className="setupActions">
              <button className="ghostBtn" onClick={() => setStep('boat')}>Back</button>
              <button
                className="publishBtn"
                disabled={!complianceValid || saving}
                onClick={() => void saveAndContinue('review')}
              >
                Save &amp; Continue
              </button>
            </div>
          </>
        )}

        {/* ─── Step 5: Review ─── */}
        {step === 'review' && (
          <>
            <h2>Review Your Captain Profile</h2>
            <div className="reviewGrid">
              <div className="reviewItem">
                <span className="reviewLabel">Name</span>
                <span>{draft.firstName} {draft.lastName}</span>
                {!identityValid && <span className="reviewMissing">Incomplete</span>}
              </div>
              <div className="reviewItem">
                <span className="reviewLabel">License</span>
                <span>
                  {LICENSE_OPTIONS.find((o) => o.value === draft.licenseType)?.label ?? draft.licenseType}{' '}
                  — #{draft.licenseNumber || '—'}
                </span>
                {!credentialValid && <span className="reviewMissing">Incomplete</span>}
              </div>
              <div className="reviewItem">
                <span className="reviewLabel">Credential Photo</span>
                {draft.licenseImageUrl ? (
                  <img src={draft.licenseImageUrl} alt="Credential" className="setupPreviewImg" />
                ) : (
                  <span className="reviewMissing">Not uploaded</span>
                )}
              </div>
              <div className="reviewItem">
                <span className="reviewLabel">Boat</span>
                <span>
                  {BOAT_TYPE_OPTIONS.find((o) => o.value === draft.boatType)?.label ?? draft.boatType}{' '}
                  — Reg# {draft.boatRegistrationNumber || '—'}
                  {draft.boatName ? ` — "${draft.boatName}"` : ''}
                </span>
                {!boatValid && <span className="reviewMissing">Incomplete</span>}
              </div>
              <div className="reviewItem">
                <span className="reviewLabel">Background Check</span>
                <span>{draft.backgroundCheckConsent ? '✅ Consented' : '❌ Not consented'}</span>
              </div>
              <div className="reviewItem">
                <span className="reviewLabel">Liability Waiver</span>
                <span>{draft.liabilityWaiverAccepted ? '✅ Accepted' : '❌ Not accepted'}</span>
              </div>
            </div>

            {draft.completedAt && (
              <p className="setupCompletedBadge">
                ✅ Profile submitted on {new Date(draft.completedAt).toLocaleDateString()}
              </p>
            )}

            <div className="setupActions">
              <button className="ghostBtn" onClick={() => setStep('compliance')}>Back</button>
              <button
                className="publishBtn"
                disabled={!allValid || saving}
                onClick={() => void submitProfile()}
              >
                {draft.completedAt ? 'Re‑submit Profile' : 'Submit Captain Profile'}
              </button>
            </div>
          </>
        )}

        {notice && <p className="setupNotice">{notice}</p>}
      </section>
    </div>
  )
}

export default CaptainSetupPage
