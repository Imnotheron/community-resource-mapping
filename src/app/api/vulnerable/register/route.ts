import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      // Personal Information
      lastName,
      firstName,
      middleName,
      suffix,
      dateOfBirth,
      gender,
      civilStatus,
      mobileNumber,
      landlineNumber,
      emailAddress,
      // Address
      houseNumber,
      street,
      barangay,
      municipality,
      province,
      latitude,
      longitude,
      // Educational & Employment
      educationalAttainment,
      employmentStatus,
      employmentDetails,
      // Vulnerability Assessment
      selectedVulnerabilities,
      disabilityType,
      disabilityCause,
      disabilityIdNumber,
      otherVulnerabilityDescription,
      hasMedicalCondition,
      medicalConditions,
      needsAssistance,
      assistanceType,
      // Representative Information
      hasRepresentative,
      representativeName,
      representativeRelationship,
      representativePhone,
      representativeEmail,
      hasAuthorizationLetter,
      // Emergency
      emergencyContact,
      emergencyPhone,
      // Other
      documents
    } = body

    // Check if user already has a profile
    const existingProfile = await db.vulnerableProfile.findUnique({
      where: { userId }
    })

    if (existingProfile) {
      return NextResponse.json(
        { success: false, message: 'Profile already exists' },
        { status: 400 }
      )
    }

    // Create vulnerable profile with all new fields
    const profile = await db.vulnerableProfile.create({
      data: {
        userId,
        // Personal Information
        lastName: lastName || '',
        firstName: firstName || '',
        middleName: middleName || '',
        suffix: suffix || '',
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        civilStatus: civilStatus || null,
        mobileNumber: mobileNumber || '',
        landlineNumber: landlineNumber || '',
        emailAddress: emailAddress || '',
        // Address
        houseNumber: houseNumber || '',
        street: street || '',
        barangay: barangay || '',
        municipality: municipality || 'San Policarpo',
        province: province || 'Eastern Samar',
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        // Educational & Employment
        educationalAttainment: educationalAttainment || '',
        employmentStatus: employmentStatus || '',
        employmentDetails: employmentDetails || '',
        // Vulnerability Assessment
        vulnerabilityTypes: JSON.stringify(selectedVulnerabilities || []),
        disabilityType: disabilityType || null,
        disabilityCause: disabilityCause || null,
        disabilityIdNumber: disabilityIdNumber || '',
        // Emergency Contact
        emergencyContact: emergencyContact || '',
        emergencyPhone: emergencyPhone || '',
        // Medical & Assistance
        hasMedicalCondition: !!hasMedicalCondition,
        medicalConditions: medicalConditions || '',
        needsAssistance: !!needsAssistance,
        assistanceType: assistanceType || '',
        // Representative Information
        hasRepresentative: !!hasRepresentative,
        representativeName: representativeName || '',
        representativeRelationship: representativeRelationship || '',
        representativePhone: representativePhone || '',
        representativeEmail: representativeEmail || '',
        hasAuthorizationLetter: !!hasAuthorizationLetter,
        // Registration Status
        registrationStatus: 'PENDING'
      }
    })

    // Create household record
    await db.household.create({
      data: {
        address: `${houseNumber || ''} ${street || ''}, ${barangay || ''}`,
        barangay: barangay || '',
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        headOfHousehold: '', // Will be updated by admin
        totalMembers: 1,
        vulnerableMembers: 1,
        vulnerableProfileId: profile.id
      }
    })

    // Create document records
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        await db.vulnerabilityDocument.create({
          data: {
            profileId: profile.id,
            documentType: doc.documentType,
            fileName: doc.fileName,
            fileUrl: doc.fileUrl
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully',
      profileId: profile.id
    })
  } catch (error: any) {
    console.error('Registration error details:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Registration failed', 
        error: error.message,
        code: error.code // Prisma error codes
      },
      { status: 500 }
    )
  }
}
