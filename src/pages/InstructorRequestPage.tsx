import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { auth, googleProvider, isFirebaseReady } from '../lib/firebase'
import {
  createInstructorRequest,
  getInstructorRequestsBySailor,
  cancelInstructorRequest,
  type CreateInstructorRequestInput,
} from '../features/instructor/instructorApi'
import type {
  InstructorRequest,
  InstructorFocusArea,
} from '../features/onboarding/onboardingTypes'
import FeedbackModal from '../components/FeedbackModal'

const FOCUS_OPTIONS: { value: InstructorFocusArea; label: string }[] = [
  { value: 'sailing_basics', label: 'Sailing Basics' },
  { value: 'navigation', label: 'Navigation & Chart Reading' },
  { value: 'docking_anchoring', label: 'Docking & Anchoring' },
  { value: 'knot_tying', label: 'Knot Tying' },
  { value: 'safety_procedures', label: 'Safety Procedures' },
  { value: 'weather_reading', label: 'Weather Reading' },
  { value: 'boat_handling', label: 'Boat Handling & Maneuvering' },
  { value: 'general', label: 'General Guidance' },
]

const EXP_LEVELS: { value: CreateInstructorRequestInput['experienceLevel']; label: string }[] = [
  { value: 'beginner', label: '🟢 Beginner — first time or very little experience' },
  { value: 'intermediate', label: '🟡 Intermediate — some trips under my belt' },
  { value: 'advanced', label: '🔴 Advanced — experienced, seeking specific skills' },
]

const STATUS_LABELS: Record<InstructorRequest['status'], string> = {
  pending: '⏳ Pending — waiting for a match',
  matched: '🤝 Matched — an instructor is assigned',
  confirmed: '✅ Confirmed — instructor will be onboard',
  completed: '🎓 Completed',
  cancelled: '🚫 Cancelled',
}

function InstructorRequestPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [viewer, setViewer] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [notice, setNotice] = useState('')
  const [successModal, setSuccessModal] = useState('')
  const [tab, setTab] = useState<'new' | 'history'>('new')

  /* ── form state ─── */
  const [boatId, setBoatId] = useState(searchParams.get('boat') ?? '')
  const [boatTitle, setBoatTitle] = useState(searchParams.get('title') ?? '')
  const [tripDate, setTripDate] = useState(searchParams.get('date') ?? '')
  const [focusAreas, setFocusAreas] = useState<InstructorFocusArea[]>([])
  const [experienceLevel, setExperienceLevel] =
    useState<CreateInstructorRequestInput['experienceLevel']>('beginner')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /* ── history state ─── */
  const [requests, setRequests] = useState<InstructorRequest[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [cancellingId, setCancellingId] = useState('')

  /* ── auth ─── */
  useEffect(() => {
    if (!auth || !isFirebaseReady) { setLoading(false); return }
    const unsub = onAuthStateChanged(auth, (u) => {
      setViewer(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleSignIn = async () => {
    if (!auth || !isFirebaseReady || !googleProvider) {
      setNotice('Firebase is not configured.')
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

  /* ── load history when tab or viewer changes ─── */
  useEffect(() => {
    if (!viewer || tab !== 'history') return
    let active = true
    const run = async () => {
      setHistoryLoading(true)
      try {
        const data = await getInstructorRequestsBySailor(viewer.uid)
        if (active) setRequests(data)
      } catch {
        if (active) setNotice('Failed to load request history.')
      } finally {
        if (active) setHistoryLoading(false)
      }
    }
    void run()
    return () => { active = false }
  }, [viewer, tab])

  /* ── toggle focus areas ─── */
  const toggleFocus = (area: InstructorFocusArea) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    )
  }

  /* ── submit request ─── */
  const formValid = boatTitle.trim().length > 0 && tripDate.length > 0 && focusAreas.length > 0

  const handleSubmit = async () => {
    if (!viewer) { setNotice('Please sign in first.'); return }
    if (!formValid) { setNotice('Please fill in all required fields.'); return }
    setSubmitting(true)
    setNotice('Submitting instructor request…')
    try {
      await createInstructorRequest({
        sailorUid: viewer.uid,
        sailorName: viewer.displayName || 'Sailor',
        boatId: boatId || boatTitle.toLowerCase().replace(/\s+/g, '-'),
        boatTitle: boatTitle.trim(),
        tripDate,
        focusAreas,
        experienceLevel,
        notes: notes.trim(),
      })
      setSuccessModal('Instructor request submitted! You will be notified when matched.')
      /* reset form */
      setBoatId('')
      setBoatTitle('')
      setTripDate('')
      setFocusAreas([])
      setExperienceLevel('beginner')
      setNotes('')
    } catch {
      setNotice('Failed to submit request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── cancel request ─── */
  const handleCancel = async (reqId: string) => {
    setCancellingId(reqId)
    try {
      await cancelInstructorRequest(reqId)
      setRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: 'cancelled' } : r)),
      )
    } catch {
      setNotice('Failed to cancel request.')
    } finally {
      setCancellingId('')
    }
  }

  /* ── Render ─── */

  if (loading) {
    return <div className="setupPage"><p className="muted">Loading…</p></div>
  }

  if (!viewer) {
    return (
      <div className="setupPage">
        <header className="topBar">
          <div className="brand">
            <img className="brandLogo" src="/logo.png" alt="Land Ho logo" />
            <span>Request Instructor</span>
          </div>
          <button className="ghostBtn" onClick={() => navigate('/')}>Back to home</button>
        </header>
        <section className="setupCard">
          <h2>Sign in to request an instructor</h2>
          <p className="hintText">
            Sign in with Google so we can match you with an onboard instructor for your next sail.
          </p>
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
    <div className="setupPage instructorPage">
      <header className="topBar">
        <div className="brand">
          <img className="brandLogo" src="/logo.png" alt="Land Ho logo" />
          <span>Onboard Instructor</span>
        </div>
        <button className="ghostBtn" onClick={() => navigate('/')}>Back to home</button>
      </header>

      {/* tab bar */}
      <nav className="setupSteps">
        <button
          className={tab === 'new' ? 'setupStepBtn active' : 'setupStepBtn'}
          onClick={() => setTab('new')}
        >
          📝 New Request
        </button>
        <button
          className={tab === 'history' ? 'setupStepBtn active' : 'setupStepBtn'}
          onClick={() => setTab('history')}
        >
          📋 My Requests
        </button>
      </nav>

      <section className="setupCard">
        {/* ─── New Request Tab ─── */}
        {tab === 'new' && (
          <>
            <h2>Request an Onboard Instructor</h2>
            <p className="hintText">
              Want to learn while you sail? Request a certified instructor or experienced captain
              to join your upcoming trip. They'll provide real-time, hands-on guidance tailored
              to your skill level.
            </p>

            <div className="instructorBenefits">
              <div className="benefitItem">
                <span className="benefitIcon">🎓</span>
                <div>
                  <strong>Learn by Doing</strong>
                  <p>Gain practical skills with a real instructor by your side, not just theory.</p>
                </div>
              </div>
              <div className="benefitItem">
                <span className="benefitIcon">🧭</span>
                <div>
                  <strong>Personalized Focus</strong>
                  <p>Choose the skills you want to work on — from knots to navigation to safety.</p>
                </div>
              </div>
              <div className="benefitItem">
                <span className="benefitIcon">⛵</span>
                <div>
                  <strong>Confidence at Sea</strong>
                  <p>Build confidence for future solo or crewed trips on the water.</p>
                </div>
              </div>
            </div>

            <hr className="instructorDivider" />

            <div className="formRow">
              <label>Trip / Boat Name *</label>
              <input
                value={boatTitle}
                onChange={(e) => setBoatTitle(e.target.value)}
                placeholder="e.g. Sunset Sail on the Bay"
              />
              <small className="hintText">
                Enter the name of the boat listing or trip you've booked (or plan to book).
              </small>
            </div>

            <div className="formRow">
              <label>Boat Listing ID <span className="optionalLabel">(optional)</span></label>
              <input
                value={boatId}
                onChange={(e) => setBoatId(e.target.value)}
                placeholder="Paste the listing ID if you have it"
              />
            </div>

            <div className="formRow">
              <label>Trip Date *</label>
              <input
                type="date"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="formRow">
              <label>Your Experience Level *</label>
              <div className="expLevelList">
                {EXP_LEVELS.map((lvl) => (
                  <label key={lvl.value} className="radioRow">
                    <input
                      type="radio"
                      name="experienceLevel"
                      checked={experienceLevel === lvl.value}
                      onChange={() => setExperienceLevel(lvl.value)}
                    />
                    <span>{lvl.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="formRow">
              <label>What do you want to learn? * <span className="hintText">(select one or more)</span></label>
              <div className="focusAreaGrid">
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={
                      focusAreas.includes(opt.value)
                        ? 'focusAreaChip focusAreaActive'
                        : 'focusAreaChip'
                    }
                    onClick={() => toggleFocus(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="formRow">
              <label>Additional Notes <span className="optionalLabel">(optional)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Anything specific you'd like the instructor to know — disabilities, fears, goals…"
              />
            </div>

            <div className="setupActions">
              <button
                className="publishBtn"
                disabled={!formValid || submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? 'Submitting…' : 'Submit Instructor Request'}
              </button>
            </div>
          </>
        )}

        {/* ─── History Tab ─── */}
        {tab === 'history' && (
          <>
            <h2>My Instructor Requests</h2>
            {historyLoading && <p className="muted">Loading your requests…</p>}
            {!historyLoading && requests.length === 0 && (
              <div className="emptyHistory">
                <p className="hintText">You haven't submitted any instructor requests yet.</p>
                <button className="ghostBtn" onClick={() => setTab('new')}>
                  Create your first request →
                </button>
              </div>
            )}
            {!historyLoading && requests.length > 0 && (
              <div className="instructorHistoryList">
                {requests.map((req) => (
                  <div key={req.id} className="instructorHistoryCard">
                    <div className="historyCardHeader">
                      <h3>{req.boatTitle}</h3>
                      <span className={`statusBadge status-${req.status}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                    </div>
                    <div className="historyCardBody">
                      <p><strong>Trip Date:</strong> {req.tripDate}</p>
                      <p><strong>Level:</strong> {req.experienceLevel}</p>
                      <p>
                        <strong>Focus:</strong>{' '}
                        {req.focusAreas
                          .map((a) => FOCUS_OPTIONS.find((o) => o.value === a)?.label ?? a)
                          .join(', ')}
                      </p>
                      {req.notes && <p><strong>Notes:</strong> {req.notes}</p>}
                      {req.matchedInstructorName && (
                        <p className="matchedInstructor">
                          🧑‍✈️ Instructor: <strong>{req.matchedInstructorName}</strong>
                        </p>
                      )}
                    </div>
                    {(req.status === 'pending' || req.status === 'matched') && (
                      <div className="historyCardActions">
                        <button
                          className="ghostBtn dangerText"
                          disabled={cancellingId === req.id}
                          onClick={() => void handleCancel(req.id)}
                        >
                          {cancellingId === req.id ? 'Cancelling…' : 'Cancel Request'}
                        </button>
                      </div>
                    )}
                    <p className="hintText historyTimestamp">
                      Requested {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {notice && <p className="setupNotice">{notice}</p>}
      </section>

      {successModal && (
        <FeedbackModal
          title="Instructor Request"
          message={successModal}
          onClose={() => setSuccessModal('')}
        />
      )}
    </div>
  )
}

export default InstructorRequestPage
