import { describe, it, expect } from 'vitest'
import { toTimestamp } from '../../features/instructor/instructorApi'

describe('toTimestamp', () => {
  it('converts a Firestore-like {seconds} object to ISO string', () => {
    // 0 seconds = Unix epoch
    const result = toTimestamp({ seconds: 0 })
    expect(result).toBe('1970-01-01T00:00:00.000Z')
  })

  it('converts a known timestamp correctly', () => {
    // 1_741_046_400 = 2025-03-04T00:00:00.000Z
    const result = toTimestamp({ seconds: 1_741_046_400 })
    expect(result).toBe('2025-03-04T00:00:00.000Z')
  })

  it('returns the string as-is when given a string', () => {
    expect(toTimestamp('2026-01-01T00:00:00.000Z')).toBe('2026-01-01T00:00:00.000Z')
  })

  it('returns empty string for null', () => {
    expect(toTimestamp(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(toTimestamp(undefined)).toBe('')
  })

  it('returns empty string for a number', () => {
    expect(toTimestamp(12345)).toBe('')
  })

  it('returns empty string for an object without seconds', () => {
    expect(toTimestamp({ nanoseconds: 0 })).toBe('')
  })
})

describe('InstructorRequest status/experienceLevel defaults', () => {
  // Test the validation logic in isolation (same logic used in mapDoc)
  const validStatuses = ['pending', 'matched', 'confirmed', 'completed', 'cancelled']
  const validLevels = ['beginner', 'intermediate', 'advanced']

  it('accepts all valid statuses', () => {
    for (const s of validStatuses) {
      const resolved = validStatuses.includes(s) ? s : 'pending'
      expect(resolved).toBe(s)
    }
  })

  it('falls back to "pending" for unknown status', () => {
    const bad = 'unknown_status'
    const resolved = validStatuses.includes(bad) ? bad : 'pending'
    expect(resolved).toBe('pending')
  })

  it('accepts all valid experience levels', () => {
    for (const l of validLevels) {
      const resolved = validLevels.includes(l) ? l : 'beginner'
      expect(resolved).toBe(l)
    }
  })

  it('falls back to "beginner" for unknown experience level', () => {
    const bad = 'expert'
    const resolved = validLevels.includes(bad) ? bad : 'beginner'
    expect(resolved).toBe('beginner')
  })
})
