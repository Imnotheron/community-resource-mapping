export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch user with vulnerable profile details
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
        vulnerableProfile: {
          select: {
            id: true,
            userId: true,
            lastName: true,
            firstName: true,
            middleName: true,
            suffix: true,
            dateOfBirth: true,
            gender: true,
            civilStatus: true,
            mobileNumber: true,
            landlineNumber: true,
            emailAddress: true,
            houseNumber: true,
            street: true,
            barangay: true,
            municipality: true,
            province: true,
            latitude: true,
            longitude: true,
            educationalAttainment: true,
            employmentStatus: true,
            employmentDetails: true,
            vulnerabilityTypes: true,
            disabilityType: true,
            disabilityCause: true,
            disabilityIdNumber: true,
            hasMedicalCondition: true,
            medicalConditions: true,
            needsAssistance: true,
            assistanceType: true,
            emergencyContact: true,
            emergencyPhone: true,
            registrationStatus: true,
            rejectionReason: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}
