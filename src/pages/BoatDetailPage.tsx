import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { useNavigate, useParams } from 'react-router-dom'
import { getBoatListingById, type BoatRecord } from '../features/boats/boatsApi'
import { getUserPublicProfile, type UserPublicProfile } from '../features/users/usersApi'
import { createBookingRequest, hasPendingBookingRequest } from '../features/booking/bookingApi'
import { getOrCreateConversation } from '../features/chat/chatApi'
import { auth, isFirebaseReady } from '../lib/firebase'
import { initialBoatData } from '../data/seedBoats'
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
  const [viewer, setViewer] = useState<User | null>(null)
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

  useEffect(() => {
    if (!auth || !isFirebaseReady) {
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setViewer(nextUser)
    })
    return () => unsubscribe()
  }, [])

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
          // Fallback to local seed data (for demo boats that aren't in Firestore yet)
          const seedBoat = initialBoatData.find((b) => b.id === boatId)
          if (!seedBoat) {
            setBoat(null)
            setBoatError('This boat listing does not exist.')
            setLoading(false)
            return
          }
          const mappedSeedBoat: BoatRecord = {
            id: seedBoat.id,
            title: seedBoat.title,
            location: seedBoat.location,
            coordinates: seedBoat.coordinates,
            price: seedBoat.price,
            rating: seedBoat.rating,
            seats: seedBoat.seats,
            captain: seedBoat.captain,
            date: seedBoat.date,
            category: seedBoat.category,
            image: seedBoat.image,
            images: seedBoat.images,
            ownerUid: seedBoat.ownerUid,
            ownerName: seedBoat.ownerName,
          }
          setBoat(mappedSeedBoat)
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
  }, [boat])

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
      const profileReady =
        applicantProfile &&
        applicantProfile.displayName.trim().length >= 2 &&
        applicantProfile.city.trim().length > 0 &&
        applicantProfile.bio.trim().length >= 30 &&
        applicantProfile.skills.length >= 2 &&
        applicantProfile.experiences.length >= 1

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
        applicantName: applicantProfile.displayName || viewer.displayName || viewer.email || 'Sailor',
        applicantAvatar: applicantProfile.avatarUrl || viewer.photoURL || '',
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

  if (loading) {
    return (
      <div className="detailPage">
        <p className="muted">Loading boat details...</p>
      </div>
    )
  }

  if (!boat) {
    return (
      <div className="detailPage">
        <button className="ghostBtn" onClick={() => navigate('/')}>
          Back to home
        </button>
        <p className="authNotice">{boatError || 'Boat not found.'}</p>
      </div>
    )
  }

  return (
    <div className="detailPage">
      <header className="topBar">
        <div className="brand">
          <img className="brandLogo" src="/logo.png" alt="Land Ho logo" />
          <span>Land Ho</span>
        </div>
        <button className="ghostBtn" onClick={() => navigate('/')}>
          Back to listings
        </button>
      </header>

      <section className="detailHeader">
        <h1>{boat.title}</h1>
        <p>
          {boat.location} · {formatTripDate(boat.date)} · {boat.seats} seats
        </p>
        <p className="price">$ {boat.price} / person</p>
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
          <div className="hostProfileHead hostProfileClickable" onClick={() => navigate(`/hosts/${boat.ownerUid}`)}>
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
            <button className="ghostBtn hostProfileBtn" onClick={() => navigate(`/hosts/${boat.ownerUid}`)}>
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
        <div className="detailStickyPrice">
          <span className="detailStickyAmount">$ {boat.price}</span>
          <span className="detailStickyUnit"> / person</span>
        </div>
        <button className="publishBtn detailStickyReserve" onClick={() => void handleReserve()} disabled={reserveSubmitting}>
          {reserveSubmitting ? 'Submitting...' : 'Reserve'}
        </button>
      </div>

      {showProfileModal && (
        <div className="modalOverlay" onClick={() => setShowProfileModal(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <h3>Complete your profile</h3>
            <p>
              Your profile is missing required information. Please fill in your
              display name, city, bio, skills, and at least one experience before
              reserving a trip.
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
  )
}

export default BoatDetailPage
