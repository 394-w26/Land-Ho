import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getBoatListingById, type BoatRecord } from '../features/boats/boatsApi'
import { getUserPublicProfile, type UserPublicProfile } from '../features/users/usersApi'
import { createBookingRequest, hasPendingBookingRequest } from '../features/booking/bookingApi'
import { getOrCreateConversation } from '../features/chat/chatApi'
import { useAuth } from '../hooks/useAuth'
import { getCaptainProfile, getSailorProfile } from '../features/onboarding/onboardingApi'
import { Header, UserButton, MenuDropdown } from '../components/Header'
import { ApprovedRequestsDropdown } from '../components/ApprovedRequestsDropdown'
import FeedbackModal from '../components/FeedbackModal'

const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined

const formatTripDate = (value: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  const parsedDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate)
}

function BoatDetailPage() {
  const { boatId = '' } = useParams()
  const navigate = useNavigate()
  const { viewer, authLoading, loginWithGoogle, signOutUser, userInitial } = useAuth()
  const [loading, setLoading] = useState(true)
  const [boatError, setBoatError] = useState('')
  const [hostError, setHostError] = useState('')
  const [boat, setBoat] = useState<BoatRecord | null>(null)
  const [hostProfile, setHostProfile] = useState<UserPublicProfile | null>(null)
  const [reserveSubmitting, setReserveSubmitting] = useState(false)
  const [reserveNotice, setReserveNotice] = useState('')
  const [reserveSuccessModal, setReserveSuccessModal] = useState('')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [messagingHost, setMessagingHost] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!boatId) {
      setBoatError('Boat id is missing.')
      setLoading(false)
      return
    }

    let active = true
    const run = async () => {
      setLoading(true)
      setBoatError('')
      setHostError('')
      try {
        const boatDoc = await getBoatListingById(boatId)
        if (!active) {
          return
        }
        if (!boatDoc) {
          setBoat(null)
          setBoatError('This boat listing does not exist.')
          setLoading(false)
          return
        }
        setBoat(boatDoc)
        if (boatDoc.ownerUid) {
          try {
            const profile = await getUserPublicProfile(boatDoc.ownerUid)
            if (active) {
              setHostProfile(profile)
            }
          } catch {
            if (active) {
              setHostError('Captain profile is temporarily unavailable.')
            }
          }
        } else {
          setHostProfile(null)
        }
      } catch {
        if (active) {
          setBoatError('Failed to load boat details.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [boatId])

  const galleryImages = useMemo(() => {
    if (!boat) {
      return []
    }
    return boat.images.length > 0 ? boat.images : boat.image ? [boat.image] : []
  }, [boat])

  const detailMapPreviewUrl = useMemo(() => {
    if (!boat?.coordinates || !mapboxToken) {
      return ''
    }
    const { lng, lat } = boat.coordinates
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff385c(${lng},${lat})/${lng},${lat},12,0/900x320?access_token=${mapboxToken}`
  }, [boat?.coordinates, mapboxToken])

  const handleReserve = async () => {
    if (!boat) {
      return
    }
    if (!viewer) {
      setReserveNotice('Please sign in before sending a booking request.')
      return
    }
    if (viewer.uid === boat.ownerUid) {
      setReserveNotice('You cannot reserve your own listing.')
      return
    }
    setReserveSubmitting(true)
    setReserveNotice('Submitting request...')
    try {
      const hasPending = await hasPendingBookingRequest(boat.id, viewer.uid)
      if (hasPending) {
        setReserveNotice('You already have a pending request for this trip.')
        return
      }

      const applicantProfile = await getUserPublicProfile(viewer.uid)
      const sailorProfile = await getSailorProfile(viewer.uid)
      const sailorSetupCompleted = Boolean(sailorProfile?.completedAt)

      const displayName = applicantProfile?.displayName ?? ''
      const city = applicantProfile?.city ?? ''
      const bio = applicantProfile?.bio ?? ''
      const skills = applicantProfile?.skills ?? []
      const okDisplayName = displayName.trim().length >= 2
      const okCity = city.trim().length > 0
      const okBio = bio.trim().length >= 30
      const okSkills = skills.length >= 2
      const publicProfileReady = Boolean(
        applicantProfile &&
        okDisplayName &&
        okCity &&
        okBio &&
        okSkills,
      )
      const profileReady = sailorSetupCompleted || publicProfileReady

      if (!profileReady) {
        setShowProfileModal(true)
        return
      }

      await createBookingRequest({
        boatId: boat.id,
        boatTitle: boat.title,
        boatCoverImage: boat.image,
        hostUid: boat.ownerUid,
        applicantUid: viewer.uid,
        applicantName: applicantProfile?.displayName || viewer.displayName || viewer.email || 'Sailor',
        applicantAvatar: applicantProfile?.avatarUrl || viewer.photoURL || '',
      })
      setReserveSuccessModal('Your booking request has been sent! The captain will review it shortly.')
    } catch (error) {
      if (error instanceof Error && error.message) {
        setReserveNotice(error.message)
      } else {
        setReserveNotice('Failed to send request. Please try again.')
      }
    } finally {
      setReserveSubmitting(false)
    }
  }

  const handleMessageHost = async () => {
    if (!boat) return
    if (!viewer) {
      setReserveNotice('Please sign in to message the captain.')
      return
    }
    if (!boat.ownerUid) {
      setReserveNotice('Captain contact is unavailable for this listing.')
      return
    }
    if (viewer.uid === boat.ownerUid) {
      setReserveNotice('You cannot message yourself.')
      return
    }
    setMessagingHost(true)
    setReserveNotice('')
    try {
      const sailorProfile = await getUserPublicProfile(viewer.uid)
      const convoId = await getOrCreateConversation({
        sailorUid: viewer.uid,
        sailorName: sailorProfile?.displayName || viewer.displayName || viewer.email || 'Sailor',
        sailorAvatar: sailorProfile?.avatarUrl || viewer.photoURL || '',
        captainUid: boat.ownerUid,
        captainName: hostProfile?.displayName || boat.ownerName || 'Captain',
        captainAvatar: hostProfile?.avatarUrl || '',
        boatId: boat.id,
        boatTitle: boat.title,
      })
      navigate(`/chat/${convoId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setReserveNotice(`Failed to open chat: ${msg}`)
    } finally {
      setMessagingHost(false)
    }
  }

  const handleBecomeHost = async () => {
    // If not signed in, sign in first and send to captain setup.
    if (!viewer) {
      const success = await loginWithGoogle()
      if (!success) return
      navigate('/setup/captain')
      return
    }

    // Signed in: check captain profile completion in Firestore.
    try {
      const captain = await getCaptainProfile(viewer.uid)
      if (captain?.completedAt) {
        // Captain requirements met – go straight to host dashboard / listing management.
        navigate('/', { state: { initialMode: 'host' } })
      } else {
        // Not completed yet – send to captain setup flow.
        navigate('/setup/captain')
      }
    } catch {
      // On error, be safe and route to captain setup.
      navigate('/setup/captain')
    }
  }

  const handleOpenProfile = async () => {
    if (!viewer) {
      const success = await loginWithGoogle()
      if (!success) return
    }
    navigate('/', { state: { openProfile: true } })
  }

  const handleSignOut = async () => {
    await signOutUser()
    setMenuOpen(false)
  }

  const handleNavigateInstructorRequest = () => {
    setMenuOpen(false)
    navigate('/request-instructor')
  }

  const handleNavigateMap = () => {
    setMenuOpen(false)
    navigate('/', {
      state: {
        openMap: true,
        highlightBoatId: boat?.id ?? '',
      },
    })
  }

  const handleNavigateChat = () => {
    setMenuOpen(false)
    navigate('/chat')
  }

  const header = (
    <Header brandText="Land Ho">
      <button className="ghostBtn" onClick={() => void handleBecomeHost()}>
        Browse as Captain
      </button>
      <ApprovedRequestsDropdown />
      <UserButton
        viewer={viewer}
        authLoading={authLoading}
        resolvedAvatarUrl={''}
        userInitial={userInitial}
        onClick={() => void handleOpenProfile()}
      />
      <MenuDropdown menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
        <button className="menuItem" onClick={handleNavigateInstructorRequest}>
          🎓 Request Instructor
        </button>
        {viewer && (
          <button className="menuItem" onClick={handleNavigateChat}>
            💬 Messages
          </button>
        )}
        <button className="menuItem" onClick={handleNavigateMap}>
          Map view
        </button>
        {viewer ? (
          <button className="menuItem dangerText" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        ) : (
          <button
            className="menuItem"
            onClick={() => {
              setMenuOpen(false)
              void loginWithGoogle()
            }}
          >
            Sign in
          </button>
        )}
      </MenuDropdown>
    </Header>
  )

  if (loading) {
    return (
      <>
        {header}
        <div className="detailPage">
          <p className="muted">Loading boat details...</p>
        </div>
      </>
    )
  }

  if (!boat) {
    return (
      <>
        {header}
        <div className="detailPage">
          <button className="ghostBtn" onClick={() => navigate('/')}>
            Back to home
          </button>
          <p className="authNotice">{boatError || 'Boat not found.'}</p>
        </div>
      </>
    )
  }

  const hasHostProfileLink = Boolean(boat.ownerUid)

  return (
    <>
      {header}
      <div className="detailPage">
        <section className="detailHeader">
        <h1>{boat.title}</h1>
        <p>
          {boat.location} · {formatTripDate(boat.date)} · {boat.seats} seats
          {(boat.seatsTaken ?? 0) > 0 && (
            <span> · {Math.max(0, boat.seats - (boat.seatsTaken ?? 0))} left</span>
          )}
        </p>
      </section>

        <section className="detailGallery">
        {galleryImages.length === 0 ? (
          <div className="detailGalleryEmpty">No photos uploaded.</div>
        ) : (
          <>
            <img src={galleryImages[0]} alt={`${boat.title} cover`} className="detailCoverImage" />
            <div className="detailSubGrid">
              {galleryImages.slice(1, 5).map((image, index) => (
                <img key={`${image}-${index}`} src={image} alt={`${boat.title} ${index + 2}`} />
              ))}
            </div>
          </>
        )}
        </section>

        <section className="detailInfoGrid">
        <article className="detailInfoCard">
          <h2>Trip information</h2>
          <p>Category: {boat.category}</p>
          <p>Captain: {boat.captain}</p>
          <p>Rating: {boat.rating.toFixed(2)}</p>
          <button className="publishBtn reserveBtn" onClick={() => void handleReserve()} disabled={reserveSubmitting}>
            {reserveSubmitting ? 'Submitting...' : 'Reserve'}
          </button>
          <button
            className="ghostBtn instructorCta"
            onClick={() => navigate(`/request-instructor?boat=${boat.id}&title=${encodeURIComponent(boat.title)}&date=${boat.date}`)}
          >
            🎓 Want an onboard instructor?
          </button>
          {reserveNotice && <p className="hostNotice">{reserveNotice}</p>}
          {boatError && <p className="authNotice">{boatError}</p>}
        </article>

        <article className="detailInfoCard">
          <h2>Meet your captain</h2>
          <div
            className={`hostProfileHead ${hasHostProfileLink ? 'hostProfileClickable' : ''}`}
            onClick={() => {
              if (hasHostProfileLink) {
                navigate(`/hosts/${boat.ownerUid}`)
              }
            }}
            role={hasHostProfileLink ? 'button' : undefined}
            tabIndex={hasHostProfileLink ? 0 : undefined}
            onKeyDown={(event) => {
              if (!hasHostProfileLink) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate(`/hosts/${boat.ownerUid}`)
              }
            }}
          >
            {hostProfile?.avatarUrl ? (
              <img src={hostProfile.avatarUrl} alt={hostProfile.displayName || boat.ownerName} />
            ) : (
              <div className="hostAvatarFallback">
                {(hostProfile?.displayName || boat.ownerName || 'C').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3>{hostProfile?.displayName || boat.ownerName || 'Captain'}</h3>
              <p>{hostProfile?.city || 'Location not provided'}</p>
            </div>
          </div>
          <div className="captainBtnRow">
            <button
              className="ghostBtn hostProfileBtn"
              onClick={() => navigate(`/hosts/${boat.ownerUid}`)}
              disabled={!hasHostProfileLink}
              aria-disabled={!hasHostProfileLink}
            >
              View full profile
            </button>
            <button
              className="ghostBtn hostProfileBtn"
              onClick={() => void handleMessageHost()}
              disabled={messagingHost}
            >
              {messagingHost ? 'Opening chat…' : '💬 Message host'}
            </button>
          </div>
          <p>{hostProfile?.bio || 'This captain has not added a public introduction yet.'}</p>
          {hostError && <p className="authNotice">{hostError}</p>}
          {hostProfile?.skills && hostProfile.skills.length > 0 && (
            <div className="hostSkillList">
              {hostProfile.skills.slice(0, 6).map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          )}
        </article>
      </section>

        <section className="detailMapSection">
        <article className="detailInfoCard detailMapCard">
          <div className="detailMapHeader">
            <h2>Location on map</h2>
            <button
              className="ghostBtn compactActionBtn"
              onClick={() =>
                navigate('/', {
                  state: {
                    openMap: true,
                    highlightBoatId: boat.id,
                  },
                })
              }
            >
              Open map view
            </button>
          </div>
          {boat.coordinates && detailMapPreviewUrl ? (
            <button
              className="detailMapPreviewBtn"
              onClick={() =>
                navigate('/', {
                  state: {
                    openMap: true,
                    highlightBoatId: boat.id,
                  },
                })
              }
            >
              <img src={detailMapPreviewUrl} alt={`${boat.title} location map`} className="detailMapPreview" />
            </button>
          ) : (
            <div className="detailMapEmpty">
              <p>Map preview unavailable for this listing.</p>
              <button
                className="ghostBtn compactActionBtn"
                onClick={() =>
                  navigate('/', {
                    state: {
                      openMap: true,
                    },
                  })
                }
              >
                Browse all map listings
              </button>
            </div>
          )}
        </article>
        </section>

        <div className="detailStickyBar">
          <button className="publishBtn detailStickyReserve" onClick={() => void handleReserve()} disabled={reserveSubmitting}>
            {reserveSubmitting ? 'Submitting...' : 'Reserve'}
          </button>
        </div>

        {showProfileModal && (
        <div className="modalOverlay" onClick={() => setShowProfileModal(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <h3>Complete your profile</h3>
            <p>
              Please complete your sailor setup, or finish your public profile
              (display name, city, bio, and skills) before reserving a trip.
            </p>
            <div className="modalActions">
              <button
                className="publishBtn"
                onClick={() => navigate('/', { state: { openProfile: true } })}
              >
                Go to profile
              </button>
              <button className="ghostBtn" onClick={() => setShowProfileModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
        )}

        {reserveSuccessModal && (
        <FeedbackModal
          title="Request Sent"
          message={reserveSuccessModal}
          onClose={() => setReserveSuccessModal('')}
        />
        )}
      </div>
    </>
  )
}

export default BoatDetailPage
