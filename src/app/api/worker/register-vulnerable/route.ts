import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
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
      houseNumber,
      street,
      barangay,
      municipality,
      province,
      latitude,
      longitude,
      educationalAttainment,
      employmentStatus,
      employmentDetails,
      vulnerabilityTypes,
      disabilityType,
      disabilityCause,
      disabilityIdNumber,
      emergencyContact,
      emergencyPhone,
      hasMedicalCondition,
      medicalConditions,
      needsAssistance,
      assistanceType,
      workerId
    } = body

    // Generate a simple, readable temporary password (easy to type from email)
    const generateSimplePassword = () => {
      const letters = 'abcdefghjkmnpqrstuvwxyz' // no i, l, o to avoid confusion
      const digits = '23456789' // no 0, 1 to avoid confusion
      let password = ''
      for (let i = 0; i < 4; i++) {
        password += letters.charAt(Math.floor(Math.random() * letters.length))
      }
      for (let i = 0; i < 4; i++) {
        password += digits.charAt(Math.floor(Math.random() * digits.length))
      }
      return password
    }
    const defaultPassword = generateSimplePassword()
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    // Create user first
    const user = await db.user.create({
      data: {
        name: `${lastName}, ${firstName} ${middleName || ''} ${suffix || ''}`.trim(),
        email: emailAddress,
        role: 'VULNERABLE',
        phone: mobileNumber,
        password: hashedPassword
      }
    })

    // Create vulnerable profile
    const profile = await db.vulnerableProfile.create({
      data: {
        userId: user.id,
        lastName,
        firstName,
        middleName,
        suffix,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        civilStatus,
        mobileNumber,
        landlineNumber,
        emailAddress,
        houseNumber,
        street,
        barangay,
        municipality,
        province,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        educationalAttainment,
        employmentStatus,
        employmentDetails,
        vulnerabilityTypes: JSON.stringify(vulnerabilityTypes || []),
        disabilityType,
        disabilityCause,
        disabilityIdNumber,
        emergencyContact,
        emergencyPhone,
        hasMedicalCondition: !!hasMedicalCondition,
        medicalConditions,
        needsAssistance: !!needsAssistance,
        assistanceType,
        registrationStatus: 'PENDING',
        hasRepresentative: false
      }
    })

    // Send welcome email with credentials (fire-and-forget — don't block the response)
    // We pass defaultPassword here BEFORE it's hashed, as we can't recover it later
    if (user.email) {
      sendWelcomeEmail(user.email, user.name || 'User', 'VULNERABLE').catch(err =>
        console.error('Failed to send welcome email to vulnerable user:', err)
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Vulnerable person registered successfully',
      profile
    })
  } catch (error: any) {
    console.error('Error registering vulnerable person (worker):', error)
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'This email address is already registered in the system.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to register vulnerable person', details: error.message, code: error.code },
      { status: 500 }
    )
  }
}
