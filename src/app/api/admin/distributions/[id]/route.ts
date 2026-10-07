export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import {
  ensureReliefEvidenceColumn,
  parseReliefEvidence,
} from '@/lib/relief-evidence'
import { requireRequestUser } from '@/lib/request-user-session'

type RouteParams = {
  params: Promise<{ id: string }> | { id: string }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    await ensureReliefEvidenceColumn()

    const resolved = await Promise.resolve(params)
    const id = String(resolved.id || '').trim()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Distribution ID is required' },
        { status: 400 },
      )
    }

    const distribution = await db.reliefDistribution.findUnique({
      where: { id },
      select: {
        id: true,
        distributionDate: true,
        distributionType: true,
        itemsProvided: true,
        quantity: true,
        notes: true,
        supportingDocuments: true,
        status: true,
        rejectionReason: true,
        worker: {
          select: { id: true, name: true },
        },
        vulnerableProfile: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            suffix: true,
            barangay: true,
            vulnerabilityTypes: true,
          },
        },
        household: {
          select: {
            id: true,
            headOfHousehold: true,
            barangay: true,
          },
        },
      },
    })

    if (!distribution) {
      return NextResponse.json(
        { success: false, error: 'Relief distribution not found' },
        { status: 404 },
      )
    }

    const { supportingDocuments, ...details } = distribution

    return NextResponse.json({
      success: true,
      distribution: {
        ...details,
        supportingDocuments: parseReliefEvidence(supportingDocuments),
      },
    })
  } catch (error) {
    console.error('Error fetching relief distribution details:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch relief distribution details' },
      { status: 500 },
    )
  }
}
