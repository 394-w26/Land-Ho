import { type ChangeEvent } from 'react'
import { type ProfileDraft, type ProfileSection } from '../types'
import { Header } from './Header'
import FeedbackModal from './FeedbackModal'

interface ProfileEditorProps {
  profileDraft: ProfileDraft
  profileSection: ProfileSection
  setProfileSection: (section: ProfileSection) => void
  profileNotice: string
  profileSuccessModal: string
  setProfileSuccessModal: (msg: string) => void
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
  profileSuccessModal,
  setProfileSuccessModal,
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

      {profileSuccessModal && (
        <FeedbackModal
          title="Profile Updated"
          message={profileSuccessModal}
          onClose={() => setProfileSuccessModal('')}
        />
      )}
    </div>
  )
}
