export const dynamic = 'force-dynamic'

import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

function createDraftTitle(formData: any) {
  const fullName = [formData?.firstName, formData?.middleName, formData?.lastName]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (fullName && formData?.barangay) return `${fullName} · ${formData.barangay}`
  if (fullName) return fullName
  if (formData?.barangay) return `Unnamed citizen · ${formData.barangay}`

  return `Untitled draft · ${new Date().toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`
}

function parseDraftFormData(value: unknown) {
  if (!value) return {}
  if (typeof value === 'object') return value

  try {
    return JSON.parse(String(value))
  } catch {
    return {}
  }
}

function serializeDraft(row: any) {
  return {
    id: row.id,
    adminId: row.adminId,
    title: row.title,
    formData: parseDraftFormData(row.formData),
    currentStep: Number(row.currentStep || 0),
    status: row.status || 'DRAFT',
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  }
}

async function ensureDraftTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "VulnerableRegistrationDraft" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "adminId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "formData" TEXT NOT NULL,
      "currentStep" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "VulnerableRegistrationDraft_adminId_idx" ON "VulnerableRegistrationDraft"("adminId")`,
  )
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['WORKER'],
    })
    if ('error' in auth) return auth.error

    await ensureDraftTable()

    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM "VulnerableRegistrationDraft"
       WHERE "adminId" = ? AND "status" = ?
       ORDER BY "updatedAt" DESC
       LIMIT 50`,
      auth.userId,
      'DRAFT',
    )

    return NextResponse.json({
      success: true,
      drafts: rows.map(serializeDraft),
    })
  } catch (error: any) {
    console.error('Error loading worker vulnerable registration drafts:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load vulnerable registration drafts',
        error: error?.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    const auth = await requireRequestUser(request, {
      allowedRoles: ['WORKER'],
      requestedUserId: String(body.workerId || '').trim() || undefined,
    })
    if ('error' in auth) return auth.error

    await ensureDraftTable()

    const {
      draftId = null,
      title = '',
      formData = {},
      currentStep = 0,
    } = body

    const safeTitle = title || createDraftTitle(formData)
    const serializedFormData = JSON.stringify(formData || {})
    const safeCurrentStep = Number.isFinite(Number(currentStep))
      ? Math.max(0, Math.min(Number(currentStep), 4))
      : 0

    if (draftId) {
      const updateCount = await db.$executeRawUnsafe(
        `UPDATE "VulnerableRegistrationDraft"
         SET "title" = ?, "formData" = ?, "currentStep" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ? AND "adminId" = ? AND "status" = ?`,
        safeTitle,
        serializedFormData,
        safeCurrentStep,
        draftId,
        auth.userId,
        'DRAFT',
      )

      if (!updateCount) {
        return NextResponse.json(
          { success: false, message: 'Draft not found' },
          { status: 404 },
        )
      }

      const rows = await db.$queryRawUnsafe<any[]>(
        `SELECT * FROM "VulnerableRegistrationDraft"
         WHERE "id" = ? AND "adminId" = ?
         LIMIT 1`,
        draftId,
        auth.userId,
      )

      return NextResponse.json({
        success: true,
        message: 'Draft updated',
        draft: serializeDraft(rows[0]),
      })
    }

    const id = `draft_${randomUUID()}`

    await db.$executeRawUnsafe(
      `INSERT INTO "VulnerableRegistrationDraft"
       ("id", "adminId", "title", "formData", "currentStep", "status", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      id,
      auth.userId,
      safeTitle,
      serializedFormData,
      safeCurrentStep,
      'DRAFT',
    )

    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM "VulnerableRegistrationDraft"
       WHERE "id" = ? AND "adminId" = ?
       LIMIT 1`,
      id,
      auth.userId,
    )

    return NextResponse.json({
      success: true,
      message: 'Draft saved',
      draft: serializeDraft(rows[0]),
    })
  } catch (error: any) {
    console.error('Error saving worker vulnerable registration draft:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to save vulnerable registration draft',
        error: error?.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
