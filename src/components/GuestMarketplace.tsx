import { useMemo } from 'react'
import { type User } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { type BoatCard, type BoatCategory } from '../types'
import { chicagoLocations } from '../data/constants'
import { formatTripDate } from '../utils/formatters'
import { Header, UserButton, MenuDropdown } from './Header'
import MarketplaceControls from './MarketplaceControls'

interface GuestMarketplaceProps {
  viewer: User | null
  authLoading: boolean
  authError: string
  resolvedAvatarUrl: string
  userInitial: string
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  category: BoatCategory
  setCategory: (category: BoatCategory) => void
  searchText: string
  setSearchText: (value: string) => void
  seatFilter: string
  setSeatFilter: (value: string) => void
  filteredBoats: BoatCard[]
  boatsLoading: boolean
  boatsError: string
  onBecomeHost: () => void
  onOpenProfile: () => void
  onSignOut: () => void
  onLoginWithGoogle: () => void
  onNavigateCaptainSetup: () => void
  onNavigateSailorSetup: () => void
  onNavigateInstructorRequest: () => void
  onNavigateMap: () => void
}

export default function GuestMarketplace({
  viewer,
  authLoading,
  authError,
  resolvedAvatarUrl,
  userInitial,
  menuOpen,
  setMenuOpen,
  category,
  setCategory,
  searchText,
  setSearchText,
  seatFilter,
  setSeatFilter,
  filteredBoats,
  boatsLoading,
  boatsError,
  onBecomeHost,
  onOpenProfile,
  onSignOut,
  onLoginWithGoogle,
  onNavigateCaptainSetup,
  onNavigateSailorSetup,
  onNavigateInstructorRequest,
  onNavigateMap,
}: GuestMarketplaceProps) {
  const navigate = useNavigate()

  const locationSuggestions = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (keyword.length === 0) return []
    return chicagoLocations.filter((loc) => loc.toLowerCase().includes(keyword))
  }, [searchText])

  return (
    <div className="homePage">
      <Header brandText="Land Ho">
        <button className="ghostBtn" onClick={onBecomeHost}>
          Sign up as a captain
        </button>
        <button className="ghostBtn" onClick={onNavigateMap}>
          Map view
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
            onClick={() => { setMenuOpen(false); onBecomeHost() }}
          >
            Sign up as a captain
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
          <button
            className="menuItem"
            onClick={() => { setMenuOpen(false); onNavigateMap() }}
          >
            Map view
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

      <MarketplaceControls
        category={category}
        setCategory={setCategory}
        searchText={searchText}
        setSearchText={setSearchText}
        seatFilter={seatFilter}
        setSeatFilter={setSeatFilter}
        suggestions={locationSuggestions.map((loc) => ({ id: loc, label: loc }))}
      />

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
