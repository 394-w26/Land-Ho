import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from './firebase'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, '_')

export const uploadImageToStorage = async (path: string, file: File): Promise<string> => {
  if (!storage) {
    throw new Error('storage-not-configured')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('invalid-type')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('file-too-large')
  }
  const safePath = `${path}/${Date.now()}-${sanitizeFileName(file.name)}`
  const storageRef = ref(storage, safePath)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
