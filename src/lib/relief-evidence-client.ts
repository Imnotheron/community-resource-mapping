'use client'

export type ReliefEvidencePayload = {
  fileName: string
  mimeType: string
  size: number
  dataUrl: string
}

const MAX_FILES = 3
const MAX_TOTAL_BYTES = 2.75 * 1024 * 1024
const MAX_FILE_BYTES = 2.75 * 1024 * 1024
const MAX_DIMENSION = 1600

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

function inferMimeType(file: File) {
  if (ALLOWED_TYPES.has(file.type)) return file.type
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  return ''
}

function readAsDataUrl(file: Blob, mimeType: string) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the supporting photo.'))
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      if (comma < 0) {
        reject(new Error('Could not encode the supporting photo.'))
        return
      }
      resolve(`data:${mimeType};base64,${result.slice(comma + 1)}`)
    }
    reader.readAsDataURL(file)
  })
}

async function compressPhoto(file: File) {
  const mimeType = inferMimeType(file)
  if (!mimeType) {
    throw new Error(
      `${file.name} is not a supported photo. Use JPG, PNG, or WebP.`,
    )
  }

  if (file.size <= 1.25 * 1024 * 1024) {
    return { blob: file as Blob, mimeType }
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')

  if (!context) {
    bitmap.close()
    throw new Error('The browser could not prepare the supporting photo.')
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.8),
  )

  if (!blob) throw new Error(`${file.name} could not be compressed.`)
  return { blob, mimeType: 'image/jpeg' }
}

export async function serializeReliefEvidence(
  files: File[],
): Promise<ReliefEvidencePayload[]> {
  if (files.length < 1) {
    throw new Error(
      'At least one supporting photo is required before recording a relief distribution.',
    )
  }

  if (files.length > MAX_FILES) {
    throw new Error(`Attach no more than ${MAX_FILES} supporting photos.`)
  }

  const result: ReliefEvidencePayload[] = []
  let totalBytes = 0

  for (const file of files) {
    const { blob, mimeType } = await compressPhoto(file)

    if (blob.size > MAX_FILE_BYTES) {
      throw new Error(
        `${file.name} is too large even after compression. Retake the photo at a lower resolution.`,
      )
    }

    totalBytes += blob.size
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error(
        'The supporting photos are too large together. Use fewer photos or retake them at a lower resolution.',
      )
    }

    result.push({
      fileName: file.name.slice(0, 240),
      mimeType,
      size: blob.size,
      dataUrl: await readAsDataUrl(blob, mimeType),
    })
  }

  return result
}
