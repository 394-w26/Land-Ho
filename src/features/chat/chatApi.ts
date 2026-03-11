import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'

/* ─── Types ──────────────────────────────────────────── */

export interface ChatMessage {
  id: string
  senderUid: string
  senderName: string
  senderAvatar: string
  text: string
  createdAt: string // ISO
}

export interface Conversation {
  id: string
  participantUids: string[]       // always [sailorUid, captainUid] sorted
  sailorUid: string
  sailorName: string
  sailorAvatar: string
  captainUid: string
  captainName: string
  captainAvatar: string
  boatId: string
  boatTitle: string
  lastMessage: string
  lastMessageAt: string           // ISO
  lastSenderUid: string
  createdAt: string
}

/* ─── Helpers ────────────────────────────────────────── */

const toISO = (ts: unknown): string => {
  if (!ts) return new Date().toISOString()
  if (ts instanceof Timestamp) return ts.toDate().toISOString()
  if (typeof ts === 'string') return ts
  return new Date().toISOString()
}

/** Deterministic conversation id from two uids + boatId */
export const buildConversationId = (uidA: string, uidB: string, boatId: string): string => {
  const sorted = [uidA, uidB].sort()
  return `${sorted[0]}_${sorted[1]}_${boatId}`
}

/* ─── Get or create conversation ────────────────────── */

export interface StartConversationInput {
  sailorUid: string
  sailorName: string
  sailorAvatar: string
  captainUid: string
  captainName: string
  captainAvatar: string
  boatId: string
  boatTitle: string
}

export const getOrCreateConversation = async (
  input: StartConversationInput,
): Promise<string> => {
  if (!db) throw new Error('db-not-configured')

  const convoId = buildConversationId(input.sailorUid, input.captainUid, input.boatId)
  const convoRef = doc(db, 'conversations', convoId)

  await setDoc(
    convoRef,
    {
      participantUids: [input.sailorUid, input.captainUid].sort(),
      sailorUid: input.sailorUid,
      sailorName: input.sailorName,
      sailorAvatar: input.sailorAvatar,
      captainUid: input.captainUid,
      captainName: input.captainName,
      captainAvatar: input.captainAvatar,
      boatId: input.boatId,
      boatTitle: input.boatTitle,
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastSenderUid: '',
      createdAt: serverTimestamp(),
    },
    { merge: true }, // no-op if doc already exists (won't overwrite messages)
  )

  return convoId
}

/* ─── Send a message ─────────────────────────────────── */

export interface SendMessageInput {
  conversationId: string
  senderUid: string
  senderName: string
  senderAvatar: string
  text: string
}

export const sendMessage = async (input: SendMessageInput): Promise<void> => {
  if (!db) throw new Error('db-not-configured')

  const messagesRef = collection(db, 'conversations', input.conversationId, 'messages')
  await addDoc(messagesRef, {
    senderUid: input.senderUid,
    senderName: input.senderName,
    senderAvatar: input.senderAvatar,
    text: input.text.trim(),
    createdAt: serverTimestamp(),
  })

  // update conversation summary
  const convoRef = doc(db, 'conversations', input.conversationId)
  await setDoc(
    convoRef,
    {
      lastMessage: input.text.trim().slice(0, 100),
      lastMessageAt: serverTimestamp(),
      lastSenderUid: input.senderUid,
    },
    { merge: true },
  )
}

/* ─── Subscribe to messages in a conversation ───────── */

export const subscribeToMessages = (
  conversationId: string,
  onMessages: (messages: ChatMessage[]) => void,
): Unsubscribe => {
  if (!db) return () => {}

  const messagesRef = collection(db, 'conversations', conversationId, 'messages')
  const q = query(messagesRef, orderBy('createdAt', 'asc'))

  return onSnapshot(q, (snap) => {
    const msgs: ChatMessage[] = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        senderUid: data.senderUid as string,
        senderName: data.senderName as string,
        senderAvatar: data.senderAvatar as string,
        text: data.text as string,
        createdAt: toISO(data.createdAt),
      }
    })
    onMessages(msgs)
  })
}

/* ─── Subscribe to all conversations for a user ─────── */

export const subscribeToConversations = (
  uid: string,
  onConversations: (convos: Conversation[]) => void,
): Unsubscribe => {
  if (!db) return () => {}

  const ref = collection(db, 'conversations')
  const q = query(ref, where('participantUids', 'array-contains', uid))

  return onSnapshot(q, (snap) => {
    const convos: Conversation[] = snap.docs
      .map((d) => {
        const data = d.data()
        return {
          id: d.id,
          participantUids: data.participantUids as string[],
          sailorUid: data.sailorUid as string,
          sailorName: data.sailorName as string,
          sailorAvatar: data.sailorAvatar as string,
          captainUid: data.captainUid as string,
          captainName: data.captainName as string,
          captainAvatar: data.captainAvatar as string,
          boatId: data.boatId as string,
          boatTitle: data.boatTitle as string,
          lastMessage: data.lastMessage as string,
          lastMessageAt: toISO(data.lastMessageAt),
          lastSenderUid: data.lastSenderUid as string,
          createdAt: toISO(data.createdAt),
        }
      })
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

    onConversations(convos)
  })
}

/* ─── Get latest message preview (for notification badge) ── */

export const getUnreadCount = async (uid: string): Promise<number> => {
  if (!db) return 0
  const ref = collection(db, 'conversations')
  const q = query(ref, where('participantUids', 'array-contains', uid), limit(50))
  const snap = await getDocs(q)
  // Count convos where last message was NOT sent by current user
  return snap.docs.filter((d) => {
    const data = d.data()
    return (data.lastMessage as string).length > 0 && data.lastSenderUid !== uid
  }).length
}
