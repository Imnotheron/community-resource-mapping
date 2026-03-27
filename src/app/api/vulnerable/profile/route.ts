export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    const profile = await db.vulnerableProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePicture: true
          }
        },
        reliefDistributions: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            feedback: {
              where: { userId },
              select: {
                id: true,
                feedbackType: true,
                status: true,
                createdAt: true
              }
            }
          },
          orderBy: {
            distributionDate: 'desc'
          }
        }
      }
    })

    if (!profile) {
      return NextResponse.json(
        { success: false, message: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      profile
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
