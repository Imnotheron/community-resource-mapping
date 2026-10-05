export const dynamic = 'force-dynamic'

import { Buffer } from 'node:buffer'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

function safeFileName(value: string) {
  return value.replace(/[\r\n"]/g, '_').slice(0, 240) || 'document'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN', 'WORKER', 'VULNERABLE'],
    })
    if ('error' in auth) return auth.error

    const { id } = await params

    const document = await db.vulnerabilityDocument.findUnique({
      where: { id },
      include: {
        profile: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 },
      )
    }

    if (
      auth.role === 'VULNERABLE' &&
      document.profile.userId !== auth.userId
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      )
    }

    if (document.fileUrl.startsWith('/')) {
      return NextResponse.redirect(
        new URL(document.fileUrl, request.url),
      )
    }

    const match = document.fileUrl.match(
      /^data:([^;]+);base64,(.+)$/s,
    )

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error: 'This document has no stored file content',
        },
        { status: 404 },
      )
    }

    const [, mimeType, base64] = match
    const bytes = Buffer.from(base64, 'base64')

    return new NextResponse(bytes, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(bytes.length),
        'Content-Disposition': `inline; filename="${safeFileName(document.fileName)}"`,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Failed to load registration document:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load registration document',
      },
      { status: 500 },
    )
  }
}
