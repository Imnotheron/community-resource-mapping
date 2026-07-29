export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRoles } from '@/lib/server-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ['WORKER'])
    if (auth.error) return auth.error

    const body = await request.json()
    const vulnerableProfileId = String(body.vulnerableProfileId || '').trim()
    const distributionType = String(body.distributionType || '').trim()
    const itemsProvided = String(body.itemsProvided || '').trim()
    const notes = String(body.notes || '').trim() || null
    const quantity = Number(body.quantity)

    if (!vulnerableProfileId || !distributionType || !itemsProvided) {
      return NextResponse.json(
        { success: false, error: 'Required distribution fields are missing' },
        { status: 400 },
      )
    }

    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100000) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a positive whole number' },
        { status: 400 },
      )
    }

    const profile = await db.vulnerableProfile.findUnique({
      where: { id: vulnerableProfileId },
      select: { id: true, registrationStatus: true },
    })

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Vulnerable profile not found' },
        { status: 404 },
      )
    }

    if (String(profile.registrationStatus).toUpperCase() !== 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Relief can only be recorded for an approved profile',
        },
        { status: 409 },
      )
    }

    const distribution = await db.reliefDistribution.create({
      data: {
        vulnerableProfileId,
        workerId: auth.user.id,
        distributionDate: new Date(),
        distributionType,
        itemsProvided,
        quantity,
        notes,
      },
      include: {
        vulnerableProfile: {
          include: { user: true },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Relief distribution recorded successfully',
        distribution,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error distributing relief:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record relief distribution' },
      { status: 500 },
    )
  }
}
