import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { useNavigate, useParams } from 'react-router-dom'
import { getBoatListingById, type BoatRecord } from '../features/boats/boatsApi'
import { getUserPublicProfile, type UserPublicProfile } from '../features/users/usersApi'
import { createBookingRequest, hasPendingBookingRequest } from '../features/booking/bookingApi'
import { auth, isFirebaseReady } from '../lib/firebase'

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
              setHostError('Host profile is temporarily unavailable.')
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
        setReserveNotice('Please complete your profile before booking a trip.')
        return
      }

      await createBookingRequest({
        boatId: boat.id,
        boatTitle: boat.title,
        boatCoverImage: boat.image,
        hostUid: boat.ownerUid,
        applicantUid: viewer.uid,
        applicantName: applicantProfile.displayName || viewer.displayName || viewer.email || 'Guest',
        applicantAvatar: applicantProfile.avatarUrl || viewer.photoURL || '',
      })
      setReserveNotice('Request sent.')
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
          <h2>Meet your host</h2>
          <div className="hostProfileHead hostProfileClickable" onClick={() => navigate(`/hosts/${boat.ownerUid}`)}>
            {hostProfile?.avatarUrl ? (
              <img src={hostProfile.avatarUrl} alt={hostProfile.displayName || boat.ownerName} />
            ) : (
              <div className="hostAvatarFallback">
                {(hostProfile?.displayName || boat.ownerName || 'H').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3>{hostProfile?.displayName || boat.ownerName || 'Host'}</h3>
              <p>{hostProfile?.city || 'Location not provided'}</p>
            </div>
          </div>
          <button className="ghostBtn hostProfileBtn" onClick={() => navigate(`/hosts/${boat.ownerUid}`)}>
            View full profile
          </button>
          <p>{hostProfile?.bio || 'This host has not added a public introduction yet.'}</p>
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
            <button className="ghostBtn compactActionBtn" onClick={() => navigate(`/map?highlight=${boat.id}`)}>
              Open map view
            </button>
          </div>
          {boat.coordinates && detailMapPreviewUrl ? (
            <button className="detailMapPreviewBtn" onClick={() => navigate(`/map?highlight=${boat.id}`)}>
              <img src={detailMapPreviewUrl} alt={`${boat.title} location map`} className="detailMapPreview" />
            </button>
          ) : (
            <div className="detailMapEmpty">
              <p>Map preview unavailable for this listing.</p>
              <button className="ghostBtn compactActionBtn" onClick={() => navigate('/map')}>
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
    </div>
  )
}

export default BoatDetailPage
