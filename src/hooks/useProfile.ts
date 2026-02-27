import { useState, useMemo, useCallback, type ChangeEvent } from 'react'
import { type User } from 'firebase/auth'
import {
  profileStorageKey,
  loadStoredProfileDraft,
} from '../data/constants'
import {
  type ProfileDraft,
  type ProfileSection,
  type ExperienceItem,
  type CertificateItem,
} from '../types'
import { uploadImageToStorage } from '../lib/storage'
import { upsertUserPublicProfile } from '../features/users/usersApi'
import { getUploadErrorText } from '../utils/formatters'

export function useProfile(viewer: User | null) {
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => loadStoredProfileDraft())
  const [profileSection, setProfileSection] = useState<ProfileSection>('basic')
  const [profileNotice, setProfileNotice] = useState('')
  const [profileSuccessModal, setProfileSuccessModal] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  const draftAvatar = profileDraft.avatarUrl.trim()
  const googleAvatar = viewer?.photoURL?.trim() || ''
  const resolvedAvatarUrl = viewer ? draftAvatar || googleAvatar : ''

  const completionChecks = useMemo(() => {
    return [
      { key: 'name', ok: profileDraft.displayName.trim().length >= 2, label: 'Display name must be at least 2 characters' },
      { key: 'city', ok: profileDraft.city.trim().length > 0, label: 'Add your city' },
      { key: 'bio', ok: profileDraft.bio.trim().length >= 30, label: 'Bio must be at least 30 characters' },
      { key: 'skills', ok: profileDraft.skills.length >= 2, label: 'Add at least 2 skills' },
      { key: 'experiences', ok: profileDraft.experiences.length >= 1, label: 'Add at least 1 experience' },
    ]
  }, [profileDraft])

  const completedCount = completionChecks.filter((item) => item.ok).length
  const completionPercent = Math.round((completedCount / completionChecks.length) * 100)
  const missingItems = completionChecks.filter((item) => !item.ok).map((item) => item.label)
  const resumeCompleted = missingItems.length === 0

  const updateProfileDraft = useCallback((updater: (prev: ProfileDraft) => ProfileDraft) => {
    setProfileDraft((prev) => {
      const next = updater(prev)
      window.localStorage.setItem(profileStorageKey, JSON.stringify(next))
      return next
    })
  }, [])

  const syncFromAuth = useCallback((user: User | null) => {
    if (!user) {
      return
    }
    setProfileDraft((prev) => {
      const nextDisplayName = prev.displayName || user.displayName || ''
      const nextAvatarUrl = prev.avatarUrl || user.photoURL || ''
      if (nextDisplayName === prev.displayName && nextAvatarUrl === prev.avatarUrl) {
        return prev
      }
      const next = { ...prev, displayName: nextDisplayName, avatarUrl: nextAvatarUrl }
      window.localStorage.setItem(profileStorageKey, JSON.stringify(next))
      return next
    })
  }, [])

  const addSkill = () => {
    const nextSkill = skillInput.trim()
    if (!nextSkill || profileDraft.skills.includes(nextSkill)) {
      return
    }
    updateProfileDraft((prev) => ({ ...prev, skills: [...prev.skills, nextSkill] }))
    setSkillInput('')
  }

  const removeSkill = (skill: string) => {
    updateProfileDraft((prev) => ({ ...prev, skills: prev.skills.filter((item) => item !== skill) }))
  }

  const addExperience = () => {
    updateProfileDraft((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        {
          id: `exp-${Date.now()}`,
          title: '',
          organization: '',
          start: '',
          end: '',
          description: '',
        },
      ],
    }))
  }

  const updateExperience = (id: string, field: keyof Omit<ExperienceItem, 'id'>, value: string) => {
    updateProfileDraft((prev) => ({
      ...prev,
      experiences: prev.experiences.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
  }

  const removeExperience = (id: string) => {
    updateProfileDraft((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((item) => item.id !== id),
    }))
  }

  const addCertificate = () => {
    updateProfileDraft((prev) => ({
      ...prev,
      certificates: [...prev.certificates, { id: `cert-${Date.now()}`, name: '', issuer: '', year: '' }],
    }))
  }

  const updateCertificate = (id: string, field: keyof Omit<CertificateItem, 'id'>, value: string) => {
    updateProfileDraft((prev) => ({
      ...prev,
      certificates: prev.certificates.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const removeCertificate = (id: string) => {
    updateProfileDraft((prev) => ({
      ...prev,
      certificates: prev.certificates.filter((item) => item.id !== id),
    }))
  }

  const saveProfile = async () => {
    window.localStorage.setItem(profileStorageKey, JSON.stringify(profileDraft))
    if (viewer) {
      try {
        await upsertUserPublicProfile({
          uid: viewer.uid,
          displayName: profileDraft.displayName || viewer.displayName || viewer.email || 'Captain',
          avatarUrl: resolvedAvatarUrl,
          city: profileDraft.city,
          bio: profileDraft.bio,
          skills: profileDraft.skills,
          experiences: profileDraft.experiences,
          certificates: profileDraft.certificates,
        })
      } catch {
        setProfileNotice('Local draft saved, but syncing public profile failed.')
        return
      }
    }
    setProfileSuccessModal('Profile draft saved.')
  }

  const saveAndFinishProfile = async () => {
    await saveProfile()
    if (!resumeCompleted) {
      setProfileNotice(`${missingItems.length} item(s) remaining: ${missingItems.join(', ')}`)
      return
    }
    setProfileSuccessModal('Profile completed! You can now book and publish boats.')
  }

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    if (!viewer) {
      setProfileNotice('Please sign in before uploading an avatar.')
      return
    }
    setAvatarUploading(true)
    setProfileNotice('Uploading avatar...')
    try {
      const uploadedUrl = await uploadImageToStorage(`avatars/${viewer.uid}`, file)
      updateProfileDraft((prev) => ({ ...prev, avatarUrl: uploadedUrl }))
      setProfileSuccessModal('Avatar uploaded successfully.')
    } catch (error) {
      setProfileNotice(getUploadErrorText(error))
    } finally {
      setAvatarUploading(false)
    }
  }

  return {
    profileDraft,
    profileSection,
    setProfileSection,
    profileNotice,
    setProfileNotice,
    profileSuccessModal,
    setProfileSuccessModal,
    skillInput,
    setSkillInput,
    avatarUploading,
    resolvedAvatarUrl,
    completionPercent,
    missingItems,
    resumeCompleted,
    updateProfileDraft,
    syncFromAuth,
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
  }
}
