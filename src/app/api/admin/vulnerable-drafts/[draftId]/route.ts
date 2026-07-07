export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
}

function requireAdminId(adminId: string) {
  if (!adminId) {
    return NextResponse.json(
      { success: false, message: 'Missing adminId. Please sign in again.' },
      { status: 400 }
    )
  }

  return null
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    await ensureDraftTable()

    const { draftId } = await params
    const body = await request.json().catch(() => ({}))
    const adminId = body?.adminId || ''
    const missingAdminResponse = requireAdminId(adminId)

    if (missingAdminResponse) return missingAdminResponse

    const deleteCount = await db.$executeRawUnsafe(
      `DELETE FROM "VulnerableRegistrationDraft" WHERE "id" = ? AND "adminId" = ?`,
      draftId,
      adminId
    )

    if (!deleteCount) {
      return NextResponse.json(
        { success: false, message: 'Draft not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Draft deleted',
    })
  } catch (error: any) {
    console.error('Error deleting vulnerable registration draft:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete vulnerable registration draft',
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
