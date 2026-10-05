export const dynamic = 'force-dynamic'

import { randomInt } from 'crypto'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { sendVulnerableRegistrationApprovedEmail } from '@/lib/email'
import { requireRequestUser } from '@/lib/request-user-session'
import { normalizeRegistrationDocuments } from '@/lib/registration-documents'

function clean(value: unknown, max = 1000) {
  return String(value || '').trim().slice(0, max)
}

function optional(value: unknown, max = 1000) {
  const valueText = clean(value, max)
  return valueText || null
}

function parseCoordinate(value: unknown) {
  const raw = clean(value, 40)
  if (!raw) return null

  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function parseOptionalDate(value: unknown) {
  const raw = clean(value, 40)
  if (!raw) return null

  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function temporaryPassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  let password = ''

  for (let index = 0; index < 4; index += 1) {
    password += letters[randomInt(0, letters.length)]
  }
  for (let index = 0; index < 4; index += 1) {
    password += digits[randomInt(0, digits.length)]
  }

  return password
}

function normalizedSectors(
  submitted: unknown,
  hasDisability: boolean,
  disabilityType: string,
  needsAssistance: boolean,
) {
  const values = Array.isArray(submitted)
    ? submitted
        .map((value) =>
          clean(value, 120)
            .toUpperCase()
            .replace(/[\s-]+/g, '_'),
        )
        .filter(Boolean)
        .slice(0, 30)
    : []

  if (hasDisability) {
    const sector = disabilityType
      ? disabilityType
          .toUpperCase()
          .replace(/[\s-]+/g, '_')
      : 'PWD'

    if (!values.includes(sector)) {
      values.push(sector)
    }
  }

  if (
    needsAssistance &&
    !values.includes('NEEDS_ASSISTANCE')
  ) {
    values.push('NEEDS_ASSISTANCE')
  }

  return values.length > 0 ? values : ['OTHER']
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const requestedAdminId = clean(body.adminId, 100)

    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
      requestedUserId: requestedAdminId || undefined,
    })
    if ('error' in auth) return auth.error

    const lastName = clean(body.lastName, 120)
    const firstName = clean(body.firstName, 120)
    const middleName = clean(body.middleName, 120)
    const suffix = clean(body.suffix, 40)
    const emailAddress = clean(
      body.emailAddress,
      254,
    ).toLowerCase()
    const mobileNumber = clean(body.mobileNumber, 40)
    const barangay = clean(body.barangay, 160)
    const municipality =
      clean(body.municipality, 160) || 'San Policarpo'
    const province =
      clean(body.province, 160) || 'Eastern Samar'

    if (
      !lastName ||
      !firstName ||
      !emailAddress ||
      !mobileNumber ||
      !barangay
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Last name, first name, email, mobile number, and barangay are required',
        },
        { status: 400 },
      )
    }

    if (!/^\S+@\S+\.\S+$/.test(emailAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Enter a valid email address',
        },
        { status: 400 },
      )
    }

    const dateOfBirthRaw = clean(body.dateOfBirth, 40)
    const dateOfBirth =
      dateOfBirthRaw.length > 0
        ? parseOptionalDate(dateOfBirthRaw)
        : null

    if (
      dateOfBirthRaw &&
      (!dateOfBirth || dateOfBirth > new Date())
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Enter a valid date of birth',
        },
        { status: 400 },
      )
    }

    const latitude = parseCoordinate(body.latitude)
    const longitude = parseCoordinate(body.longitude)
    const hasOneCoordinate =
      latitude !== null || longitude !== null

    if (
      hasOneCoordinate &&
      (latitude === null ||
        longitude === null ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Both latitude and longitude must contain valid coordinates',
        },
        { status: 400 },
      )
    }

    const hasDisability = Boolean(body.hasDisability)
    const needsAssistance = Boolean(body.needsAssistance)
    const disabilityType = clean(
      body.disabilityType,
      250,
    )

    const vulnerabilityTypes = normalizedSectors(
      body.vulnerabilityTypes,
      hasDisability,
      disabilityType,
      needsAssistance,
    )

    let registrationDocuments
    try {
      registrationDocuments = normalizeRegistrationDocuments(
        body.documents,
      )
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Invalid registration documents',
        },
        { status: 400 },
      )
    }

    const existingUser = await db.user.findUnique({
      where: { email: emailAddress },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This email address is already registered in the system',
        },
        { status: 409 },
      )
    }

    const plainPassword = temporaryPassword()
    const hashedPassword = await bcrypt.hash(
      plainPassword,
      10,
    )

    const result = await db.$transaction(
      async (transaction) => {
        const user = await transaction.user.create({
          data: {
            name:
              `${firstName} ${middleName} ${lastName} ${suffix}`
                .replace(/\s+/g, ' ')
                .trim(),
            email: emailAddress,
            password: hashedPassword,
            role: 'VULNERABLE',
            phone: mobileNumber,
            temporaryPasswordIssued: true,
            passwordChangedAt: null,
            onboardingReminderDismissedAt: null,
          },
          select: {
            id: true,
            email: true,
            name: true,
          },
        })

        const profile =
          await transaction.vulnerableProfile.create({
            data: {
              userId: user.id,
              lastName,
              firstName,
              middleName: middleName || null,
              suffix: suffix || null,
              dateOfBirth,
              gender: optional(body.gender, 80),
              civilStatus: optional(
                body.civilStatus,
                120,
              ),
              mobileNumber,
              landlineNumber: optional(
                body.landlineNumber,
                40,
              ),
              emailAddress,
              houseNumber: clean(
                body.houseNumber,
                120,
              ),
              street: clean(body.street, 240),
              barangay,
              municipality,
              province,
              latitude,
              longitude,
              educationalAttainment: optional(
                body.educationalAttainment,
                250,
              ),
              employmentStatus: optional(
                body.employmentStatus,
                250,
              ),
              employmentDetails: optional(
                [
                  clean(
                    body.employmentDetails,
                    600,
                  ),
                  clean(body.employerName, 250)
                    ? `Employer: ${clean(
                        body.employerName,
                        250,
                      )}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' · '),
                1000,
              ),
              vulnerabilityTypes:
                JSON.stringify(vulnerabilityTypes),
              disabilityType: hasDisability
                ? optional(disabilityType, 250)
                : null,
              disabilityCause: hasDisability
                ? optional(
                    body.disabilityCause,
                    500,
                  )
                : null,
              disabilityIdNumber: hasDisability
                ? optional(
                    body.pwdIdNumber ||
                      body.medicalCertificateNumber,
                    160,
                  )
                : null,
              emergencyContact: optional(
                body.emergencyContact,
                200,
              ),
              emergencyPhone: optional(
                body.emergencyPhone,
                80,
              ),
              hasMedicalCondition: Boolean(
                body.hasMedicalCondition,
              ),
              medicalConditions:
                Boolean(body.hasMedicalCondition)
                  ? optional(
                      body.medicalConditions,
                      1500,
                    )
                  : null,
              needsAssistance,
              assistanceType: needsAssistance
                ? optional(
                    body.assistanceType,
                    1000,
                  )
                : null,
              hasRepresentative: Boolean(
                clean(body.guardianName, 200),
              ),
              representativeName: optional(
                body.guardianName,
                200,
              ),
              representativeRelationship:
                optional(
                  body.guardianRelationship,
                  160,
                ),
              representativePhone: optional(
                body.guardianContact,
                80,
              ),
              representativeEmail: null,
              hasAuthorizationLetter: false,
              registrationStatus: 'APPROVED',
              rejectionReason: null,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              registrationStatus: true,
            },
          })

        if (latitude !== null && longitude !== null) {
          await transaction.household.create({
            data: {
              address: [
                clean(body.houseNumber, 120),
                clean(body.street, 240),
                barangay,
              ]
                .filter(Boolean)
                .join(', '),
              barangay,
              latitude,
              longitude,
              headOfHousehold:
                `${lastName}, ${firstName}`,
              totalMembers: 1,
              vulnerableMembers: 1,
              vulnerableProfileId: profile.id,
            },
          })
        }

        for (const document of registrationDocuments) {
          await transaction.vulnerabilityDocument.create({
            data: {
              profileId: profile.id,
              documentType: document.documentType,
              fileName: document.fileName,
              fileUrl: document.fileUrl,
            },
          })
        }

        return { user, profile }
      },
    )

    void sendVulnerableRegistrationApprovedEmail(
      emailAddress,
      `${firstName} ${lastName}`,
      plainPassword,
    ).catch((error) => {
      console.error(
        'Failed to send vulnerable registration email:',
        error,
      )
    })

    return NextResponse.json(
      {
        success: true,
        message:
          'Vulnerable person registered successfully and approved',
        profile: {
          id: result.profile.id,
          fullName:
            `${result.profile.firstName} ${result.profile.lastName}`,
          registrationStatus:
            result.profile.registrationStatus,
        },
        user: {
          id: result.user.id,
          email: result.user.email,
          defaultPassword: plainPassword,
        },
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error(
      'Error registering vulnerable person (admin):',
      error,
    )

    if (error?.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error:
            'This email address is already registered in the system',
        },
        { status: 409 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to register vulnerable person',
      },
      { status: 500 },
    )
  }
}
