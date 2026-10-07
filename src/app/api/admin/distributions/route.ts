export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import {
  ensureReliefEvidenceColumn,
  parseReliefEvidence,
} from '@/lib/relief-evidence'
import { requireRequestUser } from '@/lib/request-user-session'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    await ensureReliefEvidenceColumn()

    const distributions = await db.reliefDistribution.findMany({
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
        createdAt: true,
        updatedAt: true,
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
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
      orderBy: {
        distributionDate: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      distributions: distributions.map(
        ({ supportingDocuments, ...distribution }) => ({
          ...distribution,
          supportingDocumentCount:
            parseReliefEvidence(supportingDocuments).length,
        }),
      ),
    })
  } catch (error) {
    console.error('Error fetching distributions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch distributions' },
      { status: 500 },
    )
  }
}
