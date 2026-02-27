import { useNavigate } from 'react-router-dom'

interface FeedbackModalProps {
  title?: string
  message: string
  actionLabel?: string
  actionTo?: string
  onClose: () => void
}

export default function FeedbackModal({
  title = 'Done',
  message,
  actionLabel = 'Go to homepage',
  actionTo = '/',
  onClose,
}: FeedbackModalProps) {
  const navigate = useNavigate()

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modalActions">
          <button
            className="publishBtn"
            onClick={() => { onClose(); navigate(actionTo) }}
          >
            {actionLabel}
          </button>
          <button className="ghostBtn" onClick={onClose}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
