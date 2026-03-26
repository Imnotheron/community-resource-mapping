import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    const where = status ? { status: status.toUpperCase() as any } : {}

    const requests = await db.adminSignupRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    // Remove password from response
    const sanitizedRequests = requests.map(req => ({
      ...req,
      password: '***'
    }))

    return NextResponse.json({
      success: true,
      requests: sanitizedRequests
    })
  } catch (error) {
    console.error('Error fetching signup requests:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch signup requests' },
      { status: 500 }
    )
  }
}
