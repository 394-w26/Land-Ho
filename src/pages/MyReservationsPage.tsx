import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { subscribeApplicantAllRequests, type BookingRequestRecord } from '../features/booking/bookingApi'
import { Header, UserButton, MenuDropdown } from '../components/Header'

const formatDate = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(d)
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; css: string }> = {
  pending:  { label: 'Pending review',  emoji: '⏳', css: 'myres-badge--pending'  },
  approved: { label: 'Approved',        emoji: '✅', css: 'myres-badge--approved' },
  rejected: { label: 'Not accepted',    emoji: '❌', css: 'myres-badge--rejected' },
}

export default function MyReservationsPage() {
  const navigate = useNavigate()
  const { viewer, authLoading, userInitial } = useAuth()
  const [reservations, setReservations] = useState<BookingRequestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!viewer) { setLoading(false); return }
    setLoading(true)
    const unsub = subscribeApplicantAllRequests(
      viewer.uid,
      (data) => { setReservations(data); setLoading(false) },
      (msg)  => { setError(msg);         setLoading(false) },
    )
    return () => unsub()
  }, [viewer, authLoading])

  const pending  = reservations.filter(r => r.status === 'pending')
  const approved = reservations.filter(r => r.status === 'approved')
  const rejected = reservations.filter(r => r.status === 'rejected')

  const renderCard = (r: BookingRequestRecord) => {
    const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending
    return (
      <div key={r.id} className="myresCard">
        {r.boatCoverImage && (
          <img src={r.boatCoverImage} alt={r.boatTitle} className="myresCardImg" />
        )}
        <div className="myresCardBody">
          <p className="myresCardTitle">{r.boatTitle}</p>
          <span className={`myresBadge ${cfg.css}`}>
            {cfg.emoji} {cfg.label}
          </span>
          {r.createdAt && (
            <p className="myresCardDate">Requested {formatDate(r.createdAt)}</p>
          )}
          <button
            className="ghostBtn compactActionBtn"
            onClick={() => navigate(`/boats/${r.boatId}`)}
          >
            View listing →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="myresPage">
      <Header brandText="Land Ho">
        <UserButton
          viewer={viewer}
          authLoading={authLoading}
          resolvedAvatarUrl={viewer?.photoURL ?? ''}
          userInitial={userInitial}
          onClick={() => navigate('/', { state: { openProfile: true } })}
        />
        <MenuDropdown menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
          <button className="menuItem" onClick={() => { setMenuOpen(false); navigate('/') }}>
            ← Browse Sails
          </button>
        </MenuDropdown>
      </Header>

      <div className="myresContent">
        <div className="myresHeader">
          <button className="ghostBtn compactActionBtn" onClick={() => navigate('/')}>
            ← Back
          </button>
          <h2>My Sail Requests</h2>
        </div>

        {!viewer && !authLoading && (
          <p className="muted">Please sign in to view your reservations.</p>
        )}
        {loading && <p className="muted">Loading your requests...</p>}
        {error  && <p className="authNotice">{error}</p>}

        {!loading && !error && viewer && reservations.length === 0 && (
          <div className="myresEmpty">
            <p className="muted">You haven't requested any sails yet.</p>
            <button className="publishBtn" onClick={() => navigate('/')}>
              Browse sails
            </button>
          </div>
        )}

        {!loading && approved.length > 0 && (
          <section className="myresSection">
            <h3 className="myresSectionTitle">✅ Approved</h3>
            <div className="myresList">{approved.map(renderCard)}</div>
          </section>
        )}

        {!loading && pending.length > 0 && (
          <section className="myresSection">
            <h3 className="myresSectionTitle">⏳ Pending</h3>
            <div className="myresList">{pending.map(renderCard)}</div>
          </section>
        )}

        {!loading && rejected.length > 0 && (
          <section className="myresSection">
            <h3 className="myresSectionTitle">❌ Not accepted</h3>
            <div className="myresList">{rejected.map(renderCard)}</div>
          </section>
        )}
      </div>
    </div>
  )
}
