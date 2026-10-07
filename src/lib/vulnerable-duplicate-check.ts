import { db } from '@/lib/db'

export type VulnerableDuplicateConflict = {
  type: 'EMAIL' | 'MOBILE' | 'IDENTITY' | 'PWD_ID'
  field: 'emailAddress' | 'mobileNumber' | 'identity' | 'pwdIdNumber'
  label: string
  value?: string | null
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
  const digits = clean(value, 80).replace(/\D+/g, '')
  return digits.length >= 10
    ? digits.slice(-10)
    : digits
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
  const lastName = normalizeName(input.lastName)
  const mobileNumber = normalizePhone(input.mobileNumber)
  const pwdIdNumber = clean(input.pwdIdNumber, 160).toLowerCase()
  const dobRange = dateRange(input.dateOfBirth)

  if (emailAddress) {
    const emailRows = await db.$queryRaw<
      Array<{ id: string }>
    >`
      SELECT "id"
      FROM "User"
      WHERE lower("email") = lower(${emailAddress})
      LIMIT 1
    `

    const existingUser = emailRows[0]
      ? await db.user.findUnique({
          where: { id: emailRows[0].id },
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
      : null

    if (existingUser) {
      const status =
        existingUser.vulnerableProfile?.registrationStatus || null

      conflicts.push({
        type: 'EMAIL',
        field: 'emailAddress',
        label: 'Email address',
        value: emailAddress,
        message: existingUser.vulnerableProfile
          ? `Already connected to an existing vulnerable profile${status ? ` (${status})` : ''}.`
          : `Already belongs to an existing ${String(existingUser.role || 'user').toLowerCase()} account.`,
        existingUserId: existingUser.id,
        existingProfileId:
          existingUser.vulnerableProfile?.id || null,
        existingRegistrationStatus: status,
      })
    }
  }

  if (mobileNumber) {
    const mobileRows = await db.$queryRaw<
      Array<{
        id: string
        userId: string
        mobileNumber: string
        registrationStatus: string
      }>
    >`
      SELECT
        "id",
        "userId",
        "mobileNumber",
        "registrationStatus"
      FROM "VulnerableProfile"
      WHERE "mobileNumber" IS NOT NULL
        AND length(trim("mobileNumber")) > 0
      LIMIT 5000
    `

    const mobileMatch = mobileRows.find(
      (row) =>
        normalizePhone(row.mobileNumber) ===
        mobileNumber,
    )

    if (mobileMatch) {
      conflicts.push({
        type: 'MOBILE',
        field: 'mobileNumber',
        label: 'Mobile number',
        value: clean(input.mobileNumber, 80),
        message:
          'Already used by an existing vulnerable profile.',
        existingUserId: mobileMatch.userId,
        existingProfileId: mobileMatch.id,
        existingRegistrationStatus:
          mobileMatch.registrationStatus,
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
        label: 'Name + date of birth',
        value: `${clean(input.firstName, 120)} ${clean(input.lastName, 120)} · ${clean(input.dateOfBirth, 40)}`,
        message:
          'Matches an existing vulnerable profile.',
        existingUserId: identityMatch.userId,
        existingProfileId: identityMatch.id,
        existingRegistrationStatus:
          identityMatch.registrationStatus,
      })
    }
  }

  if (pwdIdNumber) {
    const pwdRows = await db.$queryRaw<
      Array<{
        id: string
        userId: string
        registrationStatus: string
      }>
    >`
      SELECT
        "id",
        "userId",
        "registrationStatus"
      FROM "VulnerableProfile"
      WHERE "disabilityIdNumber" IS NOT NULL
        AND lower(trim("disabilityIdNumber")) =
          lower(trim(${clean(input.pwdIdNumber, 160)}))
      LIMIT 1
    `

    const pwdMatch = pwdRows[0] || null

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
        label: 'PWD / disability ID',
        value: clean(input.pwdIdNumber, 160),
        message:
          'Already attached to an existing vulnerable profile.',
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
