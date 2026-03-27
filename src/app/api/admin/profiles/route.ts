export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const profiles = await db.vulnerableProfile.findMany({
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
        emergencyContact: true,
        emergencyPhone: true,
        hasMedicalCondition: true,
        medicalConditions: true,
        needsAssistance: true,
        assistanceType: true,
        hasRepresentative: true,
        representativeName: true,
        representativeRelationship: true,
        representativePhone: true,
        representativeEmail: true,
        hasAuthorizationLetter: true,
        registrationStatus: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            profilePicture: true,
            createdAt: true
          }
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            fileName: true,
            fileUrl: true,
            uploadedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      profiles
    })
  } catch (error) {
    console.error('Error fetching profiles:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profiles' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/profiles
 * Fully removes a vulnerable person's profile AND their User account,
 * freeing the email address so it can be re-used for a new registration.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { profileId } = await request.json()

    if (!profileId) {
      return NextResponse.json(
        { success: false, message: 'Profile ID is required' },
        { status: 400 }
      )
    }

    // Get profile and associated user ID
    const profile = await db.vulnerableProfile.findUnique({
      where: { id: profileId },
      include: { user: true }
    })

    if (!profile) {
      return NextResponse.json(
        { success: false, message: 'Profile not found' },
        { status: 404 }
      )
    }

    const userId = profile.userId

    // Delete in correct cascade order (children before parents)
    // 1. Vulnerability documents (FK: profileId)
    await db.vulnerabilityDocument.deleteMany({ where: { profileId } })

    // 2. Distribution records (if any)
    await db.distributionRecord.deleteMany({ where: { profileId } }).catch(() => {})

    // 3. Household record
    await db.household.deleteMany({ where: { vulnerableProfileId: profileId } })

    // 4. The vulnerable profile itself
    await db.vulnerableProfile.delete({ where: { id: profileId } })

    // 5. The User account — freeing the email for re-registration
    if (userId) {
      await db.user.delete({ where: { id: userId } })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile and user account deleted successfully. The email is now available for re-registration.'
    })
  } catch (error: any) {
    console.error('Error deleting vulnerable profile:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete profile', error: error.message },
      { status: 500 }
    )
  }
}
