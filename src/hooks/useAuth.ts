import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth, googleProvider, isFirebaseReady } from '../lib/firebase'

export function useAuth() {
  const [viewer, setViewer] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(Boolean(auth && isFirebaseReady))
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!auth || !isFirebaseReady) {
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setViewer(nextUser)
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const loginWithGoogle = async () => {
    if (!auth || !isFirebaseReady || !googleProvider) {
      setAuthError('Please configure Firebase environment variables before Google sign-in.')
      return false
    }
    try {
      await signInWithPopup(auth, googleProvider)
      setAuthError('')
      return true
    } catch {
      setAuthError('Google sign-in failed. Please try again.')
      return false
    }
  }

  const signOutUser = async () => {
    if (!auth || !viewer) {
      return
    }
    try {
      await signOut(auth)
      setViewer(null)
      setAuthError('')
    } catch {
      setAuthError('Sign out failed. Please try again.')
    }
  }

  const userInitial =
    viewer?.displayName?.trim().charAt(0).toUpperCase() ||
    viewer?.email?.trim().charAt(0).toUpperCase() ||
    'U'

  return {
    viewer,
    authLoading,
    authError,
    setAuthError,
    loginWithGoogle,
    signOutUser,
    userInitial,
  }
}
