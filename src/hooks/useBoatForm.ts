import { useEffect, useRef, useState, useMemo, type ChangeEvent } from 'react'
import { type User } from 'firebase/auth'
import { type MapRef } from 'react-map-gl/mapbox'
import { type NavigateFunction } from 'react-router-dom'
import {
  createBoatListing,
  deleteBoatListing,
  updateBoatListing,
} from '../features/boats/boatsApi'
import {
  subscribeHostRequestsByBoat,
  updateBookingRequestStatus,
  type BookingRequestRecord,
} from '../features/booking/bookingApi'
import {
  reverseLookupLocation,
  searchLocationSuggestions,
  type LocationSuggestion,
} from '../features/location/mapboxGeocode'
import { uploadImageToStorage } from '../lib/storage'
import { type BoatCard, type BoatFormData } from '../types'
import {
  maxBoatImages,
  mapboxToken,
  findCoordinatesForLocation,
  defaultCoordinates,
} from '../data/constants'
import { getUploadErrorText } from '../utils/formatters'
import { type BoatCoordinates } from '../features/boats/boatsApi'

interface UseBoatFormOptions {
  viewer: User | null
  resumeCompleted: boolean
  navigate: NavigateFunction
  onNewListingPublished?: () => void
}

export function useBoatForm({ viewer, resumeCompleted, navigate, onNewListingPublished }: UseBoatFormOptions) {
  const [form, setForm] = useState<BoatFormData>({
    title: '',
    location: '',
    price: '699',
    seats: '4',
    captain: '',
    date: '',
    category: 'dayTrip',
    images: [],
  })
  const [editingBoatId, setEditingBoatId] = useState('')
  const [deletingBoatId, setDeletingBoatId] = useState('')
  const [hostNotice, setHostNotice] = useState('')
  const [hostSuccessModal, setHostSuccessModal] = useState('')
  const [boatImageUploading, setBoatImageUploading] = useState(false)
  const [draggingImageIndex, setDraggingImageIndex] = useState<number | null>(null)

  const hostMapRef = useRef<MapRef | null>(null)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationCandidates, setLocationCandidates] = useState<LocationSuggestion[]>([])
  const [locationSearching, setLocationSearching] = useState(false)
  const [locationLookupError, setLocationLookupError] = useState('')
  const [locationMapError, setLocationMapError] = useState('')
  const [selectedCoordinates, setSelectedCoordinates] = useState<BoatCoordinates | null>(null)
  const [selectedAddress, setSelectedAddress] = useState('')

  const [activeRequestBoatId, setActiveRequestBoatId] = useState('')
  const [activeBoatRequests, setActiveBoatRequests] = useState<BookingRequestRecord[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState('')
  const [requestActionId, setRequestActionId] = useState('')

  const onNewListingRef = useRef(onNewListingPublished)
  onNewListingRef.current = onNewListingPublished

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
        setHostSuccessModal('Listing updated successfully.')
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
          ownerName: viewer.displayName || viewer.email || 'Captain',
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
        setHostSuccessModal('Published successfully!')
        onNewListingRef.current?.()
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
      setHostSuccessModal('Listing deleted.')
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
      setHostSuccessModal(status === 'approved' ? 'Request approved.' : 'Request rejected.')
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

  return {
    form,
    setForm,
    editingBoatId,
    deletingBoatId,
    hostNotice,
    setHostNotice,
    hostSuccessModal,
    setHostSuccessModal,
    boatImageUploading,
    draggingImageIndex,
    setDraggingImageIndex,
    hostMapRef,
    locationQuery,
    setLocationQuery,
    locationCandidates,
    locationSearching,
    locationLookupError,
    locationMapError,
    setLocationMapError,
    selectedCoordinates,
    setSelectedCoordinates,
    selectedAddress,
    hostPickerCenter,
    activeRequestBoatId,
    activeBoatRequests,
    requestsLoading,
    requestsError,
    requestActionId,
    publishBoat,
    startEditBoat,
    cancelEditBoat,
    removeFormImageAt,
    moveFormImage,
    removeBoat,
    toggleBoatRequests,
    handleBookingDecision,
    openApplicantProfile,
    handleBoatImageUpload,
    applySelectedLocation,
    searchLocations,
    handlePickerMarkerDragEnd,
  }
}
