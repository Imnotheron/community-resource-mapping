import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createNotification } from '@/lib/notification-service'

// GET - Get all pending relief distributions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'PENDING'

    const distributions = await db.reliefDistribution.findMany({
      where: { status: status as any },
      include: {
        vulnerableProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        household: true,
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      distributions,
    })
  } catch (error) {
    console.error('Error fetching relief distributions:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch distributions' },
      { status: 500 }
    )
  }
}

// POST - Approve or reject relief distribution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { distributionId, action, reason } = body // action: 'APPROVE' | 'REJECT'

    if (!distributionId || !action) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the distribution
    const distribution = await db.reliefDistribution.findUnique({
      where: { id: distributionId },
      include: {
        vulnerableProfile: {
          include: { user: true },
        },
      },
    })

    if (!distribution) {
      return NextResponse.json(
        { success: false, message: 'Distribution not found' },
        { status: 404 }
      )
    }

    // Update distribution status
    const updatedDistribution = await db.reliefDistribution.update({
      where: { id: distributionId },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        rejectionReason: action === 'REJECT' ? reason : null,
      },
    })

    // Send notification to user
    if (distribution.vulnerableProfile?.userId) {
      const notificationType = action === 'APPROVE' ? 'RELIEF_APPROVED' : 'RELIEF_REJECTED'
      await createNotification({
        userId: distribution.vulnerableProfile.userId,
        type: notificationType,
        reason: reason || undefined,
        details: `${distribution.distributionType} - ${distribution.itemsProvided}`,
      })
    }

    return NextResponse.json({
      success: true,
      distribution: updatedDistribution,
    })
  } catch (error) {
    console.error('Error updating distribution:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update distribution' },
      { status: 500 }
    )
  }
}
