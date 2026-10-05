'use client'

export type RegistrationDocumentPayload = {
  documentType: string
  fileName: string
  mimeType: string
  size: number
  dataUrl: string
}

const MAX_TOTAL_BYTES = 2.75 * 1024 * 1024
const MAX_FILE_BYTES = 2.75 * 1024 * 1024

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

function inferMimeType(file: File) {
  if (file.type) return file.type

  const lower = file.name.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.pdf')) return 'application/pdf'

  return ''
}

function readAsDataUrl(file: File, mimeType: string) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      if (comma < 0) {
        reject(new Error(`Could not encode ${file.name}`))
        return
      }

      resolve(`data:${mimeType};base64,${result.slice(comma + 1)}`)
    }

    reader.readAsDataURL(file)
  })
}

export async function serializeRegistrationDocuments(
  formData: Record<string, any>,
): Promise<RegistrationDocumentPayload[]> {
  const candidates: Array<{
    documentType: string
    file: File
  }> = []

  const add = (enabled: unknown, documentType: string, file: unknown) => {
    if (!enabled || !(file instanceof File)) return
    candidates.push({ documentType, file })
  }

  add(
    formData.hasPWDRegistrationForm,
    'PWD_REGISTRATION_FORM',
    formData.pwdRegistrationForm,
  )
  add(
    formData.hasMedicalCertificate,
    'MEDICAL_CERTIFICATE',
    formData.medicalCertificate,
  )
  add(
    formData.hasProofOfIdentity,
    'PROOF_OF_IDENTITY',
    formData.proofOfIdentity,
  )
  add(
    formData.hasProofOfResidence,
    'PROOF_OF_RESIDENCE',
    formData.proofOfResidence,
  )

  if (formData.hasIDPhotos && formData.idPhotos) {
    for (const file of Array.from(formData.idPhotos as FileList)) {
      if (file instanceof File) {
        candidates.push({
          documentType: 'ID_PHOTO',
          file,
        })
      }
    }
  }

  const totalBytes = candidates.reduce(
    (sum, item) => sum + item.file.size,
    0,
  )

  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new Error(
      'Selected registration documents are too large. Keep the combined files below 2.75 MB, or compress the images/PDFs before uploading.',
    )
  }

  const result: RegistrationDocumentPayload[] = []

  for (const { documentType, file } of candidates) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(
        `${file.name} is too large. Each registration document must be 2.75 MB or smaller.`,
      )
    }

    const mimeType = inferMimeType(file)
    if (!ALLOWED_TYPES.has(mimeType)) {
      throw new Error(
        `${file.name} has an unsupported format. Use JPG, PNG, WebP, or PDF.`,
      )
    }

    result.push({
      documentType,
      fileName: file.name.slice(0, 240),
      mimeType,
      size: file.size,
      dataUrl: await readAsDataUrl(file, mimeType),
    })
  }

  return result
}
