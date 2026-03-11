import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { subscribeApplicantApprovedRequests, type BookingRequestRecord } from '../features/booking/bookingApi'
import { formatDateTime } from '../utils/formatters'

export function ApprovedRequestsDropdown() {
  const { viewer } = useAuth()
  const navigate = useNavigate()
  const [approved, setApproved] = useState<BookingRequestRecord[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!viewer?.uid) {
      setApproved([])
      return
    }
    return subscribeApplicantApprovedRequests(
      viewer.uid,
      setApproved,
      () => setApproved([]),
    )
  }, [viewer?.uid])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const target = e.target
      if (target instanceof Element && target.closest('.approvedRequestsWrap')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  if (!viewer || approved.length === 0) return null

  return (
    <div className="approvedRequestsWrap">
      <button
        type="button"
        className="iconBtn approvedRequestsBtn"
        onClick={() => setOpen(!open)}
        title="Your approved trips"
        aria-label={`${approved.length} approved trip(s)`}
      >
        ✓ Trips
        <span className="approvedRequestsBadge">{approved.length}</span>
      </button>
      {open && (
        <div className="approvedRequestsDropdown">
          <div className="approvedRequestsDropdownHeader">Your approved trips</div>
          <ul className="approvedRequestsList">
            {approved.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="approvedRequestItem"
                  onClick={() => {
                    setOpen(false)
                    navigate(`/boats/${r.boatId}`)
                  }}
                >
                  <span className="approvedRequestTitle">{r.boatTitle}</span>
                  <span className="approvedRequestMeta">
                    {formatDateTime(r.createdAt)} · Approved
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
