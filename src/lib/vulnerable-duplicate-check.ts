import { db } from '@/lib/db'

export type VulnerableDuplicateConflict = {
  type: 'EMAIL' | 'IDENTITY' | 'PWD_ID'
  field: 'emailAddress' | 'identity' | 'pwdIdNumber'
  message: string
  existingUserId?: string | null
  existingProfileId?: string | null
  existingRegistrationStatus?: string | null
}

export type VulnerableDuplicateCheckInput = {
  emailAddress?: unknown
  firstName?: unknown
  middleName?: unknown
  lastName?: unknown
  dateOfBirth?: unknown
  mobileNumber?: unknown
  pwdIdNumber?: unknown
}

function clean(value: unknown, max = 254) {
  return String(value || '').trim().slice(0, max)
}

function normalizeName(value: unknown) {
  return clean(value, 160)
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function normalizePhone(value: unknown) {
  let digits = clean(value, 80).replace(/\D+/g, '')

  if (digits.startsWith('63') && digits.length === 12) {
    digits = `0${digits.slice(2)}`
  } else if (digits.startsWith('9') && digits.length === 10) {
    digits = `0${digits}`
  }

  return digits
}

function dateRange(value: unknown) {
  const raw = clean(value, 40)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null

  const start = new Date(`${raw}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime())) return null

  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  return { start, end }
}

export async function findVulnerableRegistrationDuplicates(
  input: VulnerableDuplicateCheckInput,
) {
  const conflicts: VulnerableDuplicateConflict[] = []
  const emailAddress = clean(input.emailAddress).toLowerCase()
  const firstName = normalizeName(input.firstName)
  const middleName = normalizeName(input.middleName)
  const lastName = normalizeName(input.lastName)
  const mobileNumber = normalizePhone(input.mobileNumber)
  const pwdIdNumber = clean(input.pwdIdNumber, 160).toLowerCase()
  const dobRange = dateRange(input.dateOfBirth)

  if (emailAddress) {
    const existingUser = await db.user.findFirst({
      where: {
        email: emailAddress,
      },
      select: {
        id: true,
        role: true,
        vulnerableProfile: {
          select: {
            id: true,
            registrationStatus: true,
          },
        },
      },
    })

    if (existingUser) {
      const status =
        existingUser.vulnerableProfile?.registrationStatus || null

      conflicts.push({
        type: 'EMAIL',
        field: 'emailAddress',
        message: existingUser.vulnerableProfile
          ? `The email ${emailAddress} is already connected to an existing vulnerable profile${status ? ` (${status})` : ''}.`
          : `The email ${emailAddress} already belongs to an existing ${String(existingUser.role || 'user').toLowerCase()} account.`,
        existingUserId: existingUser.id,
        existingProfileId:
          existingUser.vulnerableProfile?.id || null,
        existingRegistrationStatus: status,
      })
    }
  }

  if (firstName && lastName && dobRange) {
    const sameBirthDateProfiles = await db.vulnerableProfile.findMany({
      where: {
        dateOfBirth: {
          gte: dobRange.start,
          lt: dobRange.end,
        },
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        mobileNumber: true,
        registrationStatus: true,
      },
      take: 100,
    })

    const identityMatch = sameBirthDateProfiles.find((profile) => {
      const sameFirst =
        normalizeName(profile.firstName) === firstName
      const sameLast =
        normalizeName(profile.lastName) === lastName

      if (!sameFirst || !sameLast) return false

      const existingMiddle = normalizeName(profile.middleName)
      if (middleName && existingMiddle) {
        return existingMiddle === middleName
      }

      return true
    })

    if (
      identityMatch &&
      !conflicts.some(
        (conflict) =>
          conflict.existingProfileId === identityMatch.id,
      )
    ) {
      conflicts.push({
        type: 'IDENTITY',
        field: 'identity',
        message:
          'A vulnerable profile already exists with the same name and date of birth. Review the existing record before creating another one.',
        existingUserId: identityMatch.userId,
        existingProfileId: identityMatch.id,
        existingRegistrationStatus:
          identityMatch.registrationStatus,
      })
    } else if (mobileNumber) {
      const phoneMatch = sameBirthDateProfiles.find((profile) => {
        return (
          normalizePhone(profile.mobileNumber) === mobileNumber &&
          normalizeName(profile.lastName) === lastName
        )
      })

      if (
        phoneMatch &&
        !conflicts.some(
          (conflict) =>
            conflict.existingProfileId === phoneMatch.id,
        )
      ) {
        conflicts.push({
          type: 'IDENTITY',
          field: 'identity',
          message:
            'A vulnerable profile with the same date of birth, surname, and mobile number already exists. Review the existing record before continuing.',
          existingUserId: phoneMatch.userId,
          existingProfileId: phoneMatch.id,
          existingRegistrationStatus:
            phoneMatch.registrationStatus,
        })
      }
    }
  }

  if (pwdIdNumber) {
    const pwdMatch = await db.vulnerableProfile.findFirst({
      where: {
        disabilityIdNumber: clean(input.pwdIdNumber, 160),
      },
      select: {
        id: true,
        userId: true,
        registrationStatus: true,
      },
    })

    if (
      pwdMatch &&
      !conflicts.some(
        (conflict) =>
          conflict.existingProfileId === pwdMatch.id,
      )
    ) {
      conflicts.push({
        type: 'PWD_ID',
        field: 'pwdIdNumber',
        message:
          'This PWD / disability identification number is already attached to an existing vulnerable profile.',
        existingUserId: pwdMatch.userId,
        existingProfileId: pwdMatch.id,
        existingRegistrationStatus:
          pwdMatch.registrationStatus,
      })
    }
  }

  return {
    hasDuplicate: conflicts.length > 0,
    conflicts,
  }
}
