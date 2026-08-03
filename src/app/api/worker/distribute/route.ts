export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

function clean(value: unknown) {
  return String(value || '').trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const auth = await requireRequestUser(request, {
      allowedRoles: ['WORKER'],
      requestedUserId: clean(body.workerId),
    })
    if ('error' in auth) return auth.error

    const vulnerableProfileId = clean(body.vulnerableProfileId)
    const distributionType = clean(body.distributionType)
    const itemsProvided = clean(body.itemsProvided)
    const notes = clean(body.notes) || null
    const quantity = Number.parseInt(String(body.quantity), 10)

    if (!vulnerableProfileId || !distributionType || !itemsProvided) {
      return NextResponse.json(
        {
          success: false,
          error: 'Beneficiary, distribution type, and items provided are required',
        },
        { status: 400 },
      )
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a positive whole number' },
        { status: 400 },
      )
    }

    if (distributionType.length > 120 || itemsProvided.length > 1_000) {
      return NextResponse.json(
        { success: false, error: 'Distribution details are too long' },
        { status: 400 },
      )
    }

    if (notes && notes.length > 2_000) {
      return NextResponse.json(
        { success: false, error: 'Notes must be 2,000 characters or fewer' },
        { status: 400 },
      )
    }

    const beneficiary = await db.vulnerableProfile.findUnique({
      where: { id: vulnerableProfileId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        barangay: true,
        registrationStatus: true,
      },
    })

    if (!beneficiary) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary was not found' },
        { status: 404 },
      )
    }

    if (beneficiary.registrationStatus !== 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Relief distributions can only be recorded for approved citizens',
        },
        { status: 409 },
      )
    }

    const distribution = await db.reliefDistribution.create({
      data: {
        vulnerableProfileId: beneficiary.id,
        workerId: auth.userId,
        distributionDate: new Date(),
        distributionType,
        itemsProvided,
        quantity,
        notes,
        status: 'PENDING',
      },
      select: {
        id: true,
        distributionType: true,
        itemsProvided: true,
        quantity: true,
        distributionDate: true,
        notes: true,
        status: true,
        createdAt: true,
        vulnerableProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            barangay: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Distribution recorded and sent for Administrator approval',
        distribution,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error recording relief distribution:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record distribution' },
      { status: 500 },
    )
  }
}
