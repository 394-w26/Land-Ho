import { type ChangeEvent } from 'react'
import { type ProfileDraft, type ProfileSection, type ExperienceItem, type CertificateItem } from '../types'
import { Header } from './Header'

interface ProfileEditorProps {
  profileDraft: ProfileDraft
  profileSection: ProfileSection
  setProfileSection: (section: ProfileSection) => void
  profileNotice: string
  skillInput: string
  setSkillInput: (value: string) => void
  avatarUploading: boolean
  resolvedAvatarUrl: string
  userInitial: string
  completionPercent: number
  missingItems: string[]
  updateProfileDraft: (updater: (prev: ProfileDraft) => ProfileDraft) => void
  addSkill: () => void
  removeSkill: (skill: string) => void
  addExperience: () => void
  updateExperience: (id: string, field: keyof Omit<ExperienceItem, 'id'>, value: string) => void
  removeExperience: (id: string) => void
  addCertificate: () => void
  updateCertificate: (id: string, field: keyof Omit<CertificateItem, 'id'>, value: string) => void
  removeCertificate: (id: string) => void
  saveProfile: () => Promise<void>
  saveAndFinishProfile: () => Promise<void>
  handleAvatarUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onBackToHome: () => void
}

export default function ProfileEditor({
  profileDraft,
  profileSection,
  setProfileSection,
  profileNotice,
  skillInput,
  setSkillInput,
  avatarUploading,
  resolvedAvatarUrl,
  userInitial,
  completionPercent,
  missingItems,
  updateProfileDraft,
  addSkill,
  removeSkill,
  addExperience,
  updateExperience,
  removeExperience,
  addCertificate,
  updateCertificate,
  removeCertificate,
  saveProfile,
  saveAndFinishProfile,
  handleAvatarUpload,
  onBackToHome,
}: ProfileEditorProps) {
  return (
    <div className="profilePage">
      <Header brandText="Land Ho">
        <button className="ghostBtn" onClick={onBackToHome}>
          Back to home
        </button>
        <div className="progressBadge">{completionPercent}% complete</div>
      </Header>

      <section className="profileLayout">
        <aside className="profileNavCard">
          <h3>Personal Resume</h3>
          <div className="profileNavPills">
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
          </div>
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
