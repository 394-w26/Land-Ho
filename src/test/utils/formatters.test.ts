import { describe, it, expect } from 'vitest'
import { formatTripDate, formatDateTime, getUploadErrorText } from '../../utils/formatters'

describe('formatTripDate', () => {
  it('formats a valid ISO date string', () => {
    const result = formatTripDate('2026-07-04')
    expect(result).toBe('Jul 4, 2026')
  })

  it('returns the input unchanged if not in YYYY-MM-DD format', () => {
    expect(formatTripDate('Summer 2026')).toBe('Summer 2026')
    expect(formatTripDate('')).toBe('')
    expect(formatTripDate('07/04/2026')).toBe('07/04/2026')
  })

  it('handles month boundary correctly (Jan 1)', () => {
    const result = formatTripDate('2026-01-01')
    expect(result).toBe('Jan 1, 2026')
  })

  it('handles end of year (Dec 31)', () => {
    const result = formatTripDate('2025-12-31')
    expect(result).toBe('Dec 31, 2025')
  })
})

describe('formatDateTime', () => {
  it('returns "Just now" for empty string', () => {
    expect(formatDateTime('')).toBe('Just now')
  })

  it('returns the raw string if date is invalid', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date')
  })

  it('formats a valid ISO datetime', () => {
    // Use a fixed UTC timestamp and check it contains expected parts
    const result = formatDateTime('2026-03-04T14:30:00.000Z')
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/2026/)
  })
})

describe('getUploadErrorText', () => {
  it('returns generic message for non-Error values', () => {
    expect(getUploadErrorText(null)).toBe('Upload failed. Please try again.')
    expect(getUploadErrorText(42)).toBe('Upload failed. Please try again.')
    expect(getUploadErrorText('oops')).toBe('Upload failed. Please try again.')
  })

  it('returns storage-not-configured message', () => {
    expect(getUploadErrorText(new Error('storage-not-configured'))).toBe(
      'Firebase Storage is not configured. Please set your storage bucket first.',
    )
  })

  it('returns invalid-type message', () => {
    expect(getUploadErrorText(new Error('invalid-type'))).toBe(
      'Only image files are supported (jpg/png/webp, etc.).',
    )
  })

  it('returns file-too-large message', () => {
    expect(getUploadErrorText(new Error('file-too-large'))).toBe(
      'Image size must be 5MB or less.',
    )
  })

  it('returns generic message for unknown Error', () => {
    expect(getUploadErrorText(new Error('network-timeout'))).toBe(
      'Upload failed. Please try again.',
    )
  })
})
