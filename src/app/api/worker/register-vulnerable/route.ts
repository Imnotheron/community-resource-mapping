export const dynamic = 'force-dynamic'

import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/email'
import { requireRequestUser } from '@/lib/request-user-session'

function clean(value: unknown) {
  return String(value || '').trim()
}

function optional(value: unknown) {
  const text = clean(value)
  return text || null
}

function coordinate(value: unknown) {
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

function temporaryPassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  let password = ''

  for (let index = 0; index < 4; index += 1) {
    password += letters.charAt(Math.floor(Math.random() * letters.length))
  }
  for (let index = 0; index < 4; index += 1) {
    password += digits.charAt(Math.floor(Math.random() * digits.length))
  }

  return password
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const auth = await requireRequestUser(request, {
      allowedRoles: ['WORKER'],
      requestedUserId: clean(body.workerId),
    })
    if ('error' in auth) return auth.error

    const lastName = clean(body.lastName)
    const firstName = clean(body.firstName)
    const emailAddress = clean(body.emailAddress).toLowerCase()
    const dateOfBirthText = clean(body.dateOfBirth)
    const gender = clean(body.gender)
    const civilStatus = clean(body.civilStatus)
    const barangay = clean(body.barangay)
    const municipality = clean(body.municipality)
    const province = clean(body.province)
    const emergencyContact = clean(body.emergencyContact)
    const emergencyPhone = clean(body.emergencyPhone)

    if (
      !lastName ||
      !firstName ||
      !emailAddress ||
      !dateOfBirthText ||
      !gender ||
      !civilStatus ||
      !barangay ||
      !municipality ||
      !province ||
      !emergencyContact ||
      !emergencyPhone
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Complete all required identity, address, and emergency-contact fields',
        },
        { status: 400 },
      )
    }

    const dateOfBirth = new Date(dateOfBirthText)
    if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid date of birth' },
        { status: 400 },
      )
    }

    if (!/^\S+@\S+\.\S+$/.test(emailAddress)) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid email address' },
        { status: 400 },
      )
    }

    const latitude = coordinate(body.latitude)
    const longitude = coordinate(body.longitude)
    if (
      (latitude !== null && (latitude < -90 || latitude > 90)) ||
      (longitude !== null && (longitude < -180 || longitude > 180))
    ) {
      return NextResponse.json(
        { success: false, error: 'The selected map coordinates are invalid' },
        { status: 400 },
      )
    }

    const vulnerabilityTypes = Array.isArray(body.vulnerabilityTypes)
      ? body.vulnerabilityTypes
          .map((value: unknown) => clean(value).toUpperCase())
          .filter(Boolean)
          .slice(0, 30)
      : []

    const plainPassword = temporaryPassword()
    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    const created = await db.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          name: `${lastName}, ${firstName} ${clean(body.middleName)} ${clean(body.suffix)}`
            .replace(/\s+/g, ' ')
            .trim(),
          email: emailAddress,
          role: 'VULNERABLE',
          phone: optional(body.mobileNumber),
          password: hashedPassword,
          temporaryPasswordIssued: true,
          passwordChangedAt: null,
          onboardingReminderDismissedAt: null,
        },
        select: { id: true, email: true, name: true },
      })

      const profile = await transaction.vulnerableProfile.create({
        data: {
          userId: user.id,
          lastName,
          firstName,
          middleName: optional(body.middleName),
          suffix: optional(body.suffix),
          dateOfBirth,
          gender,
          civilStatus,
          mobileNumber: clean(body.mobileNumber),
          landlineNumber: optional(body.landlineNumber),
          emailAddress,
          houseNumber: clean(body.houseNumber),
          street: clean(body.street),
          barangay,
          municipality,
          province,
          latitude,
          longitude,
          educationalAttainment: optional(body.educationalAttainment),
          employmentStatus: optional(body.employmentStatus),
          employmentDetails: optional(body.employmentDetails),
          vulnerabilityTypes: JSON.stringify(
            vulnerabilityTypes.length > 0 ? vulnerabilityTypes : ['OTHER'],
          ),
          disabilityType: optional(body.disabilityType),
          disabilityCause: optional(body.disabilityCause),
          disabilityIdNumber: optional(body.disabilityIdNumber),
          emergencyContact,
          emergencyPhone,
          hasMedicalCondition: Boolean(body.hasMedicalCondition),
          medicalConditions: optional(body.medicalConditions),
          needsAssistance: Boolean(body.needsAssistance),
          assistanceType: optional(body.assistanceType),
          registrationStatus: 'PENDING',
          hasRepresentative: false,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          emailAddress: true,
          barangay: true,
          registrationStatus: true,
          createdAt: true,
        },
      })

      return { user, profile }
    })

    if (created.user.email) {
      void sendWelcomeEmail(
        created.user.email,
        created.user.name || 'User',
        'VULNERABLE',
        plainPassword,
      ).catch((error) => {
        console.error('Failed to send vulnerable welcome email:', error)
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Citizen profile submitted for Administrator approval',
        profile: created.profile,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('Error registering vulnerable citizen:', error)

    if (error?.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'This email address is already registered in the system',
        },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to register vulnerable citizen' },
      { status: 500 },
    )
  }
}
