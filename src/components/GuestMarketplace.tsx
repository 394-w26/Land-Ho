import { type User } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { type BoatCard, type BoatCategory } from '../types'
import { categories } from '../data/constants'
import { formatTripDate } from '../utils/formatters'
import { Header, UserButton, MenuDropdown } from './Header'

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

  return (
    <div className="homePage">
      <Header brandText="Land Ho">
        <button className="ghostBtn" onClick={onBecomeHost}>
          Sign up as a captain
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
            Explore Map
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

      <section className="searchSection">
        <div className="searchItem">
          <label>Where</label>
          <input
            placeholder="Search destinations"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="searchItem">
          <label>When</label>
          <input placeholder="Any week" />
        </div>
        <div className="searchItem">
          <label>Sailors</label>
          <input
            placeholder="Add sailors"
            value={seatFilter}
            onChange={(e) => setSeatFilter(e.target.value)}
          />
        </div>
        <button type="button" className="searchBtn searchBtn--icon" aria-label="Search">
          <span className="searchBtnText">Search</span>
          <span className="searchBtnIcon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
        </button>
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
