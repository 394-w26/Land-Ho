import { useEffect, useRef, useMemo, useState, type ChangeEvent } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox'
import './App.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import { auth, db, googleProvider, isFirebaseReady } from './lib/firebase'
import { uploadImageToStorage } from './lib/storage'
import {
  createBoatListing,
  deleteBoatListing,
  subscribePublishedBoats,
  type BoatCategory as CloudBoatCategory,
  type BoatCoordinates,
  updateBoatListing,
} from './features/boats/boatsApi'
import {
  subscribeHostRequestsByBoat,
  updateBookingRequestStatus,
  type BookingRequestRecord,
} from './features/booking/bookingApi'
import {
  reverseLookupLocation,
  searchLocationSuggestions,
  type LocationSuggestion,
} from './features/location/mapboxGeocode'
import { upsertUserPublicProfile } from './features/users/usersApi'
import BoatDetailPage from './pages/BoatDetailPage'
import HostResumePage from './pages/HostResumePage'
import CaptainSetupPage from './pages/CaptainSetupPage'
import SailorSetupPage from './pages/SailorSetupPage'
import MapExplorePage from './pages/MapExplorePage'

type BoatCategory = 'all' | CloudBoatCategory

interface BoatCard {
  id: string
  title: string
  location: string
  coordinates: BoatCoordinates | null
  price: number
  rating: number
  seats: number
  captain: string
  date: string
  category: Exclude<BoatCategory, 'all'>
  image: string
  images: string[]
  ownerUid: string
  ownerName: string
}

type AppView = 'market' | 'profile'
type ProfileSection = 'basic' | 'skills' | 'experiences' | 'certificates'

interface ExperienceItem {
  id: string
  title: string
  organization: string
  start: string
  end: string
  description: string
}

interface CertificateItem {
  id: string
  name: string
  issuer: string
  year: string
}

interface ProfileDraft {
  displayName: string
  city: string
  bio: string
  avatarUrl: string
  skills: string[]
  experiences: ExperienceItem[]
  certificates: CertificateItem[]
}

const profileStorageKey = 'land-ho-profile-draft'
const maxBoatImages = 6
const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined

const defaultProfileDraft: ProfileDraft = {
  displayName: '',
  city: '',
  bio: '',
  avatarUrl: '',
  skills: [],
  experiences: [],
  certificates: [],
}

const loadStoredProfileDraft = (): ProfileDraft => {
  try {
    const raw = window.localStorage.getItem(profileStorageKey)
    if (!raw) {
      return defaultProfileDraft
    }
    const parsed = JSON.parse(raw) as Partial<ProfileDraft>
    return {
      displayName: parsed.displayName ?? '',
      city: parsed.city ?? '',
      bio: parsed.bio ?? '',
      avatarUrl: parsed.avatarUrl ?? '',
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experiences: Array.isArray(parsed.experiences) ? parsed.experiences : [],
      certificates: Array.isArray(parsed.certificates) ? parsed.certificates : [],
    }
  } catch {
    return defaultProfileDraft
  }
}

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

const formatDateTime = (isoText: string): string => {
  if (!isoText) {
    return 'Just now'
  }
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) {
    return isoText
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const locationCoordinatesLookup: Record<string, BoatCoordinates> = {
  'Sanya Bay': { lat: 18.2528, lng: 109.5119 },
  'Xiamen Wuyuan Bay': { lat: 24.5096, lng: 118.1881 },
  'Qingdao Olympic Sailing Center': { lat: 36.0604, lng: 120.3755 },
  'Zhoushan Islands': { lat: 29.9853, lng: 122.2072 },
  'Shenzhen Dapeng': { lat: 22.5954, lng: 114.5422 },
  'Beihai Silver Beach': { lat: 21.4171, lng: 109.1512 },
}

const defaultCoordinates: BoatCoordinates = { lat: 24.4798, lng: 118.0894 }

const findCoordinatesForLocation = (locationText: string): BoatCoordinates => {
  const trimmed = locationText.trim()
  if (trimmed.length === 0) {
    return defaultCoordinates
  }
  return locationCoordinatesLookup[trimmed] ?? defaultCoordinates
}

const initialBoatData: BoatCard[] = [
  {
    id: 'b1',
    title: 'Sea Breeze Sunset Cruise',
    location: 'Sanya Bay',
    coordinates: { lat: 18.2528, lng: 109.5119 },
    price: 699,
    rating: 4.92,
    seats: 4,
    captain: 'Captain Maya',
    date: 'This Saturday',
    category: 'sunset',
    image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80'],
    ownerUid: 'seed-demo',
    ownerName: 'Captain Maya',
  },
  {
    id: 'b2',
    title: 'Voyager Coastal Day Trip',
    location: 'Xiamen Wuyuan Bay',
    coordinates: { lat: 24.5096, lng: 118.1881 },
    price: 880,
    rating: 4.87,
    seats: 6,
    captain: 'Captain Lin',
    date: 'This Sunday',
    category: 'dayTrip',
    image: 'https://images.unsplash.com/photo-1528150177508-7cc0c36cda5c?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1528150177508-7cc0c36cda5c?auto=format&fit=crop&w=1200&q=80'],
    ownerUid: 'seed-demo',
    ownerName: 'Captain Lin',
  },
  {
    id: 'b3',
    title: 'Dolphin Sailing Training Camp',
    location: 'Qingdao Olympic Sailing Center',
    coordinates: { lat: 36.0604, lng: 120.3755 },
    price: 520,
    rating: 4.95,
    seats: 8,
    captain: 'Captain Zhao',
    date: 'Next Tuesday',
    category: 'training',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'],
    ownerUid: 'seed-demo',
    ownerName: 'Captain Zhao',
  },
  {
    id: 'b4',
    title: 'Azure Islands Hopping Route',
    location: 'Zhoushan Islands',
    coordinates: { lat: 29.9853, lng: 122.2072 },
    price: 1280,
    rating: 4.9,
    seats: 5,
    captain: 'Captain Wen',
    date: 'Next Weekend',
    category: 'island',
    image: 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=80'],
    ownerUid: 'seed-demo',
    ownerName: 'Captain Wen',
  },
  {
    id: 'b5',
    title: 'Lumen City Coastline',
    location: 'Shenzhen Dapeng',
    coordinates: { lat: 22.5954, lng: 114.5422 },
    price: 760,
    rating: 4.84,
    seats: 4,
    captain: 'Captain Chen',
    date: 'Friday',
    category: 'dayTrip',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80'],
    ownerUid: 'seed-demo',
    ownerName: 'Captain Chen',
  },
  {
    id: 'b6',
    title: 'Wavecrest Golden Hour Cruise',
    location: 'Beihai Silver Beach',
    coordinates: { lat: 21.4171, lng: 109.1512 },
    price: 640,
    rating: 4.91,
    seats: 3,
    captain: 'Captain He',
    date: 'This Saturday',
    category: 'sunset',
    image: 'https://images.unsplash.com/photo-1444676632488-26a136c45b9b?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1444676632488-26a136c45b9b?auto=format&fit=crop&w=1200&q=80'],
    ownerUid: 'seed-demo',
    ownerName: 'Captain He',
  },
]

function MarketplacePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'guest' | 'host'>('guest')
  const [appView, setAppView] = useState<AppView>('market')
  const [profileSection, setProfileSection] = useState<ProfileSection>('basic')
  const [viewer, setViewer] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(Boolean(auth && isFirebaseReady))
  const [authError, setAuthError] = useState('')
  const [profileNotice, setProfileNotice] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [boatImageUploading, setBoatImageUploading] = useState(false)
  const [deletingBoatId, setDeletingBoatId] = useState('')
  const [editingBoatId, setEditingBoatId] = useState('')
  const [draggingImageIndex, setDraggingImageIndex] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hostNotice, setHostNotice] = useState('')
  const [activeRequestBoatId, setActiveRequestBoatId] = useState('')
  const [activeBoatRequests, setActiveBoatRequests] = useState<BookingRequestRecord[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState('')
  const [requestActionId, setRequestActionId] = useState('')
  const [boats, setBoats] = useState<BoatCard[]>([])
  const [boatsLoading, setBoatsLoading] = useState(true)
  const [boatsError, setBoatsError] = useState('')
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => loadStoredProfileDraft())
  const [skillInput, setSkillInput] = useState('')
  const [category, setCategory] = useState<BoatCategory>('all')
  const [searchText, setSearchText] = useState('')
  const [seatFilter, setSeatFilter] = useState('')
  const [form, setForm] = useState({
    title: '',
    location: '',
    price: '699',
    seats: '4',
    captain: '',
    date: '',
    category: 'dayTrip' as Exclude<BoatCategory, 'all'>,
    images: [] as string[],
  })
  const hostMapRef = useRef<MapRef | null>(null)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationCandidates, setLocationCandidates] = useState<LocationSuggestion[]>([])
  const [locationSearching, setLocationSearching] = useState(false)
  const [locationLookupError, setLocationLookupError] = useState('')
  const [locationMapError, setLocationMapError] = useState('')
  const [selectedCoordinates, setSelectedCoordinates] = useState<BoatCoordinates | null>(null)
  const [selectedAddress, setSelectedAddress] = useState('')

  const categories: { key: BoatCategory; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '⛵' },
    { key: 'dayTrip', label: 'Day Trips', icon: '🌊' },
    { key: 'sunset', label: 'Sunset Cruises', icon: '🌇' },
    { key: 'training', label: 'Training', icon: '🧭' },
    { key: 'island', label: 'Island Hops', icon: '🏝️' },
  ]

  const filteredBoats = useMemo(() => {
    return boats.filter((boat) => {
      const byCategory = category === 'all' || boat.category === category
      const bySearch =
        searchText.trim().length === 0 ||
        boat.title.includes(searchText) ||
        boat.location.includes(searchText)
      const seats = Number(seatFilter || 0)
      const bySeats = seats === 0 || boat.seats >= seats
      return byCategory && bySearch && bySeats
    })
  }, [boats, category, searchText, seatFilter])

  const hostBoats = useMemo(() => {
    if (!viewer) {
      return []
    }
    return boats.filter((item) => item.ownerUid === viewer.uid)
  }, [boats, viewer])

  const hostPickerCenter = useMemo(() => {
    if (selectedCoordinates) {
      return selectedCoordinates
    }
    if (form.location.trim().length > 0) {
      return findCoordinatesForLocation(form.location)
    }
    return defaultCoordinates
  }, [selectedCoordinates, form.location])

  useEffect(() => {
    if (!auth || !isFirebaseReady) {
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setViewer(nextUser)
      if (nextUser) {
        setProfileDraft((prev) => {
          const nextDisplayName = prev.displayName || nextUser.displayName || ''
          const nextAvatarUrl = prev.avatarUrl || nextUser.photoURL || ''
          if (nextDisplayName === prev.displayName && nextAvatarUrl === prev.avatarUrl) {
            return prev
          }
          const next = { ...prev, displayName: nextDisplayName, avatarUrl: nextAvatarUrl }
          window.localStorage.setItem(profileStorageKey, JSON.stringify(next))
          return next
        })
      }
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const routeState = location.state as { initialMode?: 'guest' | 'host' } | null
    if (routeState?.initialMode === 'host') {
      setMode('host')
      setAppView('market')
    }
  }, [location.state])

  useEffect(() => {
    if (!db || !isFirebaseReady) {
      setBoats(initialBoatData)
      setBoatsLoading(false)
      return
    }
    const unsubscribe = subscribePublishedBoats(
      (nextBoats) => {
        setBoats(nextBoats)
        setBoatsLoading(false)
        setBoatsError('')
      },
      (message) => {
        setBoatsLoading(false)
        setBoatsError(message)
      },
    )
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!menuOpen) {
      return
    }
    const handleOutsideClick = (event: MouseEvent) => {
      const clickTarget = event.target
      if (clickTarget instanceof Element && clickTarget.closest('.menuWrap')) {
        return
      }
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  useEffect(() => {
    if (!activeRequestBoatId || !viewer) {
      setActiveBoatRequests([])
      setRequestsLoading(false)
      setRequestsError('')
      return
    }
    setRequestsLoading(true)
    setRequestsError('')
    const unsubscribe = subscribeHostRequestsByBoat(
      activeRequestBoatId,
      viewer.uid,
      (requests) => {
        setActiveBoatRequests(requests)
        setRequestsLoading(false)
      },
      (message) => {
        setRequestsLoading(false)
        setRequestsError(message)
      },
    )
    return () => unsubscribe()
  }, [activeRequestBoatId, viewer])

  const loginWithGoogle = async () => {
    if (!auth || !isFirebaseReady) {
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

  const handleSignOut = async () => {
    if (!auth || !viewer) {
      setMenuOpen(false)
      return
    }
    try {
      await signOut(auth)
      setViewer(null)
      setMode('guest')
      setAppView('market')
      setHostNotice('')
      setProfileNotice('')
      setAuthError('')
    } catch {
      setAuthError('Sign out failed. Please try again.')
    } finally {
      setMenuOpen(false)
    }
  }

  const handleHostModeClick = async () => {
    if (viewer) {
      setMode('host')
      setAppView('market')
      return
    }
    const success = await loginWithGoogle()
    if (success) {
      setMode('host')
      setAppView('market')
    }
  }

  const openProfileEditor = async () => {
    if (viewer) {
      setAppView('profile')
      setProfileSection('basic')
      return
    }
    const success = await loginWithGoogle()
    if (success) {
      setAppView('profile')
      setProfileSection('basic')
    }
  }

  const userInitial =
    viewer?.displayName?.trim().charAt(0).toUpperCase() ||
    viewer?.email?.trim().charAt(0).toUpperCase() ||
    'U'
  const draftAvatar = profileDraft.avatarUrl.trim()
  const googleAvatar = viewer?.photoURL?.trim() || ''
  const resolvedAvatarUrl = viewer ? draftAvatar || googleAvatar : ''

  const completionChecks = useMemo(() => {
    return [
      { key: 'name', ok: profileDraft.displayName.trim().length >= 2, label: 'Display name must be at least 2 characters' },
      { key: 'city', ok: profileDraft.city.trim().length > 0, label: 'Add your city' },
      { key: 'bio', ok: profileDraft.bio.trim().length >= 30, label: 'Bio must be at least 30 characters' },
      { key: 'skills', ok: profileDraft.skills.length >= 2, label: 'Add at least 2 skills' },
      { key: 'experiences', ok: profileDraft.experiences.length >= 1, label: 'Add at least 1 experience' },
    ]
  }, [profileDraft])

  const completedCount = completionChecks.filter((item) => item.ok).length
  const completionPercent = Math.round((completedCount / completionChecks.length) * 100)
  const missingItems = completionChecks.filter((item) => !item.ok).map((item) => item.label)
  const resumeCompleted = missingItems.length === 0

  const updateProfileDraft = (updater: (prev: ProfileDraft) => ProfileDraft) => {
    setProfileDraft((prev) => {
      const next = updater(prev)
      window.localStorage.setItem(profileStorageKey, JSON.stringify(next))
      return next
    })
  }

  const addSkill = () => {
    const nextSkill = skillInput.trim()
    if (!nextSkill || profileDraft.skills.includes(nextSkill)) {
      return
    }
    updateProfileDraft((prev) => ({ ...prev, skills: [...prev.skills, nextSkill] }))
    setSkillInput('')
  }

  const removeSkill = (skill: string) => {
    updateProfileDraft((prev) => ({ ...prev, skills: prev.skills.filter((item) => item !== skill) }))
  }

  const addExperience = () => {
    updateProfileDraft((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        {
          id: `exp-${Date.now()}`,
          title: '',
          organization: '',
          start: '',
          end: '',
          description: '',
        },
      ],
    }))
  }

  const updateExperience = (id: string, field: keyof Omit<ExperienceItem, 'id'>, value: string) => {
    updateProfileDraft((prev) => ({
      ...prev,
      experiences: prev.experiences.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
  }

  const removeExperience = (id: string) => {
    updateProfileDraft((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((item) => item.id !== id),
    }))
  }

  const addCertificate = () => {
    updateProfileDraft((prev) => ({
      ...prev,
      certificates: [...prev.certificates, { id: `cert-${Date.now()}`, name: '', issuer: '', year: '' }],
    }))
  }

  const updateCertificate = (id: string, field: keyof Omit<CertificateItem, 'id'>, value: string) => {
    updateProfileDraft((prev) => ({
      ...prev,
      certificates: prev.certificates.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const removeCertificate = (id: string) => {
    updateProfileDraft((prev) => ({
      ...prev,
      certificates: prev.certificates.filter((item) => item.id !== id),
    }))
  }

  const saveProfile = async () => {
    window.localStorage.setItem(profileStorageKey, JSON.stringify(profileDraft))
    if (viewer) {
      try {
        await upsertUserPublicProfile({
          uid: viewer.uid,
          displayName: profileDraft.displayName || viewer.displayName || viewer.email || 'Host',
          avatarUrl: resolvedAvatarUrl,
          city: profileDraft.city,
          bio: profileDraft.bio,
          skills: profileDraft.skills,
          experiences: profileDraft.experiences,
          certificates: profileDraft.certificates,
        })
      } catch {
        setProfileNotice('Local draft saved, but syncing public profile failed.')
        return
      }
    }
    setProfileNotice('Profile draft saved.')
  }

  const saveAndFinishProfile = async () => {
    await saveProfile()
    if (!resumeCompleted) {
      setProfileNotice(`${missingItems.length} item(s) remaining: ${missingItems.join(', ')}`)
      return
    }
    setProfileNotice('Profile completed. You can now book and publish boats.')
  }

  const getUploadErrorText = (error: unknown) => {
    if (!(error instanceof Error)) {
      return 'Upload failed. Please try again.'
    }
    if (error.message === 'storage-not-configured') {
      return 'Firebase Storage is not configured. Please set your storage bucket first.'
    }
    if (error.message === 'invalid-type') {
      return 'Only image files are supported (jpg/png/webp, etc.).'
    }
    if (error.message === 'file-too-large') {
      return 'Image size must be 5MB or less.'
    }
    return 'Upload failed. Please try again.'
  }

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    if (!viewer) {
      setProfileNotice('Please sign in before uploading an avatar.')
      return
    }
    setAvatarUploading(true)
    setProfileNotice('Uploading avatar...')
    try {
      const uploadedUrl = await uploadImageToStorage(`avatars/${viewer.uid}`, file)
      updateProfileDraft((prev) => ({ ...prev, avatarUrl: uploadedUrl }))
      setProfileNotice('Avatar uploaded successfully.')
    } catch (error) {
      setProfileNotice(getUploadErrorText(error))
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleBoatImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) {
      return
    }
    if (!viewer) {
      setHostNotice('Please sign in before uploading boat images.')
      return
    }
    if (!resumeCompleted) {
      setHostNotice('Please complete your profile before publishing a boat.')
      return
    }
    const remainingSlots = maxBoatImages - form.images.length
    if (remainingSlots <= 0) {
      setHostNotice(`You can upload up to ${maxBoatImages} images.`)
      return
    }
    const uploadFiles = files.slice(0, remainingSlots)
    if (uploadFiles.length < files.length) {
      setHostNotice(`Only ${maxBoatImages} images are allowed. Extra files were skipped.`)
    }
    setBoatImageUploading(true)
    setHostNotice(`Uploading ${uploadFiles.length} boat image(s)...`)
    try {
      const uploadedUrls = await Promise.all(
        uploadFiles.map((file) => uploadImageToStorage(`boats/${viewer.uid}`, file)),
      )
      setForm((prev) => ({ ...prev, images: [...prev.images, ...uploadedUrls] }))
      setHostNotice('Boat image(s) uploaded successfully. Drag to reorder cover image.')
    } catch (error) {
      setHostNotice(getUploadErrorText(error))
    } finally {
      setBoatImageUploading(false)
    }
  }

  const applySelectedLocation = (next: LocationSuggestion) => {
    setForm((prev) => ({ ...prev, location: next.placeName }))
    setLocationQuery(next.placeName)
    setLocationCandidates([])
    setSelectedCoordinates(next.coordinates)
    setSelectedAddress(next.placeName)
    setLocationLookupError('')
    hostMapRef.current?.flyTo({
      center: [next.coordinates.lng, next.coordinates.lat],
      zoom: 11,
      duration: 500,
    })
  }

  const searchLocations = async () => {
    const queryText = locationQuery.trim()
    if (queryText.length < 2) {
      setLocationCandidates([])
      setLocationLookupError('Please enter at least 2 characters to search location.')
      return
    }
    if (!mapboxToken) {
      setLocationLookupError('Mapbox token is missing. Add VITE_MAPBOX_ACCESS_TOKEN to continue.')
      return
    }
    setLocationSearching(true)
    setLocationLookupError('')
    try {
      const suggestions = await searchLocationSuggestions(queryText, mapboxToken)
      setLocationCandidates(suggestions)
      if (suggestions.length === 0) {
        setLocationLookupError('No matching location found. Try another keyword.')
      }
    } catch {
      setLocationLookupError('Location search failed. Please try again.')
    } finally {
      setLocationSearching(false)
    }
  }

  const syncAddressFromCoordinates = async (coordinates: BoatCoordinates) => {
    if (!mapboxToken) {
      return
    }
    try {
      const addressText = await reverseLookupLocation(coordinates, mapboxToken)
      if (!addressText) {
        return
      }
      setForm((prev) => ({ ...prev, location: addressText }))
      setLocationQuery(addressText)
      setSelectedAddress(addressText)
    } catch {
      // Keep the selected coordinates if reverse lookup fails.
    }
  }

  const handlePickerMarkerDragEnd = (event: { lngLat: { lng: number; lat: number } }) => {
    const nextCoordinates: BoatCoordinates = {
      lng: event.lngLat.lng,
      lat: event.lngLat.lat,
    }
    setSelectedCoordinates(nextCoordinates)
    setLocationLookupError('')
    void syncAddressFromCoordinates(nextCoordinates)
  }

  const publishBoat = async () => {
    if (!viewer) {
      setHostNotice('Please sign in before publishing a boat.')
      return
    }
    if (!resumeCompleted) {
      setHostNotice('Please complete your profile before publishing a boat.')
      return
    }
    if (!form.title || !form.location || !form.captain) {
      setHostNotice('Please complete all trip details.')
      return
    }
    if (form.images.length === 0) {
      setHostNotice('Please upload at least one real boat image.')
      return
    }
    const resolvedCoordinates = selectedCoordinates ?? findCoordinatesForLocation(form.location)
    if (!selectedCoordinates) {
      setHostNotice('Please search and confirm a map location before publishing.')
      return
    }
    setHostNotice(editingBoatId ? 'Updating listing...' : 'Publishing...')
    try {
      if (editingBoatId) {
        await updateBoatListing(editingBoatId, {
          title: form.title,
          location: form.location,
          coordinates: resolvedCoordinates,
          price: Number(form.price) || 0,
          seats: Number(form.seats) || 1,
          captain: form.captain || viewer.displayName || 'Captain',
          date: form.date,
          category: form.category,
          image: form.images[0],
          images: form.images,
        })
        setEditingBoatId('')
        setHostNotice('Listing updated successfully.')
      } else {
        const nextBoatId = await createBoatListing({
          title: form.title,
          location: form.location,
          coordinates: resolvedCoordinates,
          price: Number(form.price) || 0,
          seats: Number(form.seats) || 1,
          captain: form.captain || viewer.displayName || 'Captain',
          date: form.date,
          category: form.category,
          image: form.images[0],
          images: form.images,
          ownerUid: viewer.uid,
          ownerName: viewer.displayName || viewer.email || 'Host',
        })
        navigate(`/map?highlight=${nextBoatId}`)
      }
      setForm({
        title: '',
        location: '',
        price: '699',
        seats: '4',
        captain: form.captain || viewer.displayName || '',
        date: '',
        category: 'dayTrip',
        images: [],
      })
      setLocationQuery('')
      setLocationCandidates([])
      setSelectedCoordinates(null)
      setSelectedAddress('')
      if (!editingBoatId) {
        setHostNotice('Published successfully.')
        setMode('guest')
      }
    } catch {
      setHostNotice(
        editingBoatId
          ? 'Update failed. Check Firestore permissions and retry.'
          : 'Publishing failed. Check Firestore permissions and retry.',
      )
    }
  }

  const startEditBoat = (boat: BoatCard) => {
    setEditingBoatId(boat.id)
    setForm({
      title: boat.title,
      location: boat.location,
      price: String(boat.price),
      seats: String(boat.seats),
      captain: boat.captain,
      date: /^\d{4}-\d{2}-\d{2}$/.test(boat.date) ? boat.date : '',
      category: boat.category,
      images: boat.images.length > 0 ? boat.images : [boat.image],
    })
    const fallbackCoordinates = findCoordinatesForLocation(boat.location)
    const nextCoordinates = boat.coordinates ?? fallbackCoordinates
    setSelectedCoordinates(nextCoordinates)
    setSelectedAddress(boat.location)
    setLocationQuery(boat.location)
    setLocationCandidates([])
    setLocationLookupError('')
    hostMapRef.current?.flyTo({
      center: [nextCoordinates.lng, nextCoordinates.lat],
      zoom: 11,
      duration: 400,
    })
    setHostNotice('Editing mode enabled. Update fields and save.')
  }

  const cancelEditBoat = () => {
    setEditingBoatId('')
    setForm({
      title: '',
      location: '',
      price: '699',
      seats: '4',
      captain: viewer?.displayName || '',
      date: '',
      category: 'dayTrip',
      images: [],
    })
    setLocationQuery('')
    setLocationCandidates([])
    setSelectedCoordinates(null)
    setSelectedAddress('')
    setLocationLookupError('')
    setHostNotice('Edit cancelled.')
  }

  const removeFormImageAt = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, itemIndex) => itemIndex !== index),
    }))
    setHostNotice('Image removed.')
  }

  const moveFormImage = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return
    }
    setForm((prev) => {
      const next = [...prev.images]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return { ...prev, images: next }
    })
  }

  const removeBoat = async (boatId: string) => {
    if (!viewer) {
      setHostNotice('Please sign in before deleting a listing.')
      return
    }
    setDeletingBoatId(boatId)
    setHostNotice('Deleting listing...')
    try {
      await deleteBoatListing(boatId)
      setHostNotice('Listing deleted.')
    } catch {
      setHostNotice('Delete failed. Check Firestore permissions and retry.')
    } finally {
      setDeletingBoatId('')
    }
  }

  const toggleBoatRequests = (boatId: string) => {
    if (activeRequestBoatId === boatId) {
      setActiveRequestBoatId('')
      return
    }
    setActiveRequestBoatId(boatId)
  }

  const handleBookingDecision = async (requestId: string, status: 'approved' | 'rejected') => {
    setRequestActionId(requestId)
    setHostNotice(status === 'approved' ? 'Approving request...' : 'Rejecting request...')
    try {
      await updateBookingRequestStatus(requestId, status)
      setHostNotice(status === 'approved' ? 'Request approved.' : 'Request rejected.')
    } catch (error) {
      if (error instanceof Error && error.message) {
        setHostNotice(error.message)
      } else {
        setHostNotice('Failed to update request status. Please try again.')
      }
    } finally {
      setRequestActionId('')
    }
  }

  const openApplicantProfile = (request: BookingRequestRecord) => {
    const applicantUid = request.applicantUid.trim()
    if (!applicantUid) {
      setHostNotice('Applicant profile is unavailable for this request.')
      return
    }
    navigate(`/hosts/${applicantUid}`, { state: { returnToHost: true } })
  }

  if (appView === 'profile') {
    return (
      <div className="profilePage">
        <header className="topBar">
          <div className="brand">
            <img className="brandLogo" src="/logo.png" alt="Land Ho logo" />
            <span>Land Ho</span>
          </div>
          <div className="topActions">
            <button className="ghostBtn" onClick={() => setAppView('market')}>
              Back to home
            </button>
            <div className="progressBadge">{completionPercent}% complete</div>
          </div>
        </header>

        <section className="profileLayout">
          <aside className="profileNavCard">
            <h3>Personal Resume</h3>
            <button
              className={profileSection === 'basic' ? 'profileNavBtn active' : 'profileNavBtn'}
              onClick={() => setProfileSection('basic')}
            >
              Basic Info
            </button>
            <button
              className={profileSection === 'skills' ? 'profileNavBtn active' : 'profileNavBtn'}
              onClick={() => setProfileSection('skills')}
            >
              Skills
            </button>
            <button
              className={profileSection === 'experiences' ? 'profileNavBtn active' : 'profileNavBtn'}
              onClick={() => setProfileSection('experiences')}
            >
              Experience
            </button>
            <button
              className={profileSection === 'certificates' ? 'profileNavBtn active' : 'profileNavBtn'}
              onClick={() => setProfileSection('certificates')}
            >
              Certificates
            </button>
            <div className="profileChecklist">
              <h4>Pending</h4>
              {missingItems.length === 0 ? (
                <p className="muted">All required items are completed</p>
              ) : (
                missingItems.map((item) => <p key={item}>- {item}</p>)
              )}
            </div>
          </aside>

          <div className="profileEditorCard">
            {profileSection === 'basic' && (
              <>
                <h3>Basic Info</h3>
                <div className="profileAvatarWrap">
                  {resolvedAvatarUrl ? (
                    <img src={resolvedAvatarUrl} alt="Avatar" className="profileAvatar" />
                  ) : (
                    <div className="profileAvatar profileAvatarFallback">{userInitial}</div>
                  )}
                </div>
                <div className="formRow">
                  <label>Upload Real Avatar</label>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} />
                  {avatarUploading && <small className="hintText">Uploading avatar, please wait...</small>}
                </div>
                <div className="formRow">
                  <label>Display Name</label>
                  <input
                    value={profileDraft.displayName}
                    onChange={(e) =>
                      updateProfileDraft((prev) => ({ ...prev, displayName: e.target.value }))
                    }
                    placeholder="Enter your display name"
                  />
                </div>
                <div className="formRow">
                  <label>City</label>
                  <input
                    value={profileDraft.city}
                    onChange={(e) => updateProfileDraft((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="e.g. Shanghai"
                  />
                </div>
                <div className="formRow">
                  <label>Bio</label>
                  <textarea
                    value={profileDraft.bio}
                    onChange={(e) => updateProfileDraft((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Share your sailing experience, interests, and what you can offer"
                    rows={5}
                  />
                </div>
              </>
            )}

            {profileSection === 'skills' && (
              <>
                <h3>Skills</h3>
                <div className="skillComposer">
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="e.g. Chart navigation"
                  />
                  <button onClick={addSkill}>Add Skill</button>
                </div>
                <div className="tagList">
                  {profileDraft.skills.map((skill) => (
                    <button key={skill} className="tagItem" onClick={() => removeSkill(skill)}>
                      {skill} ×
                    </button>
                  ))}
                </div>
              </>
            )}

            {profileSection === 'experiences' && (
              <>
                <h3>Experience</h3>
                <button className="ghostBtn" onClick={addExperience}>
                  Add Experience
                </button>
                <div className="stackList">
                  {profileDraft.experiences.map((item) => (
                    <div className="stackCard" key={item.id}>
                      <div className="formRow split">
                        <div>
                          <label>Title</label>
                          <input
                            value={item.title}
                            onChange={(e) => updateExperience(item.id, 'title', e.target.value)}
                          />
                        </div>
                        <div>
                          <label>Organization</label>
                          <input
                            value={item.organization}
                            onChange={(e) => updateExperience(item.id, 'organization', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="formRow split">
                        <div>
                          <label>Start</label>
                          <input
                            value={item.start}
                            onChange={(e) => updateExperience(item.id, 'start', e.target.value)}
                            placeholder="2025-05"
                          />
                        </div>
                        <div>
                          <label>End</label>
                          <input
                            value={item.end}
                            onChange={(e) => updateExperience(item.id, 'end', e.target.value)}
                            placeholder="Present"
                          />
                        </div>
                      </div>
                      <div className="formRow">
                        <label>Description</label>
                        <textarea
                          value={item.description}
                          onChange={(e) => updateExperience(item.id, 'description', e.target.value)}
                          rows={3}
                        />
                      </div>
                      <button className="dangerBtn" onClick={() => removeExperience(item.id)}>
                        Remove Experience
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {profileSection === 'certificates' && (
              <>
                <h3>Certificates</h3>
                <button className="ghostBtn" onClick={addCertificate}>
                  Add Certificate
                </button>
                <div className="stackList">
                  {profileDraft.certificates.map((item) => (
                    <div className="stackCard" key={item.id}>
                      <div className="formRow split">
                        <div>
                          <label>Certificate Name</label>
                          <input
                            value={item.name}
                            onChange={(e) => updateCertificate(item.id, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label>Issuer</label>
                          <input
                            value={item.issuer}
                            onChange={(e) => updateCertificate(item.id, 'issuer', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="formRow">
                        <label>Year</label>
                        <input
                          value={item.year}
                          onChange={(e) => updateCertificate(item.id, 'year', e.target.value)}
                          placeholder="2026"
                        />
                      </div>
                      <button className="dangerBtn" onClick={() => removeCertificate(item.id)}>
                        Remove Certificate
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="actionBar">
              <button className="ghostBtn" onClick={() => void saveProfile()}>
                Save Draft
              </button>
              <button className="publishBtn" onClick={() => void saveAndFinishProfile()}>
                Save and Complete
              </button>
            </div>
            {profileNotice && <p className="profileNotice">{profileNotice}</p>}
          </div>
        </section>
      </div>
    )
  }

  if (mode === 'host') {
    return (
      <div className="ownerPage">
        <header className="topBar">
          <div className="brand">
            <img className="brandLogo" src="/logo.png" alt="Land Ho logo" />
            <span>Land Ho Host</span>
          </div>
          <div className="topActions">
            <button className="ghostBtn" onClick={() => setMode('guest')}>
              Switch to guest mode
            </button>
            <button
              className={viewer ? 'profileIconBtn loggedIn' : 'profileIconBtn'}
              onClick={() => void openProfileEditor()}
              title={viewer ? `Current user: ${viewer.displayName || viewer.email || 'Signed in'}` : 'Guest, click to sign in'}
            >
              {authLoading ? (
                <span className="profileText">...</span>
              ) : resolvedAvatarUrl ? (
                <img src={resolvedAvatarUrl} alt="User avatar" className="avatarImg" />
              ) : viewer ? (
                <span className="profileText">{userInitial}</span>
              ) : (
                <span className="profileText">🌐</span>
              )}
            </button>
            <div className="menuWrap">
              <button className="iconBtn" onClick={() => setMenuOpen((prev) => !prev)}>
                ☰
              </button>
              {menuOpen && (
                <div className="topMenu">
                  <button
                    className="menuItem"
                    onClick={() => { setMenuOpen(false); navigate('/setup/captain') }}
                  >
                    ⚓ Captain Setup
                  </button>
                  <button
                    className="menuItem"
                    onClick={() => { setMenuOpen(false); navigate('/setup/sailor') }}
                  >
                    🚢 Sailor Setup
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
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="ownerHero">
          <h2>Publish a New Boat Trip</h2>
          <p>Create your listing and start receiving sailor applications.</p>
        </section>

        <section className="ownerFormGrid">
          <div className="ownerCard">
            <h3>Boat and Trip Information</h3>
            <div className="formRow">
              <label>Trip title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Sunset sailing in Sanya Bay"
              />
            </div>
            <div className="formRow">
              <label>Location</label>
              <div className="locationSearchRow">
                <input
                  value={locationQuery}
                  onChange={(e) => {
                    const next = e.target.value
                    setLocationQuery(next)
                    setForm({ ...form, location: next })
                    setSelectedCoordinates(null)
                    setSelectedAddress('')
                  }}
                  placeholder="Search marina, bay, or pier"
                />
                <button className="ghostBtn inlineActionBtn" type="button" onClick={() => void searchLocations()}>
                  {locationSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              {locationCandidates.length > 0 && (
                <div className="locationCandidates">
                  {locationCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      className="locationCandidateBtn"
                      type="button"
                      onClick={() => applySelectedLocation(candidate)}
                    >
                      {candidate.placeName}
                    </button>
                  ))}
                </div>
              )}
              <div className="locationPickerCard">
                {mapboxToken ? (
                  <Map
                    ref={hostMapRef}
                    mapboxAccessToken={mapboxToken}
                    style={{ width: '100%', height: '220px' }}
                    initialViewState={{
                      longitude: hostPickerCenter.lng,
                      latitude: hostPickerCenter.lat,
                      zoom: 9,
                    }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    onError={() => setLocationMapError('Map failed to load. Please verify Mapbox token scopes and domain restrictions.')}
                  >
                    <NavigationControl position="top-right" />
                    {selectedCoordinates && (
                      <Marker
                        longitude={selectedCoordinates.lng}
                        latitude={selectedCoordinates.lat}
                        draggable
                        onDragEnd={handlePickerMarkerDragEnd}
                      />
                    )}
                  </Map>
                ) : (
                  <p className="hintText">Map picker requires VITE_MAPBOX_ACCESS_TOKEN in environment.</p>
                )}
              </div>
              {locationMapError && <small className="hintText locationError">{locationMapError}</small>}
              <small className="hintText">
                {selectedCoordinates
                  ? `Pinned at lat ${selectedCoordinates.lat.toFixed(5)}, lng ${selectedCoordinates.lng.toFixed(5)}`
                  : 'Search and select a location, then drag the marker for precision.'}
              </small>
              {selectedAddress && <small className="hintText">Resolved address: {selectedAddress}</small>}
              {locationLookupError && <small className="hintText locationError">{locationLookupError}</small>}
            </div>
            <div className="formRow split">
              <div>
                <label>Price (USD/person)</label>
                <input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <label>Seats</label>
                <input
                  value={form.seats}
                  onChange={(e) => setForm({ ...form, seats: e.target.value })}
                />
              </div>
            </div>
            <div className="formRow split">
              <div>
                <label>Captain</label>
                <input
                  value={form.captain}
                  onChange={(e) => setForm({ ...form, captain: e.target.value })}
                  placeholder="Captain name"
                />
              </div>
              <div>
                <label>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            <div className="formRow">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as Exclude<BoatCategory, 'all'> })
                }
              >
                <option value="dayTrip">Day Trips</option>
                <option value="sunset">Sunset Cruises</option>
                <option value="training">Training</option>
                <option value="island">Island Hops</option>
              </select>
            </div>
            <div className="formRow">
              <label>Boat image (required)</label>
              <input type="file" accept="image/*" multiple onChange={handleBoatImageUpload} />
              <small className="hintText">
                {form.images.length} / {maxBoatImages} images uploaded
              </small>
              {boatImageUploading && <small className="hintText">Uploading boat image, please wait...</small>}
              {form.images.length > 1 && (
                <small className="hintText">Drag and drop to reorder. The first image is the cover.</small>
              )}
              {form.images.length > 0 && (
                <div className="uploadGallery">
                  {form.images.map((imageUrl, index) => (
                    <div
                      key={`${imageUrl}-${index}`}
                      className={index === 0 ? 'uploadItem coverItem' : 'uploadItem'}
                      draggable
                      onDragStart={() => setDraggingImageIndex(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (draggingImageIndex === null) {
                          return
                        }
                        moveFormImage(draggingImageIndex, index)
                        setDraggingImageIndex(null)
                      }}
                      onDragEnd={() => setDraggingImageIndex(null)}
                    >
                      <img src={imageUrl} alt={`Uploaded boat image ${index + 1}`} />
                      <div className="uploadMeta">
                        <span>{index === 0 ? 'Cover image' : `Image ${index + 1}`}</span>
                        <button
                          className="ghostBtn compactActionBtn"
                          onClick={() => removeFormImageAt(index)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="publishBtn" onClick={publishBoat}>
              {editingBoatId ? 'Update Listing' : 'Publish Listing'}
            </button>
            {editingBoatId && (
              <button className="ghostBtn inlineActionBtn" onClick={cancelEditBoat}>
                Cancel Edit
              </button>
            )}
            {hostNotice && <p className="hostNotice">{hostNotice}</p>}
          </div>

          <div className="ownerCard">
            <h3>Your Published Boats</h3>
            {boatsLoading && <p className="muted">Loading your boats...</p>}
            {boatsError && <p className="hostNotice">{boatsError}</p>}
            {!boatsLoading && hostBoats.length === 0 && (
              <p className="muted">No listings yet. Publish your first trip now.</p>
            )}
            <div className="ownerList">
              {hostBoats.map((boat) => (
                <div key={boat.id} className="ownerListItem">
                  <img src={boat.image} alt={boat.title} />
                  <div>
                    <strong>{boat.title}</strong>
                    <p>
                      {boat.location} · {formatTripDate(boat.date)} · {boat.seats} seats
                    </p>
                    <p>$ {boat.price} / person</p>
                    <button className="ghostBtn compactActionBtn" onClick={() => startEditBoat(boat)}>
                      Edit
                    </button>
                    <button className="ghostBtn compactActionBtn" onClick={() => toggleBoatRequests(boat.id)}>
                      {activeRequestBoatId === boat.id ? 'Hide Requests' : 'View Requests'}
                    </button>
                    <button
                      className="dangerBtn compactDangerBtn"
                      onClick={() => void removeBoat(boat.id)}
                      disabled={deletingBoatId === boat.id}
                    >
                      {deletingBoatId === boat.id ? 'Deleting...' : 'Delete'}
                    </button>
                    {activeRequestBoatId === boat.id && (
                      <div className="requestPanel">
                        {requestsLoading && <p className="muted">Loading requests...</p>}
                        {requestsError && <p className="authNotice requestError">{requestsError}</p>}
                        {!requestsLoading && !requestsError && activeBoatRequests.length === 0 && (
                          <p className="muted">No requests yet.</p>
                        )}
                        {!requestsLoading &&
                          !requestsError &&
                          activeBoatRequests.map((request) => (
                            <div key={request.id} className="requestItem">
                              <button
                                className="requestUserLink"
                                type="button"
                                onClick={() => openApplicantProfile(request)}
                                title="View applicant resume"
                              >
                                {request.applicantAvatar ? (
                                  <img src={request.applicantAvatar} alt={request.applicantName} />
                                ) : (
                                  <div className="requestAvatarFallback">
                                    {(request.applicantName || 'G').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="requestMain">
                                  <strong>{request.applicantName || 'Guest'}</strong>
                                  <p>{formatDateTime(request.createdAt)}</p>
                                  <span className={`requestStatus status-${request.status}`}>
                                    {request.status}
                                  </span>
                                </div>
                              </button>
                              {request.status === 'pending' && (
                                <div className="requestActions">
                                  <button
                                    className="ghostBtn compactActionBtn"
                                    onClick={() => void handleBookingDecision(request.id, 'approved')}
                                    disabled={requestActionId === request.id}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="dangerBtn compactDangerBtn"
                                    onClick={() => void handleBookingDecision(request.id, 'rejected')}
                                    disabled={requestActionId === request.id}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="homePage">
      <header className="topBar">
        <div className="brand">
          <img className="brandLogo" src="/logo.png" alt="Land Ho logo" />
          <span>Land Ho</span>
        </div>
        <div className="topActions">
          <button className="ghostBtn" onClick={() => void handleHostModeClick()}>
            {viewer ? 'Switch to host mode' : 'Switch to host mode (sign-in required)'}
          </button>
          <button
            className={viewer ? 'profileIconBtn loggedIn' : 'profileIconBtn'}
            onClick={() => void openProfileEditor()}
            title={viewer ? `Current user: ${viewer.displayName || viewer.email || 'Signed in'}` : 'Guest, click to sign in'}
          >
            {authLoading ? (
              <span className="profileText">...</span>
            ) : resolvedAvatarUrl ? (
              <img src={resolvedAvatarUrl} alt="User avatar" className="avatarImg" />
            ) : viewer ? (
              <span className="profileText">{userInitial}</span>
            ) : (
              <span className="profileText">🌐</span>
            )}
          </button>
          <div className="menuWrap">
            <button className="iconBtn" onClick={() => setMenuOpen((prev) => !prev)}>
              ☰
            </button>
            {menuOpen && (
              <div className="topMenu">
                <button
                  className="menuItem"
                  onClick={() => { setMenuOpen(false); navigate('/setup/captain') }}
                >
                  ⚓ Captain Setup
                </button>
                <button
                  className="menuItem"
                  onClick={() => { setMenuOpen(false); navigate('/setup/sailor') }}
                >
                  🚢 Sailor Setup
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
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="searchSection">
        <div className="searchItem">
          <label>Where</label>
          <input
            placeholder="Search ports or bays"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="searchItem">
          <label>When</label>
          <input placeholder="Any week" />
        </div>
        <div className="searchItem">
          <label>Guests</label>
          <input
            placeholder="Minimum seats"
            value={seatFilter}
            onChange={(e) => setSeatFilter(e.target.value)}
          />
        </div>
        <button className="searchBtn">Search</button>
      </section>

      <section className="categoryTabs">
        {categories.map((item) => (
          <button
            key={item.key}
            className={category === item.key ? 'tab active' : 'tab'}
            onClick={() => setCategory(item.key)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </section>

      <section className="listHeader">
        <h2>Explore Popular Boats</h2>
        <p>{boatsLoading ? 'Loading trips...' : `${filteredBoats.length} trips available`}</p>
      </section>
      {boatsError && <p className="authNotice">{boatsError}</p>}

      <section className="boatGrid">
        {boatsLoading ? (
          <article className="boatCard">
            <div className="cardBody">
              <p className="muted">Loading boats from cloud...</p>
            </div>
          </article>
        ) : (
          filteredBoats.map((boat) => (
            <article
              className="boatCard clickableCard"
              key={boat.id}
              onClick={() => navigate(`/boats/${boat.id}`)}
            >
              <div className="cardImageWrap">
                <img src={boat.image} alt={boat.title} className="cardImage" />
                <button className="favoriteBtn">♡</button>
              </div>
              <div className="cardBody">
                <div className="cardRow">
                  <h3>{boat.title}</h3>
                  <span>★ {boat.rating.toFixed(2)}</span>
                </div>
                <p>{boat.location}</p>
                <p>
                  Captain {boat.captain} · {formatTripDate(boat.date)} · {boat.seats} seats
                </p>
                <p className="price">$ {boat.price} / person</p>
              </div>
            </article>
          ))
        )}
      </section>

      {!boatsLoading && filteredBoats.length === 0 && (
        <div className="emptyState">
          <p>No boats match your filters. Try resetting them.</p>
          <button
            onClick={() => {
              setCategory('all')
              setSearchText('')
              setSeatFilter('')
            }}
          >
            Reset Filters
          </button>
        </div>
      )}
      <footer className="footerText">
        Browsing UI first, then connect your live listing and booking data.
      </footer>
      {authError && <p className="authNotice">{authError}</p>}
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketplacePage />} />
      <Route path="/map" element={<MapExplorePage />} />
      <Route path="/boats/:boatId" element={<BoatDetailPage />} />
      <Route path="/hosts/:uid" element={<HostResumePage />} />
      <Route path="/setup/captain" element={<CaptainSetupPage />} />
      <Route path="/setup/sailor" element={<SailorSetupPage />} />
    </Routes>
  )
}

export default App
