import { Buffer } from 'node:buffer'

import { db } from '@/lib/db'

export type StoredReliefEvidence = {
  fileName: string
  mimeType: string
  size: number
  dataUrl: string
}

const MAX_FILES = 3
const MAX_TOTAL_BYTES = 2.75 * 1024 * 1024
const MAX_FILE_BYTES = 2.75 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function cleanText(value: unknown, max: number) {
  return String(value || '').trim().slice(0, max)
}

export async function ensureReliefEvidenceColumn() {
  const columns = await db.$queryRawUnsafe<Array<{ name: string }>>(
    'PRAGMA table_info("ReliefDistribution")',
  )

  if (!columns.some((column) => column.name === 'supportingDocuments')) {
    await db.$executeRawUnsafe(
      'ALTER TABLE "ReliefDistribution" ADD COLUMN "supportingDocuments" TEXT NOT NULL DEFAULT \'[]\'',
    )
  }
}

export function normalizeReliefEvidence(value: unknown): StoredReliefEvidence[] {
  if (!Array.isArray(value) || value.length < 1) {
    throw new Error(
      'At least one supporting photo is required for every relief distribution.',
    )
  }

  if (value.length > MAX_FILES) {
    throw new Error(`No more than ${MAX_FILES} supporting photos are allowed.`)
  }

  let totalBytes = 0

  return value.map((item) => {
    const fileName = cleanText(item?.fileName, 240)
    const mimeType = cleanText(item?.mimeType, 120).toLowerCase()
    const dataUrl = String(item?.dataUrl || '')

    if (!fileName) throw new Error('A supporting photo filename is missing.')
    if (!ALLOWED_TYPES.has(mimeType)) {
      throw new Error(`Unsupported supporting photo format for ${fileName}.`)
    }

    const prefix = `data:${mimeType};base64,`
    if (!dataUrl.startsWith(prefix)) {
      throw new Error(`Invalid supporting photo data for ${fileName}.`)
    }

    const bytes = Buffer.from(dataUrl.slice(prefix.length), 'base64')
    if (!bytes.length || bytes.length > MAX_FILE_BYTES) {
      throw new Error(`${fileName} is empty or exceeds the file-size limit.`)
    }

    totalBytes += bytes.length
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error('Combined supporting photos exceed the upload limit.')
    }

    return {
      fileName,
      mimeType,
      size: bytes.length,
      dataUrl: `${prefix}${bytes.toString('base64')}`,
    }
  })
}

export function parseReliefEvidence(
  value: string | null | undefined,
): StoredReliefEvidence[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        fileName: cleanText(item.fileName, 240) || 'Supporting photo',
        mimeType: cleanText(item.mimeType, 120).toLowerCase(),
        size: Number(item.size) || 0,
        dataUrl: String(item.dataUrl || ''),
      }))
      .filter(
        (item) =>
          ALLOWED_TYPES.has(item.mimeType) &&
          item.dataUrl.startsWith(`data:${item.mimeType};base64,`),
      )
  } catch {
    return []
  }
}
