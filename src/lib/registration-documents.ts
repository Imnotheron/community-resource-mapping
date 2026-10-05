import { Buffer } from 'node:buffer'

export type StoredRegistrationDocument = {
  documentType: string
  fileName: string
  mimeType: string
  size: number
  fileUrl: string
}

const MAX_TOTAL_BYTES = 2.75 * 1024 * 1024
const MAX_FILE_BYTES = 2.75 * 1024 * 1024
const MAX_DOCUMENTS = 12

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

const ALLOWED_DOCUMENT_TYPES = new Set([
  'PWD_REGISTRATION_FORM',
  'MEDICAL_CERTIFICATE',
  'PROOF_OF_IDENTITY',
  'PROOF_OF_RESIDENCE',
  'ID_PHOTO',
])

function cleanText(value: unknown, max: number) {
  return String(value || '').trim().slice(0, max)
}

export function normalizeRegistrationDocuments(
  value: unknown,
): StoredRegistrationDocument[] {
  if (!Array.isArray(value)) return []

  if (value.length > MAX_DOCUMENTS) {
    throw new Error('Too many registration documents were submitted')
  }

  let totalBytes = 0

  return value.map((item) => {
    const documentType = cleanText(item?.documentType, 80).toUpperCase()
    const fileName = cleanText(item?.fileName, 240)
    const mimeType = cleanText(item?.mimeType, 120).toLowerCase()
    const dataUrl = String(item?.dataUrl || '')

    if (!ALLOWED_DOCUMENT_TYPES.has(documentType)) {
      throw new Error('Unsupported registration document type')
    }

    if (!fileName) {
      throw new Error('Registration document filename is missing')
    }

    if (!ALLOWED_TYPES.has(mimeType)) {
      throw new Error(`Unsupported document format for ${fileName}`)
    }

    const prefix = `data:${mimeType};base64,`
    if (!dataUrl.startsWith(prefix)) {
      throw new Error(`Invalid document data for ${fileName}`)
    }

    const base64 = dataUrl.slice(prefix.length)
    const bytes = Buffer.from(base64, 'base64')

    if (!bytes.length || bytes.length > MAX_FILE_BYTES) {
      throw new Error(`${fileName} is empty or exceeds the 2.75 MB file limit`)
    }

    totalBytes += bytes.length
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error('Combined registration documents exceed the 2.75 MB upload limit')
    }

    return {
      documentType,
      fileName,
      mimeType,
      size: bytes.length,
      fileUrl: `${prefix}${bytes.toString('base64')}`,
    }
  })
}
