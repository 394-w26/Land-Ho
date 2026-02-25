export const formatTripDate = (value: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  const parsedDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate)
}

export const formatDateTime = (isoText: string): string => {
  if (!isoText) {
    return 'Just now'
  }
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) {
    return isoText
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export const getUploadErrorText = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Upload failed. Please try again.'
  }
  if (error.message === 'storage-not-configured') {
    return 'Firebase Storage is not configured. Please set your storage bucket first.'
  }
  if (error.message === 'invalid-type') {
    return 'Only image files are supported (jpg/png/webp, etc.).'
  }
  if (error.message === 'file-too-large') {
    return 'Image size must be 5MB or less.'
  }
  return 'Upload failed. Please try again.'
}
