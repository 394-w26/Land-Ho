import { useEffect, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import { type AppView, type BoatCategory } from './types'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import { useBoats } from './hooks/useBoats'
import { useBoatForm } from './hooks/useBoatForm'
import ProfileEditor from './components/ProfileEditor'
import HostDashboard from './components/HostDashboard'
import GuestMarketplace from './components/GuestMarketplace'
import BoatDetailPage from './pages/BoatDetailPage'
import HostResumePage from './pages/HostResumePage'
import CaptainSetupPage from './pages/CaptainSetupPage'
import SailorSetupPage from './pages/SailorSetupPage'
import InstructorRequestPage from './pages/InstructorRequestPage'
import MapExplorePage from './pages/MapExplorePage'

function MarketplacePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'guest' | 'host'>('guest')
  const [appView, setAppView] = useState<AppView>('market')
  const [menuOpen, setMenuOpen] = useState(false)
  const [category, setCategory] = useState<BoatCategory>('all')
  const [searchText, setSearchText] = useState('')
  const [seatFilter, setSeatFilter] = useState('')

  const { viewer, authLoading, authError, loginWithGoogle, signOutUser, userInitial } = useAuth()
  const profile = useProfile(viewer)

  useEffect(() => {
    profile.syncFromAuth(viewer)
  }, [viewer]) // eslint-disable-line react-hooks/exhaustive-deps

  const { filteredBoats, hostBoats, boatsLoading, boatsError } = useBoats({
    viewer,
    category,
    searchText,
    seatFilter,
  })

  const boatForm = useBoatForm({
    viewer,
    resumeCompleted: profile.resumeCompleted,
    navigate,
    onNewListingPublished: () => setMode('guest'),
  })

  useEffect(() => {
    const routeState = location.state as { initialMode?: 'guest' | 'host' } | null
    if (routeState?.initialMode === 'host') {
      setMode('host')
      setAppView('market')
    }
  }, [location.state])

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
        addExperience={profile.addExperience}
        updateExperience={profile.updateExperience}
        removeExperience={profile.removeExperience}
        addCertificate={profile.addCertificate}
        updateCertificate={profile.updateCertificate}
        removeCertificate={profile.removeCertificate}
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
        form={boatForm.form}
        setForm={boatForm.setForm}
        editingBoatId={boatForm.editingBoatId}
        deletingBoatId={boatForm.deletingBoatId}
        hostNotice={boatForm.hostNotice}
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

  return (
    <GuestMarketplace
      viewer={viewer}
      authLoading={authLoading}
      authError={authError}
      resolvedAvatarUrl={profile.resolvedAvatarUrl}
      userInitial={userInitial}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      category={category}
      setCategory={setCategory}
      searchText={searchText}
      setSearchText={setSearchText}
      seatFilter={seatFilter}
      setSeatFilter={setSeatFilter}
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
      onNavigateMap={() => navigate('/map')}
    />
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
      <Route path="/request-instructor" element={<InstructorRequestPage />} />
    </Routes>
  )
}

export default App
