import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      vulnerableProfileId,
      workerId,
      distributionType,
      itemsProvided,
      quantity,
      notes
    } = body

    // Get worker details
    const worker = await db.user.findUnique({
      where: { id: workerId }
    })

    if (!worker) {
      return NextResponse.json(
        { success: false, error: 'Worker not found' },
        { status: 404 }
      )
    }

    // Create relief distribution
    const distribution = await db.reliefDistribution.create({
      data: {
        vulnerableProfileId,
        workerId,
        distributionDate: new Date(),
        distributionType,
        itemsProvided,
        quantity: parseInt(quantity),
        notes
      },
      include: {
        vulnerableProfile: {
          include: {
            user: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Relief distributed successfully',
      distribution
    })
  } catch (error) {
    console.error('Error distributing relief:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to distribute relief' },
      { status: 500 }
    )
  }
}
