import { getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
}

const hasFirebaseConfig =
  typeof firebaseConfig.apiKey === 'string' &&
  firebaseConfig.apiKey.length > 0 &&
  typeof firebaseConfig.authDomain === 'string' &&
  firebaseConfig.authDomain.length > 0 &&
  typeof firebaseConfig.projectId === 'string' &&
  firebaseConfig.projectId.length > 0 &&
  typeof firebaseConfig.appId === 'string' &&
  firebaseConfig.appId.length > 0

const firebaseApp = hasFirebaseConfig
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null

export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const db = firebaseApp ? getFirestore(firebaseApp) : null
export const storage = firebaseApp ? getStorage(firebaseApp) : null

// Only create the Google provider if Firebase is properly configured.
export const googleProvider: GoogleAuthProvider | null = firebaseApp
  ? (() => {
      const p = new GoogleAuthProvider()
      p.setCustomParameters({ prompt: 'select_account' })
      return p
    })()
  : null

export const isFirebaseReady = Boolean(firebaseApp)
