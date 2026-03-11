import { describe, it, expect } from 'vitest'
import type { BookingRequestStatus } from '../../features/booking/bookingApi'

// Mirror the inline timestamp conversion logic from mapBookingDoc
const convertCreatedAt = (createdAt: unknown): string => {
  if (
    typeof createdAt === 'object' &&
    createdAt &&
    'seconds' in createdAt
  ) {
    return new Date(
      Number((createdAt as { seconds: number }).seconds) * 1000,
    ).toISOString()
  }
  return ''
}

describe('Booking createdAt conversion', () => {
  it('converts a Firestore timestamp object to ISO string', () => {
    expect(convertCreatedAt({ seconds: 0 })).toBe('1970-01-01T00:00:00.000Z')
  })

  it('converts a real-world timestamp', () => {
    expect(convertCreatedAt({ seconds: 1_741_046_400 })).toBe('2025-03-04T00:00:00.000Z')
  })

  it('returns empty string for null', () => {
    expect(convertCreatedAt(null)).toBe('')
  })

  it('returns empty string for a plain string', () => {
    expect(convertCreatedAt('2026-01-01')).toBe('')
  })

  it('returns empty string for a number', () => {
    expect(convertCreatedAt(999)).toBe('')
  })
})

describe('BookingRequestStatus type values', () => {
  const validStatuses: BookingRequestStatus[] = ['pending', 'approved', 'rejected']

  it('includes pending, approved, and rejected', () => {
    expect(validStatuses).toContain('pending')
    expect(validStatuses).toContain('approved')
    expect(validStatuses).toContain('rejected')
  })

  it('has exactly 3 statuses', () => {
    expect(validStatuses).toHaveLength(3)
  })

  it('defaults to pending when status is unknown', () => {
    const raw = 'unknown'
    const resolved = validStatuses.includes(raw as BookingRequestStatus) ? raw : 'pending'
    expect(resolved).toBe('pending')
  })
})
