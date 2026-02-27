import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getUserPublicProfile, type UserPublicProfile } from '../features/users/usersApi'

function HostResumePage() {
  const { uid = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState<UserPublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleBack = () => {
    const routeState = location.state as { returnToHost?: boolean } | null
    if (routeState?.returnToHost) {
      navigate('/', { state: { initialMode: 'host' } })
      return
    }
    navigate(-1)
  }

  useEffect(() => {
    if (!uid) {
      setError('Captain id is missing.')
      setLoading(false)
      return
    }

    let active = true
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const next = await getUserPublicProfile(uid)
        if (!active) {
          return
        }
        if (!next) {
          setError('Captain profile not found.')
          setProfile(null)
          return
        }
        setProfile(next)
      } catch {
        if (active) {
          setError('Failed to load captain profile.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [uid])

  if (loading) {
    return (
      <div className="detailPage">
        <p className="muted">Loading captain profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="detailPage">
        <button className="ghostBtn" onClick={handleBack}>
          Back
        </button>
        <p className="authNotice">{error || 'Captain profile is unavailable.'}</p>
      </div>
    )
  }

  return (
    <div className="detailPage">
      <header className="topBar">
        <div className="brand">
          <img className="brandLogo" src="/logo.png" alt="Land Ho logo" />
          <span>Land Ho</span>
        </div>
        <button className="ghostBtn" onClick={handleBack}>
          Back
        </button>
      </header>

      <section className="hostResumeHeader">
        <div className="hostResumeAvatar">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.displayName || 'Captain'} />
          ) : (
            <div className="hostAvatarFallback">
              {(profile.displayName || 'H').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h1>{profile.displayName || 'Captain'}</h1>
          <p>{profile.city || 'Location not provided'}</p>
        </div>
      </section>

      <section className="detailInfoGrid">
        <article className="detailInfoCard">
          <h2>About</h2>
          <p>{profile.bio || 'This captain has not added an introduction yet.'}</p>
        </article>

        <article className="detailInfoCard">
          <h2>Skills</h2>
          {profile.skills.length === 0 ? (
            <p className="muted">No skills added yet.</p>
          ) : (
            <div className="hostSkillList">
              {profile.skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="detailInfoGrid">
        <article className="detailInfoCard">
          <h2>Experience</h2>
          {profile.experiences.length === 0 ? (
            <p className="muted">No experience added yet.</p>
          ) : (
            <div className="resumeStack">
              {profile.experiences.map((item) => (
                <div key={item.id} className="resumeStackItem">
                  <h3>{item.title || 'Untitled experience'}</h3>
                  <p>
                    {item.organization || 'Organization not provided'} ·{' '}
                    {[item.start, item.end || 'Present'].filter(Boolean).join(' - ')}
                  </p>
                  <p>{item.description || 'No description.'}</p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="detailInfoCard">
          <h2>Certificates</h2>
          {profile.certificates.length === 0 ? (
            <p className="muted">No certificates added yet.</p>
          ) : (
            <div className="resumeStack">
              {profile.certificates.map((item) => (
                <div key={item.id} className="resumeStackItem">
                  <h3>{item.name || 'Untitled certificate'}</h3>
                  <p>
                    {item.issuer || 'Issuer not provided'}
                    {item.year ? ` · ${item.year}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  )
}

export default HostResumePage
