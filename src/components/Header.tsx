import { useEffect, type ReactNode } from 'react'
import { type User } from 'firebase/auth'
import { Link } from 'react-router-dom'

interface HeaderProps {
  brandText: string
  children: ReactNode
}

export function Header({ brandText, children }: HeaderProps) {
  return (
    <header className="topBar">
      <Link className="brand" to="/" state={{ initialMode: 'guest' }}>
        <img className="brandLogo" src="/logo.png" alt="Land Ho logo" />
        <span>{brandText}</span>
      </Link>
      <div className="topActions">
        {children}
      </div>
    </header>
  )
}

interface UserButtonProps {
  viewer: User | null
  authLoading: boolean
  resolvedAvatarUrl: string
  userInitial: string
  onClick: () => void
}

export function UserButton({ viewer, authLoading, resolvedAvatarUrl, userInitial, onClick }: UserButtonProps) {
  if (!viewer) {
    return (
      <button className="ghostBtn" onClick={onClick}>
        Sign in
      </button>
    )
  }
  return (
    <button
      className="profileIconBtn loggedIn"
      onClick={onClick}
      title={`Current user: ${viewer.displayName || viewer.email || 'Signed in'}`}
    >
      {authLoading ? (
        <span className="profileText">...</span>
      ) : resolvedAvatarUrl ? (
        <img src={resolvedAvatarUrl} alt="User avatar" className="avatarImg" />
      ) : (
        <span className="profileText">{userInitial}</span>
      )}
    </button>
  )
}

interface MenuDropdownProps {
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  children: ReactNode
}

export function MenuDropdown({ menuOpen, setMenuOpen, children }: MenuDropdownProps) {
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
  }, [menuOpen, setMenuOpen])

  return (
    <div className="menuWrap">
      <button className="iconBtn" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </button>
      {menuOpen && (
        <div className="topMenu">
          {children}
        </div>
      )}
    </div>
  )
}
