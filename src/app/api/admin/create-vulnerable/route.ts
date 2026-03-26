import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate required fields
    const requiredFields = [
      'lastName', 'firstName', 'dateOfBirth', 'gender', 'civilStatus',
      'mobileNumber', 'emailAddress', 'houseNumber', 'street', 'barangay',
      'municipality', 'province', 'vulnerabilityTypes', 'emergencyContact', 'emergencyPhone',
      'email', 'password', 'name'
    ]

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Create user
    const user = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: 'VULNERABLE',
        phone: data.mobileNumber
      }
    })

    // Create vulnerable profile
    const profile = await db.vulnerableProfile.create({
      data: {
        userId: user.id,
        lastName: data.lastName,
        firstName: data.firstName,
        middleName: data.middleName || '',
        suffix: data.suffix || '',
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        civilStatus: data.civilStatus,
        mobileNumber: data.mobileNumber,
        landlineNumber: data.landlineNumber || '',
        emailAddress: data.emailAddress,
        houseNumber: data.houseNumber,
        street: data.street,
        barangay: data.barangay,
        municipality: data.municipality,
        province: data.province,
        latitude: parseFloat(data.latitude) || 12.1792,
        longitude: parseFloat(data.longitude) || 125.5072,
        educationalAttainment: data.educationalAttainment || '',
        employmentStatus: data.employmentStatus || '',
        employmentDetails: data.employmentDetails || '',
        vulnerabilityTypes: data.vulnerabilityTypes,
        disabilityType: data.disabilityType || '',
        disabilityCause: data.disabilityCause || '',
        disabilityIdNumber: data.disabilityIdNumber || '',
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone,
        hasMedicalCondition: false,
        medicalConditions: '',
        needsAssistance: false,
        assistanceType: '',
        hasRepresentative: false,
        representativeName: '',
        representativeRelationship: '',
        representativePhone: '',
        representativeEmail: '',
        hasAuthorizationLetter: false,
        registrationStatus: 'APPROVED', // Admin-created accounts are auto-approved
        rejectionReason: ''
      }
    })

    // Send email notification with temporary password
    sendWelcomeEmail(data.email, data.name, 'VULNERABLE', data.password)
      .catch(err => console.error('Failed to send email:', err))

    return NextResponse.json({
      success: true,
      message: 'Vulnerable user created successfully. Login credentials have been sent to their email.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      profile: {
        id: profile.id,
        fullName: `${profile.firstName} ${profile.lastName}`,
        registrationStatus: profile.registrationStatus
      }
    })
  } catch (error: any) {
    console.error('Error creating vulnerable user (admin create):', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create vulnerable user', details: error.message, code: error.code },
      { status: 500 }
    )
  }
}
