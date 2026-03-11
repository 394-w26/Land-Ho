import { useEffect, useState, type ChangeEvent } from 'react'
import { onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth, googleProvider, isFirebaseReady } from '../lib/firebase'
import { uploadImageToStorage } from '../lib/storage'
import {
  getSailorProfile,
  upsertSailorProfile,
} from '../features/onboarding/onboardingApi'
import type { SailorOnboardingProfile } from '../features/onboarding/onboardingTypes'
import FeedbackModal from '../components/FeedbackModal'
import {
  getShuffledQuestions,
  PASS_THRESHOLD,
  scoreAnswers,
} from '../features/onboarding/baselineQuestions'
import type { BaselineQuestion } from '../features/onboarding/onboardingTypes'

type Step = 'identity' | 'compliance' | 'test' | 'certificate' | 'review'
const STEPS: { key: Step; label: string }[] = [
  { key: 'identity', label: '1. Name' },
  { key: 'compliance', label: '2. Compliance' },
  { key: 'test', label: '3. Baseline Test' },
  { key: 'certificate', label: '4. Boat‑ED' },
  { key: 'review', label: '5. Review' },
]

const emptyDraft: Omit<SailorOnboardingProfile, 'updatedAt'> = {
  uid: '',
  firstName: '',
  lastName: '',
  backgroundCheckConsent: false,
  backgroundCheckStatus: 'not_started',
  liabilityWaiverAccepted: false,
  liabilityWaiverAcceptedAt: '',
  baselineTestPassed: false,
  baselineTestScore: 0,
  baselineTestAttempts: 0,
  boatEdCertificateUrl: '',
  completedAt: '',
}

function SailorSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/'
  const [viewer, setViewer] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('identity')
  const [draft, setDraft] = useState(emptyDraft)
  const [notice, setNotice] = useState('')
  const [successModal, setSuccessModal] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  const handleSignIn = async () => {
    if (!auth || !isFirebaseReady || !googleProvider) {
      setNotice('Firebase is not configured. Please set up environment variables.')
      return
    }
    setSigningIn(true)
    setNotice('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch {
      setNotice('Sign-in failed. Please try again.')
    } finally {
      setSigningIn(false)
    }
  }

  /* baseline test state */
  const [testQuestions, setTestQuestions] = useState<BaselineQuestion[]>([])
  const [testAnswers, setTestAnswers] = useState<Record<string, number>>({})
  const [testSubmitted, setTestSubmitted] = useState(false)
  const [testResult, setTestResult] = useState<{
    score: number
    passed: boolean
    correct: number
    total: number
  } | null>(null)

  /* auth */
  useEffect(() => {
    if (!auth || !isFirebaseReady) { setLoading(false); return }
    const unsub = onAuthStateChanged(auth, (u) => {
      setViewer(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  /* load existing sailor profile */
  useEffect(() => {
    if (!viewer) return
    let active = true
    const run = async () => {
      try {
        const existing = await getSailorProfile(viewer.uid)
        if (active && existing) {
          setDraft({ ...existing })
          if (existing.baselineTestPassed) {
            setTestResult({
              score: existing.baselineTestScore,
              passed: true,
              correct: 0,
              total: 0,
            })
            setTestSubmitted(true)
          }
        } else if (active) {
          setDraft((prev) => ({
            ...prev,
            uid: viewer.uid,
            firstName: viewer.displayName?.split(' ')[0] ?? '',
            lastName: viewer.displayName?.split(' ').slice(1).join(' ') ?? '',
          }))
        }
      } catch {
        if (active) setDraft((prev) => ({ ...prev, uid: viewer.uid }))
      }
    }
    void run()
    return () => { active = false }
  }, [viewer])

  /* helpers */
  const patch = (partial: Partial<typeof draft>) =>
    setDraft((prev) => ({ ...prev, ...partial }))

  const identityValid = draft.firstName.trim().length >= 1 && draft.lastName.trim().length >= 1
  const complianceValid = draft.backgroundCheckConsent && draft.liabilityWaiverAccepted
  const testValid = draft.baselineTestPassed
  const certValid = draft.boatEdCertificateUrl.length > 0
  const allValid = identityValid && complianceValid && testValid && certValid

  /* save step */
  const saveAndContinue = async (nextStep: Step) => {
    if (!viewer) { setNotice('Please sign in first.'); return }
    setSaving(true)
    setNotice('Saving…')
    try {
      await upsertSailorProfile({ ...draft, uid: viewer.uid })
      setNotice('')
      setStep(nextStep)
      if (nextStep === 'test' && testQuestions.length === 0 && !draft.baselineTestPassed) {
        setTestQuestions(getShuffledQuestions())
        setTestAnswers({})
        setTestSubmitted(false)
        setTestResult(null)
      }
    } catch {
      setNotice('Save failed. Check your connection and retry.')
    } finally {
      setSaving(false)
    }
  }

  /* baseline test */
  const startNewTestAttempt = () => {
    setTestQuestions(getShuffledQuestions())
    setTestAnswers({})
    setTestSubmitted(false)
    setTestResult(null)
  }

  const handleSubmitTest = async () => {
    if (!viewer) return
    const result = scoreAnswers(testQuestions, testAnswers)
    setTestResult(result)
    setTestSubmitted(true)
    const nextAttempts = draft.baselineTestAttempts + 1
    const nextDraft = {
      ...draft,
      uid: viewer.uid,
      baselineTestPassed: result.passed,
      baselineTestScore: result.score,
      baselineTestAttempts: nextAttempts,
    }
    setDraft(nextDraft)
    try {
      await upsertSailorProfile(nextDraft)
    } catch { /* best-effort save */ }
  }

  /* certificate upload */
  const handleCertUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !viewer) return
    setUploading(true)
    setNotice('Uploading Boat‑ED certificate…')
    try {
      const url = await uploadImageToStorage(`sailor-certificates/${viewer.uid}`, file)
      patch({ boatEdCertificateUrl: url })
      setSuccessModal('Certificate uploaded.')
    } catch {
      setNotice('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  /* final submit */
  const submitProfile = async () => {
    if (!viewer || !allValid) {
      setNotice('Please complete all required steps first.')
      return
    }
    setSaving(true)
    setNotice('Finalizing sailor profile…')
    try {
      await upsertSailorProfile({
        ...draft,
        uid: viewer.uid,
        backgroundCheckStatus: 'pending',
        completedAt: new Date().toISOString(),
      })
      setSuccessModal('Sailor profile submitted! Background check is now pending review.')
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
        <header className="topBar">
          <div className="brand">
            <img className="brandLogo" src="/logo.png" alt="Land Ho logo" />
            <span>Sailor Setup</span>
          </div>
          <button className="ghostBtn" onClick={() => navigate('/')}>Back to home</button>
        </header>
        <section className="setupCard">
          <h2>Sign in to get started</h2>
          <p className="hintText">You need to sign in with Google before setting up your sailor profile.</p>
          <div className="setupActions">
            <button className="publishBtn" onClick={() => void handleSignIn()} disabled={signingIn}>
              {signingIn ? 'Signing in…' : 'Sign in with Google'}
            </button>
          </div>
          {notice && <p className="setupNotice">{notice}</p>}
        </section>
      </div>
    )
  }

  return (
    <div className="setupPage">
      <header className="topBar">
        <div className="brand">
          <img className="brandLogo" src="/logo.png" alt="Land Ho logo" />
          <span>Sailor Setup</span>
        </div>
        <button className="ghostBtn" onClick={() => navigate('/')}>Back to home</button>
      </header>

      <nav className="setupSteps">
        {STEPS.map((s) => (
          <button
            key={s.key}
            className={step === s.key ? 'setupStepBtn active' : 'setupStepBtn'}
            onClick={() => {
              if (s.key === 'test' && testQuestions.length === 0 && !draft.baselineTestPassed) {
                setTestQuestions(getShuffledQuestions())
              }
              setStep(s.key)
            }}
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
            <div className="formRow">
              <label>First Name *</label>
              <input value={draft.firstName} onChange={(e) => patch({ firstName: e.target.value })} placeholder="Jane" />
            </div>
            <div className="formRow">
              <label>Last Name *</label>
              <input value={draft.lastName} onChange={(e) => patch({ lastName: e.target.value })} placeholder="Smith" />
            </div>
            <div className="setupActions">
              <button
                className="publishBtn"
                disabled={!identityValid || saving}
                onClick={() => void saveAndContinue('compliance')}
              >
                Save &amp; Continue
              </button>
            </div>
          </>
        )}

        {/* ─── Step 2: Compliance ─── */}
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
                  I understand that participating in maritime activities through Land Ho
                  carries inherent risks. I agree to hold harmless Land Ho, its officers,
                  captains, and affiliates from any claims arising from my participation.
                  I confirm I can swim and will follow all safety instructions provided by
                  the captain.
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
              <button className="ghostBtn" onClick={() => setStep('identity')}>Back</button>
              <button
                className="publishBtn"
                disabled={!complianceValid || saving}
                onClick={() => void saveAndContinue('test')}
              >
                Save &amp; Continue
              </button>
            </div>
          </>
        )}

        {/* ─── Step 3: Baseline Test ─── */}
        {step === 'test' && (
          <>
            <h2>Baseline Knowledge Test</h2>
            <p className="hintText">
              Answer questions about boat anatomy, harbor anatomy, and basic knots.
              You need {PASS_THRESHOLD}% to pass. You can retake the test if needed.
            </p>

            {draft.baselineTestPassed && (
              <div className="testPassedBanner">
                ✅ You already passed with a score of {draft.baselineTestScore}%.
                <button className="ghostBtn compactActionBtn" onClick={startNewTestAttempt}>
                  Retake anyway
                </button>
              </div>
            )}

            {!draft.baselineTestPassed && testSubmitted && testResult && !testResult.passed && (
              <div className="testFailedBanner">
                ❌ Score: {testResult.score}% ({testResult.correct}/{testResult.total} correct).
                You need {PASS_THRESHOLD}% to pass.
                <button className="ghostBtn compactActionBtn" onClick={startNewTestAttempt}>
                  Try Again
                </button>
              </div>
            )}

            {testSubmitted && testResult?.passed && (
              <div className="testPassedBanner">
                🎉 You passed! Score: {testResult.score}% ({testResult.correct}/{testResult.total}).
              </div>
            )}

            {!testSubmitted && testQuestions.length > 0 && (
              <div className="quizList">
                {testQuestions.map((q, idx) => (
                  <div key={q.id} className="quizItem">
                    <p className="quizQuestion">
                      <strong>{idx + 1}.</strong> {q.question}
                      <span className="quizCategory">{q.category.replace('_', ' ')}</span>
                    </p>
                    <div className="quizChoices">
                      {q.choices.map((c, ci) => (
                        <label key={ci} className="quizChoice">
                          <input
                            type="radio"
                            name={q.id}
                            checked={testAnswers[q.id] === ci}
                            onChange={() =>
                              setTestAnswers((prev) => ({ ...prev, [q.id]: ci }))
                            }
                          />
                          <span>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="setupActions">
                  <button
                    className="publishBtn"
                    disabled={Object.keys(testAnswers).length < testQuestions.length}
                    onClick={() => void handleSubmitTest()}
                  >
                    Submit Test ({Object.keys(testAnswers).length}/{testQuestions.length} answered)
                  </button>
                </div>
              </div>
            )}

            {/* show explanations after submission */}
            {testSubmitted && testResult && testQuestions.length > 0 && (
              <div className="quizList quizReview">
                <h3>Answer Review</h3>
                {testQuestions.map((q, idx) => {
                  const userAnswer = testAnswers[q.id]
                  const isCorrect = userAnswer === q.correctIndex
                  return (
                    <div key={q.id} className={isCorrect ? 'quizItem quizCorrect' : 'quizItem quizWrong'}>
                      <p className="quizQuestion">
                        <strong>{idx + 1}.</strong> {q.question}
                      </p>
                      <p>
                        Your answer: <strong>{q.choices[userAnswer] ?? '—'}</strong>
                        {!isCorrect && (
                          <> · Correct: <strong>{q.choices[q.correctIndex]}</strong></>
                        )}
                      </p>
                      <p className="hintText">{q.explanation}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {(draft.baselineTestPassed || (testSubmitted && testResult?.passed)) && (
              <div className="setupActions">
                <button className="ghostBtn" onClick={() => setStep('compliance')}>Back</button>
                <button
                  className="publishBtn"
                  onClick={() => void saveAndContinue('certificate')}
                  disabled={saving}
                >
                  Continue
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── Step 4: Boat-ED Certificate ─── */}
        {step === 'certificate' && (
          <>
            <h2>Upload Boat‑ED Certificate</h2>
            <p className="hintText">
              Upload a photo or scan of your Boat‑ED (boater education) certificate.
              This is required in many states before operating or crewing on a vessel.
            </p>
            <div className="formRow">
              <label>Certificate Image *</label>
              <input type="file" accept="image/*,.pdf" onChange={handleCertUpload} />
              {uploading && <small className="hintText">Uploading…</small>}
            </div>
            {draft.boatEdCertificateUrl && (
              <div className="certPreview">
                <img src={draft.boatEdCertificateUrl} alt="Boat-ED Certificate" className="setupPreviewImg" />
                <p className="hintText">Certificate uploaded ✓</p>
              </div>
            )}
            <div className="setupActions">
              <button className="ghostBtn" onClick={() => setStep('test')}>Back</button>
              <button
                className="publishBtn"
                disabled={!certValid || saving}
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
            <h2>Review Your Sailor Profile</h2>
            <div className="reviewGrid">
              <div className="reviewItem">
                <span className="reviewLabel">Name</span>
                <span>{draft.firstName} {draft.lastName}</span>
                {!identityValid && <span className="reviewMissing">Incomplete</span>}
              </div>
              <div className="reviewItem">
                <span className="reviewLabel">Background Check</span>
                <span>{draft.backgroundCheckConsent ? '✅ Consented' : '❌ Not consented'}</span>
              </div>
              <div className="reviewItem">
                <span className="reviewLabel">Liability Waiver</span>
                <span>{draft.liabilityWaiverAccepted ? '✅ Accepted' : '❌ Not accepted'}</span>
              </div>
              <div className="reviewItem">
                <span className="reviewLabel">Baseline Test</span>
                <span>
                  {draft.baselineTestPassed
                    ? `✅ Passed (${draft.baselineTestScore}%)`
                    : `❌ Not passed (${draft.baselineTestAttempts} attempt${draft.baselineTestAttempts === 1 ? '' : 's'})`}
                </span>
              </div>
              <div className="reviewItem">
                <span className="reviewLabel">Boat‑ED Certificate</span>
                {draft.boatEdCertificateUrl ? (
                  <img src={draft.boatEdCertificateUrl} alt="Boat-ED" className="setupPreviewImg" />
                ) : (
                  <span className="reviewMissing">Not uploaded</span>
                )}
              </div>
            </div>

            {draft.completedAt && (
              <p className="setupCompletedBadge">
                ✅ Profile submitted on {new Date(draft.completedAt).toLocaleDateString()}
              </p>
            )}

            <div className="setupActions">
              <button className="ghostBtn" onClick={() => setStep('certificate')}>Back</button>
              <button
                className="publishBtn"
                disabled={!allValid || saving}
                onClick={() => void submitProfile()}
              >
                {draft.completedAt ? 'Re‑submit Profile' : 'Submit Sailor Profile'}
              </button>
            </div>
          </>
        )}

        {notice && <p className="setupNotice">{notice}</p>}
      </section>

      {successModal && (
        <FeedbackModal
          title="Sailor Setup"
          message={successModal}
          onClose={() => {
            setSuccessModal('')
            navigate(returnTo, { replace: true })
          }}
        />
      )}
    </div>
  )
}

export default SailorSetupPage
