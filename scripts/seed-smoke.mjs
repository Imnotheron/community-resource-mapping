import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const now = new Date()
const future = new Date(now.getTime() + 10 * 60 * 1000)

function profileData({
  id,
  userId,
  firstName,
  lastName,
  emailAddress,
  mobileNumber,
  barangay,
  registrationStatus = 'APPROVED',
  vulnerabilityTypes = ['SENIOR_CITIZEN'],
  latitude = 12.1792,
  longitude = 125.5072,
}) {
  return {
    id,
    userId,
    lastName,
    firstName,
    middleName: '',
    suffix: '',
    dateOfBirth: new Date('1960-01-15T00:00:00.000Z'),
    gender: 'Female',
    civilStatus: 'Single',
    mobileNumber,
    landlineNumber: '',
    emailAddress,
    houseNumber: '1',
    street: 'Smoke Test Street',
    barangay,
    municipality: 'San Policarpo',
    province: 'Eastern Samar',
    latitude,
    longitude,
    educationalAttainment: 'High School',
    employmentStatus: 'Not employed',
    employmentDetails: '',
    vulnerabilityTypes: JSON.stringify(vulnerabilityTypes),
    disabilityType: vulnerabilityTypes.includes('PWD') ? 'Mobility' : '',
    disabilityCause: '',
    disabilityIdNumber: vulnerabilityTypes.includes('PWD') ? `PWD-${id}` : '',
    emergencyContact: 'Smoke Contact',
    emergencyPhone: '09179999999',
    hasMedicalCondition: false,
    medicalConditions: '',
    needsAssistance: true,
    assistanceType: 'Food assistance',
    hasRepresentative: false,
    representativeName: '',
    representativeRelationship: '',
    representativePhone: '',
    representativeEmail: '',
    hasAuthorizationLetter: false,
    registrationStatus,
    rejectionReason: null,
  }
}

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  const workerPassword = await bcrypt.hash('worker123', 10)
  const vulnerablePassword = await bcrypt.hash('vulnerable123', 10)
  const realPassword = await bcrypt.hash('otp12345', 10)
  const otpHash = await bcrypt.hash('123456', 10)

  await db.user.createMany({
    data: [
      {
        id: 'admin-smoke',
        email: 'admin@crms.gov.ph',
        password: adminPassword,
        name: 'Smoke Administrator',
        role: 'ADMIN',
        phone: '09170000001',
      },
      {
        id: 'admin-second',
        email: 'admin.records@crms.gov.ph',
        password: adminPassword,
        name: 'Second Administrator',
        role: 'ADMIN',
        phone: '09170000002',
      },
      {
        id: 'worker-smoke',
        email: 'worker@sampolicarpo.gov',
        password: workerPassword,
        name: 'Smoke Worker',
        role: 'WORKER',
        phone: '09171000001',
      },
      {
        id: 'vuln-smoke',
        email: 'maria.garcia@email.com',
        password: vulnerablePassword,
        name: 'Maria Garcia',
        role: 'VULNERABLE',
        phone: '09172000001',
      },
      {
        id: 'pending-one-user',
        email: 'pending.one@smoke.test',
        password: vulnerablePassword,
        name: 'Pending One',
        role: 'VULNERABLE',
        phone: '09172000002',
      },
      {
        id: 'pending-two-user',
        email: 'pending.two@smoke.test',
        password: vulnerablePassword,
        name: 'Pending Two',
        role: 'VULNERABLE',
        phone: '09172000003',
      },
      {
        id: 'approved-other-user',
        email: 'approved.other@smoke.test',
        password: vulnerablePassword,
        name: 'Approved Other',
        role: 'VULNERABLE',
        phone: '09172000004',
      },
      {
        id: 'pending-three-user',
        email: 'pending.three@smoke.test',
        password: vulnerablePassword,
        name: 'Pending Three',
        role: 'VULNERABLE',
        phone: '09172000007',
      },
      {
        id: 'pending-four-user',
        email: 'pending.four@smoke.test',
        password: vulnerablePassword,
        name: 'Pending Four',
        role: 'VULNERABLE',
        phone: '09172000008',
      },
      {
        id: 'pending-five-user',
        email: 'pending.five@smoke.test',
        password: vulnerablePassword,
        name: 'Pending Five',
        role: 'VULNERABLE',
        phone: '09172000009',
      },
      {
        id: 'otp-smoke',
        email: 'otp.verify@smoke.test',
        password: realPassword,
        name: 'OTP Verify User',
        role: 'VULNERABLE',
        phone: '09172000005',
        loginOtpHash: otpHash,
        loginOtpExpiresAt: future,
        loginOtpChallengeId: 'smoke-challenge',
        loginOtpAttempts: 0,
        loginOtpLastSentAt: now,
      },
      {
        id: 'otp-login-smoke',
        email: 'otp.login@smoke.test',
        password: realPassword,
        name: 'OTP Login User',
        role: 'VULNERABLE',
        phone: '09172000006',
      },
    ],
  })

  await db.vulnerableProfile.createMany({
    data: [
      profileData({
        id: 'profile-approved',
        userId: 'vuln-smoke',
        firstName: 'Maria',
        lastName: 'Garcia',
        emailAddress: 'maria.garcia@email.com',
        mobileNumber: '09172000001',
        barangay: 'Barangay No. 1 (Poblacion)',
        registrationStatus: 'APPROVED',
        vulnerabilityTypes: ['SENIOR_CITIZEN'],
        latitude: 12.181,
        longitude: 125.507,
      }),
      profileData({
        id: 'profile-pending-one',
        userId: 'pending-one-user',
        firstName: 'Pending',
        lastName: 'One',
        emailAddress: 'pending.one@smoke.test',
        mobileNumber: '09172000002',
        barangay: 'Barangay No. 1 (Poblacion)',
        registrationStatus: 'PENDING',
        vulnerabilityTypes: ['PWD'],
        latitude: 12.182,
        longitude: 125.508,
      }),
      profileData({
        id: 'profile-pending-two',
        userId: 'pending-two-user',
        firstName: 'Pending',
        lastName: 'Two',
        emailAddress: 'pending.two@smoke.test',
        mobileNumber: '09172000003',
        barangay: 'Barangay No. 1 (Poblacion)',
        registrationStatus: 'PENDING',
        vulnerabilityTypes: ['PWD'],
        latitude: 12.183,
        longitude: 125.509,
      }),
      profileData({
        id: 'profile-approved-other',
        userId: 'approved-other-user',
        firstName: 'Approved',
        lastName: 'Other',
        emailAddress: 'approved.other@smoke.test',
        mobileNumber: '09172000004',
        barangay: 'Barangay No. 3 (Poblacion)',
        registrationStatus: 'APPROVED',
        vulnerabilityTypes: ['SENIOR_CITIZEN'],
        latitude: 12.184,
        longitude: 125.51,
      }),
      profileData({
        id: 'profile-pending-three',
        userId: 'pending-three-user',
        firstName: 'Pending',
        lastName: 'Three',
        emailAddress: 'pending.three@smoke.test',
        mobileNumber: '09172000007',
        barangay: 'Barangay No. 1 (Poblacion)',
        registrationStatus: 'PENDING',
        vulnerabilityTypes: ['PWD'],
        latitude: 12.185,
        longitude: 125.511,
      }),
      profileData({
        id: 'profile-pending-four',
        userId: 'pending-four-user',
        firstName: 'Pending',
        lastName: 'Four',
        emailAddress: 'pending.four@smoke.test',
        mobileNumber: '09172000008',
        barangay: 'Barangay No. 1 (Poblacion)',
        registrationStatus: 'PENDING',
        vulnerabilityTypes: ['PWD'],
        latitude: 12.186,
        longitude: 125.512,
      }),
      profileData({
        id: 'profile-pending-five',
        userId: 'pending-five-user',
        firstName: 'Pending',
        lastName: 'Five',
        emailAddress: 'pending.five@smoke.test',
        mobileNumber: '09172000009',
        barangay: 'Barangay No. 1 (Poblacion)',
        registrationStatus: 'PENDING',
        vulnerabilityTypes: ['PWD'],
        latitude: 12.187,
        longitude: 125.513,
      }),
    ],
  })

  await db.household.create({
    data: {
      id: 'household-approved',
      address: '1 Smoke Test Street',
      barangay: 'Barangay No. 1 (Poblacion)',
      latitude: 12.181,
      longitude: 125.507,
      headOfHousehold: 'Maria Garcia',
      totalMembers: 2,
      vulnerableMembers: 1,
      vulnerableProfileId: 'profile-approved',
    },
  })

  await db.reliefDistribution.createMany({
    data: [
      {
        id: 'distribution-pending-one',
        vulnerableProfileId: 'profile-approved',
        workerId: 'worker-smoke',
        distributionDate: now,
        distributionType: 'Food Pack',
        itemsProvided: 'Rice and canned goods',
        quantity: 1,
        notes: 'Smoke pending relief',
        status: 'PENDING',
      },
      {
        id: 'distribution-approved-one',
        vulnerableProfileId: 'profile-approved-other',
        workerId: 'worker-smoke',
        distributionDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        distributionType: 'Medicine',
        itemsProvided: 'Maintenance medicine',
        quantity: 1,
        notes: 'Smoke approved relief',
        status: 'APPROVED',
      },
    ],
  })

  await db.feedback.createMany({
    data: [
      {
        id: 'feedback-vulnerable',
        userId: 'vuln-smoke',
        type: 'FEEDBACK',
        subject: 'Smoke citizen feedback',
        message: 'Smoke feedback from vulnerable user',
        status: 'SUBMITTED',
      },
      {
        id: 'feedback-worker',
        userId: 'worker-smoke',
        type: 'FIELD_NOTE',
        subject: 'Smoke field note',
        message: 'Smoke worker field note',
        status: 'SUBMITTED',
      },
    ],
  })

  await db.reliefFeedback.create({
    data: {
      id: 'relief-feedback-smoke',
      reliefDistributionId: 'distribution-approved-one',
      userId: 'vuln-smoke',
      feedbackType: 'FEEDBACK',
      message: 'Relief feedback smoke record',
      status: 'SUBMITTED',
    },
  })

  await db.announcement.createMany({
    data: [
      {
        id: 'announcement-public',
        title: 'Smoke Community Update',
        content: 'Smoke announcement content',
        type: 'GENERAL',
        targetRole: 'ALL',
        isActive: true,
        priority: 'NORMAL',
        createdBy: 'admin-smoke',
      },
      {
        id: 'announcement-admin-history',
        title: 'Historical Smoke Event',
        content: 'Smoke history event',
        type: 'MEETING',
        targetRole: 'ADMIN',
        eventDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        isActive: false,
        priority: 'LOW',
        createdBy: 'admin-smoke',
      },
    ],
  })

  await db.communityResource.create({
    data: {
      id: 'resource-smoke',
      name: 'Smoke Evacuation Center',
      type: 'EVACUATION_CENTER',
      address: 'San Policarpo',
      barangay: 'Barangay No. 1 (Poblacion)',
      latitude: 12.18,
      longitude: 125.506,
      capacity: 100,
      contactInfo: '09170000000',
      isActive: true,
    },
  })

  await db.adminSignupRequest.create({
    data: {
      id: 'signup-request-smoke',
      name: 'Pending Admin Applicant',
      email: 'pending.admin@smoke.test',
      password: await bcrypt.hash('pending123', 10),
      position: 'MDRRMO',
      reason: 'Smoke request',
      status: 'PENDING',
    },
  })

  console.log('Smoke database seeded successfully.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
