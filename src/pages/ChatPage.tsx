import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { useNavigate, useParams } from 'react-router-dom'
import { auth, isFirebaseReady } from '../lib/firebase'
import { getUserPublicProfile } from '../features/users/usersApi'
import {
  type ChatMessage,
  type Conversation,
  sendMessage,
  subscribeToConversations,
  subscribeToMessages,
} from '../features/chat/chatApi'

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()

  const [viewer, setViewer] = useState<User | null>(null)
  const [viewerName, setViewerName] = useState('')
  const [viewerAvatar, setViewerAvatar] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string>(conversationId ?? '')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auth
  useEffect(() => {
    if (!auth || !isFirebaseReady) return
    return onAuthStateChanged(auth, async (u) => {
      setViewer(u)
      if (u) {
        const profile = await getUserPublicProfile(u.uid)
        setViewerName(profile?.displayName || u.displayName || u.email || 'Sailor')
        setViewerAvatar(profile?.avatarUrl || u.photoURL || '')
      }
    })
  }, [])

  // Subscribe to all conversations for this user
  useEffect(() => {
    if (!viewer) return
    return subscribeToConversations(viewer.uid, setConversations)
  }, [viewer])

  // When URL param changes, sync activeId
  useEffect(() => {
    if (conversationId) setActiveId(conversationId)
  }, [conversationId])

  // Subscribe to messages in active conversation
  useEffect(() => {
    if (!activeId) return
    setMessages([])
    return subscribeToMessages(activeId, setMessages)
  }, [activeId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const activeConvo = conversations.find((c) => c.id === activeId) ?? null

  const handleSelectConvo = (id: string) => {
    setActiveId(id)
    navigate(`/chat/${id}`, { replace: true })
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    if (!draft.trim() || !viewer || !activeId) return
    setSending(true)
    setSendError('')
    try {
      await sendMessage({
        conversationId: activeId,
        senderUid: viewer.uid,
        senderName: viewerName,
        senderAvatar: viewerAvatar,
        text: draft.trim(),
      })
      setDraft('')
      // reset textarea height
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch {
      setSendError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  if (!viewer) {
    return (
      <div className="chatPage">
        <div className="chatSignInPrompt">
          <p>Please sign in to access your messages.</p>
          <button className="ghostBtn" onClick={() => navigate('/')}>
            Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="chatPage">
      {/* ── Sidebar: conversation list ── */}
      <aside className="chatSidebar">
        <div className="chatSidebarHeader">
          <button className="ghostBtn chatBackBtn" onClick={() => navigate('/')}>
            ← Home
          </button>
          <h2 className="chatSidebarTitle">Messages</h2>
        </div>

        {conversations.length === 0 ? (
          <p className="chatEmpty">No conversations yet.</p>
        ) : (
          <ul className="chatConvoList">
            {conversations.map((convo) => {
              const isActive = convo.id === activeId
              const otherName =
                viewer.uid === convo.sailorUid ? convo.captainName : convo.sailorName
              const otherAvatar =
                viewer.uid === convo.sailorUid ? convo.captainAvatar : convo.sailorAvatar
              const hasUnread =
                convo.lastMessage.length > 0 && convo.lastSenderUid !== viewer.uid

              return (
                <li key={convo.id}>
                  <button
                    className={`chatConvoItem${isActive ? ' chatConvoActive' : ''}`}
                    onClick={() => handleSelectConvo(convo.id)}
                  >
                    <div className="chatConvoAvatar">
                      {otherAvatar ? (
                        <img src={otherAvatar} alt={otherName} />
                      ) : (
                        <div className="chatAvatarFallback">
                          {otherName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {hasUnread && <span className="chatUnreadDot" />}
                    </div>
                    <div className="chatConvoMeta">
                      <div className="chatConvoTop">
                        <span className="chatConvoName">{otherName}</span>
                        <span className="chatConvoTime">{timeAgo(convo.lastMessageAt)}</span>
                      </div>
                      <p className="chatConvoBoat">⛵ {convo.boatTitle}</p>
                      {convo.lastMessage && (
                        <p className={`chatConvoPreview${hasUnread ? ' chatConvoUnread' : ''}`}>
                          {convo.lastMessage}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      {/* ── Main: message thread ── */}
      <main className="chatMain">
        {!activeConvo ? (
          <div className="chatPlaceholder">
            <span className="chatPlaceholderIcon">💬</span>
            <p>Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="chatThreadHeader">
              <div className="chatThreadInfo">
                {(() => {
                  const otherName =
                    viewer.uid === activeConvo.sailorUid
                      ? activeConvo.captainName
                      : activeConvo.sailorName
                  const otherAvatar =
                    viewer.uid === activeConvo.sailorUid
                      ? activeConvo.captainAvatar
                      : activeConvo.sailorAvatar
                  const otherUid =
                    viewer.uid === activeConvo.sailorUid
                      ? activeConvo.captainUid
                      : activeConvo.sailorUid
                  return (
                    <>
                      {otherAvatar ? (
                        <img src={otherAvatar} alt={otherName} className="chatThreadAvatar" />
                      ) : (
                        <div className="chatAvatarFallback chatThreadAvatar">
                          {otherName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="chatThreadName">{otherName}</p>
                        <button
                          className="chatViewProfileLink"
                          onClick={() => navigate(`/hosts/${otherUid}`)}
                        >
                          View profile →
                        </button>
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="chatThreadBoat">
                <span>⛵</span>
                <button
                  className="chatBoatLink"
                  onClick={() => navigate(`/boats/${activeConvo.boatId}`)}
                >
                  {activeConvo.boatTitle}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="chatMessages">
              {messages.length === 0 ? (
                <p className="chatMessagesEmpty">
                  No messages yet — say hello!
                </p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderUid === viewer.uid
                  return (
                    <div
                      key={msg.id}
                      className={`chatBubbleRow${isMine ? ' chatBubbleMine' : ' chatBubbleTheirs'}`}
                    >
                      {!isMine && (
                        <div className="chatBubbleAvatar">
                          {msg.senderAvatar ? (
                            <img src={msg.senderAvatar} alt={msg.senderName} />
                          ) : (
                            <div className="chatAvatarFallback chatAvatarSmall">
                              {msg.senderName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="chatBubbleWrap">
                        <div className={`chatBubble${isMine ? ' chatBubbleSent' : ' chatBubbleReceived'}`}>
                          {msg.text}
                        </div>
                        <span className="chatBubbleTime">{timeAgo(msg.createdAt)}</span>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="chatComposer">
              {sendError && <p className="chatSendError">{sendError}</p>}
              <div className="chatComposerRow">
                <textarea
                  ref={textareaRef}
                  className="chatInput"
                  placeholder="Type a message… (Enter to send)"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    // auto-grow
                    e.target.style.height = 'auto'
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`
                  }}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  maxLength={1000}
                />
                <button
                  className="publishBtn chatSendBtn"
                  onClick={() => void handleSend()}
                  disabled={sending || !draft.trim()}
                >
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default ChatPage
