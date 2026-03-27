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
      { success: false, error: 'Failed to fetch profiles' },
      { status: 500 }
    )
  }
}
