import { useEffect, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import { type AppView, type CruiseLengthFilter, type CruiseTypeFilter, type BoatSizeSort } from './types'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import { useBoats } from './hooks/useBoats'
import { useBoatForm } from './hooks/useBoatForm'
import { getCaptainProfile } from './features/onboarding/onboardingApi'
import ProfileEditor from './components/ProfileEditor'
import HostDashboard from './components/HostDashboard'
import GuestMarketplace from './components/GuestMarketplace'
import MarketplaceMapView from './components/MarketplaceMapView'
import BoatDetailPage from './pages/BoatDetailPage'
import HostResumePage from './pages/HostResumePage'
import CaptainSetupPage from './pages/CaptainSetupPage'
import SailorSetupPage from './pages/SailorSetupPage'
import InstructorRequestPage from './pages/InstructorRequestPage'
import ChatPage from './pages/ChatPage'

function MarketplacePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'guest' | 'host'>('guest')
  const [appView, setAppView] = useState<AppView>('market')
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [seatFilter, setSeatFilter] = useState('')
  const [cruiseLength, setCruiseLength] = useState<CruiseLengthFilter>('all')
  const [cruiseType, setCruiseType] = useState<CruiseTypeFilter>('all')
  const [harborFilter, setHarborFilter] = useState('')
  const [boatSizeSort, setBoatSizeSort] = useState<BoatSizeSort>('none')
  const [highlightBoatId, setHighlightBoatId] = useState('')

  const { viewer, authLoading, authError, loginWithGoogle, signOutUser, userInitial } = useAuth()
  const profile = useProfile(viewer)
  const [captainProfileCompleted, setCaptainProfileCompleted] = useState(false)
  const [showCaptainGate, setShowCaptainGate] = useState(false)

  useEffect(() => {
    profile.syncFromAuth(viewer)
  }, [viewer]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!viewer?.uid) {
      setCaptainProfileCompleted(false)
      return
    }
    let active = true
    getCaptainProfile(viewer.uid).then((captain) => {
      if (active) setCaptainProfileCompleted(!!captain?.completedAt)
    })
    return () => { active = false }
  }, [viewer?.uid, location.pathname])

  const { filteredBoats, hostBoats, boatsLoading, boatsError } = useBoats({
    viewer,
    searchText,
    seatFilter,
    cruiseLength,
    cruiseType,
    harborFilter,
    boatSizeSort,
  })

  const boatForm = useBoatForm({
    viewer,
    resumeCompleted: captainProfileCompleted,
    navigate,
    onNewListingPublished: () => setMode('guest'),
  })

  useEffect(() => {
    const routeState = location.state as {
      initialMode?: 'guest' | 'host'
      openProfile?: boolean
      openMap?: boolean
      highlightBoatId?: string
    } | null
    if (routeState?.initialMode === 'host') {
      setMode('host')
      setAppView('market')
    }
    if (routeState?.openProfile) {
      setAppView('profile')
      profile.setProfileSection('basic')
    }
    if (routeState?.openMap) {
      setMode('guest')
      setAppView('map')
      setHighlightBoatId(routeState.highlightBoatId ?? '')
      navigate('/', { replace: true, state: null })
    }
  }, [location.state]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleHostModeClick = async () => {
    if (!viewer) {
      const success = await loginWithGoogle()
      // After login the viewer state updates async — navigate to captain setup
      // so they complete it before hosting. The gate will enforce this on next click.
      if (success) {
        navigate('/setup/captain')
      }
      return
    }
    // Already signed in — check captain profile completion
    if (!captainProfileCompleted) {
      setShowCaptainGate(true)
      return
    }
    setMode('host')
    setAppView('market')
  }

  const openProfileEditor = async () => {
    if (viewer) {
      setAppView('profile')
      profile.setProfileSection('basic')
      return
    }
    const success = await loginWithGoogle()
    if (success) {
      setAppView('profile')
      profile.setProfileSection('basic')
    }
  }

  const handleSignOut = async () => {
    await signOutUser()
    setMode('guest')
    setAppView('market')
    boatForm.setHostNotice('')
    profile.setProfileNotice('')
    setMenuOpen(false)
  }

  if (appView === 'profile') {
    return (
      <ProfileEditor
        profileDraft={profile.profileDraft}
        profileSection={profile.profileSection}
        setProfileSection={profile.setProfileSection}
        profileNotice={profile.profileNotice}
        profileSuccessModal={profile.profileSuccessModal}
        setProfileSuccessModal={profile.setProfileSuccessModal}
        skillInput={profile.skillInput}
        setSkillInput={profile.setSkillInput}
        avatarUploading={profile.avatarUploading}
        resolvedAvatarUrl={profile.resolvedAvatarUrl}
        userInitial={userInitial}
        completionPercent={profile.completionPercent}
        missingItems={profile.missingItems}
        updateProfileDraft={profile.updateProfileDraft}
        addSkill={profile.addSkill}
        removeSkill={profile.removeSkill}
        saveProfile={profile.saveProfile}
        saveAndFinishProfile={profile.saveAndFinishProfile}
        handleAvatarUpload={profile.handleAvatarUpload}
        onBackToHome={() => setAppView('market')}
      />
    )
  }

  if (mode === 'host') {
    return (
      <HostDashboard
        viewer={viewer}
        authLoading={authLoading}
        resolvedAvatarUrl={profile.resolvedAvatarUrl}
        userInitial={userInitial}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onBrowseAsGuest={() => setMode('guest')}
        onOpenProfile={() => void openProfileEditor()}
        onSignOut={() => void handleSignOut()}
        onLoginWithGoogle={() => void loginWithGoogle()}
        onNavigateCaptainSetup={() => navigate('/setup/captain')}
        onNavigateSailorSetup={() => navigate('/setup/sailor')}
        onNavigateInstructorRequest={() => navigate('/request-instructor')}
        onNavigateChat={() => navigate('/chat')}
        form={boatForm.form}
        setForm={boatForm.setForm}
        editingBoatId={boatForm.editingBoatId}
        deletingBoatId={boatForm.deletingBoatId}
        hostNotice={boatForm.hostNotice}
        hostSuccessModal={boatForm.hostSuccessModal}
        setHostSuccessModal={boatForm.setHostSuccessModal}
        boatImageUploading={boatForm.boatImageUploading}
        draggingImageIndex={boatForm.draggingImageIndex}
        setDraggingImageIndex={boatForm.setDraggingImageIndex}
        hostMapRef={boatForm.hostMapRef}
        locationQuery={boatForm.locationQuery}
        setLocationQuery={boatForm.setLocationQuery}
        locationCandidates={boatForm.locationCandidates}
        locationSearching={boatForm.locationSearching}
        locationLookupError={boatForm.locationLookupError}
        locationMapError={boatForm.locationMapError}
        setLocationMapError={boatForm.setLocationMapError}
        selectedCoordinates={boatForm.selectedCoordinates}
        setSelectedCoordinates={boatForm.setSelectedCoordinates}
        selectedAddress={boatForm.selectedAddress}
        hostPickerCenter={boatForm.hostPickerCenter}
        activeRequestBoatId={boatForm.activeRequestBoatId}
        activeBoatRequests={boatForm.activeBoatRequests}
        requestsLoading={boatForm.requestsLoading}
        requestsError={boatForm.requestsError}
        requestActionId={boatForm.requestActionId}
        hostBoats={hostBoats}
        boatsLoading={boatsLoading}
        boatsError={boatsError}
        publishBoat={boatForm.publishBoat}
        startEditBoat={boatForm.startEditBoat}
        cancelEditBoat={boatForm.cancelEditBoat}
        removeFormImageAt={boatForm.removeFormImageAt}
        moveFormImage={boatForm.moveFormImage}
        removeBoat={boatForm.removeBoat}
        toggleBoatRequests={boatForm.toggleBoatRequests}
        handleBookingDecision={boatForm.handleBookingDecision}
        openApplicantProfile={boatForm.openApplicantProfile}
        handleBoatImageUpload={boatForm.handleBoatImageUpload}
        applySelectedLocation={boatForm.applySelectedLocation}
        searchLocations={boatForm.searchLocations}
        handlePickerMarkerDragEnd={boatForm.handlePickerMarkerDragEnd}
      />
    )
  }

  if (appView === 'map') {
    return (
      <MarketplaceMapView
        boats={filteredBoats}
        boatsLoading={boatsLoading}
        boatsError={boatsError}
        searchText={searchText}
        setSearchText={setSearchText}
        seatFilter={seatFilter}
        setSeatFilter={setSeatFilter}
        cruiseLength={cruiseLength}
        setCruiseLength={setCruiseLength}
        cruiseType={cruiseType}
        setCruiseType={setCruiseType}
        harborFilter={harborFilter}
        setHarborFilter={setHarborFilter}
        boatSizeSort={boatSizeSort}
        setBoatSizeSort={setBoatSizeSort}
        onBackToList={() => setAppView('market')}
        highlightBoatId={highlightBoatId}
        onHighlightHandled={() => setHighlightBoatId('')}
      />
    )
  }

  return (
    <>
      <GuestMarketplace
        viewer={viewer}
        authLoading={authLoading}
        authError={authError}
        resolvedAvatarUrl={profile.resolvedAvatarUrl}
        userInitial={userInitial}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        searchText={searchText}
        setSearchText={setSearchText}
        seatFilter={seatFilter}
        setSeatFilter={setSeatFilter}
        cruiseLength={cruiseLength}
        setCruiseLength={setCruiseLength}
        cruiseType={cruiseType}
        setCruiseType={setCruiseType}
        harborFilter={harborFilter}
        setHarborFilter={setHarborFilter}
        boatSizeSort={boatSizeSort}
        setBoatSizeSort={setBoatSizeSort}
        filteredBoats={filteredBoats}
        boatsLoading={boatsLoading}
        boatsError={boatsError}
        onBecomeHost={() => void handleHostModeClick()}
        onOpenProfile={() => void openProfileEditor()}
        onSignOut={() => void handleSignOut()}
        onLoginWithGoogle={() => void loginWithGoogle()}
        onNavigateCaptainSetup={() => navigate('/setup/captain')}
        onNavigateSailorSetup={() => navigate('/setup/sailor')}
        onNavigateInstructorRequest={() => navigate('/request-instructor')}
        onNavigateChat={() => navigate('/chat')}
        onNavigateMap={() => setAppView('map')}
      />

      {/* Captain setup gate modal */}
      {showCaptainGate && (
        <div className="modalOverlay" onClick={() => setShowCaptainGate(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <h3>Captain setup required</h3>
            <p>
              You need to complete your captain profile before you can host a trip.
              It only takes a few minutes — add your license, boat info, and agree to the waiver.
            </p>
            <div className="modalActions">
              <button
                className="publishBtn"
                onClick={() => { setShowCaptainGate(false); navigate('/setup/captain') }}
              >
                Complete captain setup
              </button>
              <button className="ghostBtn" onClick={() => setShowCaptainGate(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketplacePage />} />
      <Route path="/boats/:boatId" element={<BoatDetailPage />} />
      <Route path="/hosts/:uid" element={<HostResumePage />} />
      <Route path="/setup/captain" element={<CaptainSetupPage />} />
      <Route path="/setup/sailor" element={<SailorSetupPage />} />
      <Route path="/request-instructor" element={<InstructorRequestPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/chat/:conversationId" element={<ChatPage />} />
    </Routes>
  )
}

export default App
