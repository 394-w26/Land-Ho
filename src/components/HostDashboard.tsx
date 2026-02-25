import { type ChangeEvent, type RefObject } from 'react'
import { type User } from 'firebase/auth'
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox'
import { type BoatCard, type BoatCategory, type BoatFormData } from '../types'
import { type BoatCoordinates } from '../features/boats/boatsApi'
import { type BookingRequestRecord } from '../features/booking/bookingApi'
import { type LocationSuggestion } from '../features/location/mapboxGeocode'
import { maxBoatImages, mapboxToken } from '../data/constants'
import { formatTripDate, formatDateTime } from '../utils/formatters'
import { Header, UserButton, MenuDropdown } from './Header'

interface HostDashboardProps {
  viewer: User | null
  authLoading: boolean
  resolvedAvatarUrl: string
  userInitial: string
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  onBrowseAsGuest: () => void
  onOpenProfile: () => void
  onSignOut: () => void
  onLoginWithGoogle: () => void
  onNavigateCaptainSetup: () => void
  onNavigateSailorSetup: () => void
  onNavigateInstructorRequest: () => void
  form: BoatFormData
  setForm: (updater: BoatFormData | ((prev: BoatFormData) => BoatFormData)) => void
  editingBoatId: string
  deletingBoatId: string
  hostNotice: string
  boatImageUploading: boolean
  draggingImageIndex: number | null
  setDraggingImageIndex: (index: number | null) => void
  hostMapRef: RefObject<MapRef | null>
  locationQuery: string
  setLocationQuery: (value: string) => void
  locationCandidates: LocationSuggestion[]
  locationSearching: boolean
  locationLookupError: string
  locationMapError: string
  setLocationMapError: (value: string) => void
  selectedCoordinates: BoatCoordinates | null
  setSelectedCoordinates: (value: BoatCoordinates | null) => void
  selectedAddress: string
  hostPickerCenter: BoatCoordinates
  activeRequestBoatId: string
  activeBoatRequests: BookingRequestRecord[]
  requestsLoading: boolean
  requestsError: string
  requestActionId: string
  hostBoats: BoatCard[]
  boatsLoading: boolean
  boatsError: string
  publishBoat: () => Promise<void>
  startEditBoat: (boat: BoatCard) => void
  cancelEditBoat: () => void
  removeFormImageAt: (index: number) => void
  moveFormImage: (fromIndex: number, toIndex: number) => void
  removeBoat: (boatId: string) => Promise<void>
  toggleBoatRequests: (boatId: string) => void
  handleBookingDecision: (requestId: string, status: 'approved' | 'rejected') => Promise<void>
  openApplicantProfile: (request: BookingRequestRecord) => void
  handleBoatImageUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  applySelectedLocation: (next: LocationSuggestion) => void
  searchLocations: () => Promise<void>
  handlePickerMarkerDragEnd: (event: { lngLat: { lng: number; lat: number } }) => void
}

export default function HostDashboard({
  viewer,
  authLoading,
  resolvedAvatarUrl,
  userInitial,
  menuOpen,
  setMenuOpen,
  onBrowseAsGuest,
  onOpenProfile,
  onSignOut,
  onLoginWithGoogle,
  onNavigateCaptainSetup,
  onNavigateSailorSetup,
  onNavigateInstructorRequest,
  form,
  setForm,
  editingBoatId,
  deletingBoatId,
  hostNotice,
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
  hostBoats,
  boatsLoading,
  boatsError,
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
}: HostDashboardProps) {
  return (
    <div className="ownerPage">
      <Header brandText="Land Ho Host">
        <button className="ghostBtn" onClick={onBrowseAsGuest}>
          Browse as Guest
        </button>
        <UserButton
          viewer={viewer}
          authLoading={authLoading}
          resolvedAvatarUrl={resolvedAvatarUrl}
          userInitial={userInitial}
          onClick={onOpenProfile}
        />
        <MenuDropdown menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
          <button
            className="menuItem"
            onClick={() => { setMenuOpen(false); onBrowseAsGuest() }}
          >
            Browse as Guest
          </button>
          <button
            className="menuItem"
            onClick={() => { setMenuOpen(false); onNavigateCaptainSetup() }}
          >
            Captain Setup
          </button>
          <button
            className="menuItem"
            onClick={() => { setMenuOpen(false); onNavigateSailorSetup() }}
          >
            Sailor Setup
          </button>
          <button
            className="menuItem"
            onClick={() => { setMenuOpen(false); onNavigateInstructorRequest() }}
          >
            🎓 Request Instructor
          </button>
          {viewer ? (
            <button className="menuItem dangerText" onClick={onSignOut}>
              Sign out
            </button>
          ) : (
            <button
              className="menuItem"
              onClick={() => {
                setMenuOpen(false)
                onLoginWithGoogle()
              }}
            >
              Sign in
            </button>
          )}
        </MenuDropdown>
      </Header>

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
