import bcrypt from 'bcryptjs'

import { db as prisma } from '../src/lib/db'

const ADMIN_ACCOUNTS = [
  { email: 'admin@crms.gov.ph', name: 'Admin User', phone: '09123456789' },
  { email: 'admin.operations@crms.gov.ph', name: 'Elena Ramos', phone: '09170000001' },
  { email: 'admin.records@crms.gov.ph', name: 'Marco Villanueva', phone: '09170000002' },
  { email: 'admin.reports@crms.gov.ph', name: 'Liza Mendoza', phone: '09170000003' },
]

const WORKER_ACCOUNTS = [
  { email: 'worker@sampolicarpo.gov', name: 'John Worker', phone: '09123456788' },
  { email: 'worker.alugan@sampolicarpo.gov', name: 'Carlo Reyes', phone: '09171000001' },
  { email: 'worker.bahai@sampolicarpo.gov', name: 'Mia Santos', phone: '09171000002' },
  { email: 'worker.bangon@sampolicarpo.gov', name: 'Paolo Cruz', phone: '09171000003' },
  { email: 'worker.binogawan@sampolicarpo.gov', name: 'Grace Flores', phone: '09171000004' },
  { email: 'worker.poblacion@sampolicarpo.gov', name: 'Ramon Castillo', phone: '09171000005' },
]

const VULNERABLE_ACCOUNTS = [
  {
    email: 'maria.garcia@email.com',
    name: 'Maria Garcia',
    phone: '09123456787',
    firstName: 'MARIA',
    middleName: 'SANTOS',
    lastName: 'GARCIA',
    birthDate: '1965-05-15',
    gender: 'Female',
    civilStatus: 'Widowed',
    barangay: 'Barangay No. 1 (Poblacion)',
    lat: 12.1792,
    lng: 125.5072,
    types: ['SENIOR_CITIZEN'],
    needsAssistance: true,
    assistanceType: 'Food assistance, Medicine',
  },
  {
    email: 'jose.dela.cruz@email.com',
    name: 'Jose Dela Cruz',
    phone: '09172000001',
    firstName: 'JOSE',
    middleName: 'RAMOS',
    lastName: 'DELA CRUZ',
    birthDate: '1958-11-04',
    gender: 'Male',
    civilStatus: 'Married',
    barangay: 'Barangay No. 3 (Poblacion)',
    lat: 12.1841,
    lng: 125.5048,
    types: ['SENIOR_CITIZEN'],
    needsAssistance: false,
    assistanceType: '',
  },
  {
    email: 'ana.bautista@email.com',
    name: 'Ana Bautista',
    phone: '09172000002',
    firstName: 'ANA',
    middleName: 'LOPEZ',
    lastName: 'BAUTISTA',
    birthDate: '1978-03-22',
    gender: 'Female',
    civilStatus: 'Single',
    barangay: 'Barangay No. 5 (Poblacion)',
    lat: 12.1768,
    lng: 125.5112,
    types: ['PWD'],
    needsAssistance: true,
    assistanceType: 'Mobility support',
  },
  {
    email: 'pedro.mercado@email.com',
    name: 'Pedro Mercado',
    phone: '09172000003',
    firstName: 'PEDRO',
    middleName: 'DIAZ',
    lastName: 'MERCADO',
    birthDate: '1961-07-10',
    gender: 'Male',
    civilStatus: 'Married',
    barangay: 'Alugan',
    lat: 12.2012,
    lng: 125.4936,
    types: ['SENIOR_CITIZEN'],
    needsAssistance: false,
    assistanceType: '',
  },
  {
    email: 'rosa.navarro@email.com',
    name: 'Rosa Navarro',
    phone: '09172000004',
    firstName: 'ROSA',
    middleName: 'PEREZ',
    lastName: 'NAVARRO',
    birthDate: '1985-09-02',
    gender: 'Female',
    civilStatus: 'Separated',
    barangay: 'Bahai',
    lat: 12.2255,
    lng: 125.4764,
    types: ['PWD'],
    needsAssistance: true,
    assistanceType: 'Food assistance',
  },
  {
    email: 'manuel.gonzales@email.com',
    name: 'Manuel Gonzales',
    phone: '09172000005',
    firstName: 'MANUEL',
    middleName: 'REYES',
    lastName: 'GONZALES',
    birthDate: '1954-12-17',
    gender: 'Male',
    civilStatus: 'Widowed',
    barangay: 'Bangon',
    lat: 12.2139,
    lng: 125.5219,
    types: ['SENIOR_CITIZEN'],
    needsAssistance: true,
    assistanceType: 'Medicine',
  },
  {
    email: 'teresa.aquino@email.com',
    name: 'Teresa Aquino',
    phone: '09172000006',
    firstName: 'TERESA',
    middleName: 'CRUZ',
    lastName: 'AQUINO',
    birthDate: '1972-06-28',
    gender: 'Female',
    civilStatus: 'Married',
    barangay: 'Binogawan',
    lat: 12.2432,
    lng: 125.5106,
    types: ['PWD'],
    needsAssistance: false,
    assistanceType: '',
  },
  {
    email: 'ricardo.fernandez@email.com',
    name: 'Ricardo Fernandez',
    phone: '09172000007',
    firstName: 'RICARDO',
    middleName: 'SANTOS',
    lastName: 'FERNANDEZ',
    birthDate: '1960-01-15',
    gender: 'Male',
    civilStatus: 'Married',
    barangay: 'Cajagwayan',
    lat: 12.2524,
    lng: 125.4862,
    types: ['SENIOR_CITIZEN'],
    needsAssistance: true,
    assistanceType: 'Food assistance, Medicine',
  },
  {
    email: 'elena.morales@email.com',
    name: 'Elena Morales',
    phone: '09172000008',
    firstName: 'ELENA',
    middleName: 'RAMOS',
    lastName: 'MORALES',
    birthDate: '1982-04-19',
    gender: 'Female',
    civilStatus: 'Single',
    barangay: 'Cagac-an',
    lat: 12.2321,
    lng: 125.5354,
    types: ['PWD'],
    needsAssistance: false,
    assistanceType: '',
  },
  {
    email: 'antonio.soriano@email.com',
    name: 'Antonio Soriano',
    phone: '09172000009',
    firstName: 'ANTONIO',
    middleName: 'MENDOZA',
    lastName: 'SORIANO',
    birthDate: '1956-08-08',
    gender: 'Male',
    civilStatus: 'Widowed',
    barangay: 'Japunan',
    lat: 12.1956,
    lng: 125.5421,
    types: ['SENIOR_CITIZEN'],
    needsAssistance: true,
    assistanceType: 'Food assistance',
  },
  {
    email: 'carmen.rivera@email.com',
    name: 'Carmen Rivera',
    phone: '09172000010',
    firstName: 'CARMEN',
    middleName: 'FLORES',
    lastName: 'RIVERA',
    birthDate: '1976-02-26',
    gender: 'Female',
    civilStatus: 'Married',
    barangay: 'Natividad',
    lat: 12.1645,
    lng: 125.5282,
    types: ['PWD'],
    needsAssistance: true,
    assistanceType: 'Mobility support, Medicine',
  },
  {
    email: 'benjamin.torres@email.com',
    name: 'Benjamin Torres',
    phone: '09172000011',
    firstName: 'BENJAMIN',
    middleName: 'GARCIA',
    lastName: 'TORRES',
    birthDate: '1963-10-03',
    gender: 'Male',
    civilStatus: 'Married',
    barangay: 'Pangpang',
    lat: 12.1702,
    lng: 125.4881,
    types: ['SENIOR_CITIZEN'],
    needsAssistance: false,
    assistanceType: '',
  },
  {
    email: 'lucia.martinez@email.com',
    name: 'Lucia Martinez',
    phone: '09172000012',
    firstName: 'LUCIA',
    middleName: 'DIAZ',
    lastName: 'MARTINEZ',
    birthDate: '1988-05-30',
    gender: 'Female',
    civilStatus: 'Single',
    barangay: 'Tan-awan',
    lat: 12.2574,
    lng: 125.5258,
    types: ['PWD'],
    needsAssistance: true,
    assistanceType: 'Food assistance',
  },
  {
    email: 'ernesto.villanueva@email.com',
    name: 'Ernesto Villanueva',
    phone: '09172000013',
    firstName: 'ERNESTO',
    middleName: 'CRUZ',
    lastName: 'VILLANUEVA',
    birthDate: '1951-09-21',
    gender: 'Male',
    civilStatus: 'Widowed',
    barangay: 'Barangay No. 1 (Poblacion)',
    lat: 12.1814,
    lng: 125.5095,
    types: ['SENIOR_CITIZEN', 'PWD'],
    needsAssistance: true,
    assistanceType: 'Medicine, Food assistance',
  },
]

async function main() {
  console.log('🌱 Starting database seeding...')

  const adminPassword = await bcrypt.hash('admin123', 10)
  const workerPassword = await bcrypt.hash('worker123', 10)
  const vulnerablePassword = await bcrypt.hash('vulnerable123', 10)

  for (const account of ADMIN_ACCOUNTS) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        phone: account.phone,
        role: 'ADMIN',
      },
      create: {
        email: account.email,
        password: adminPassword,
        name: account.name,
        role: 'ADMIN',
        phone: account.phone,
      },
    })
  }

  for (const account of WORKER_ACCOUNTS) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        phone: account.phone,
        role: 'WORKER',
      },
      create: {
        email: account.email,
        password: workerPassword,
        name: account.name,
        role: 'WORKER',
        phone: account.phone,
      },
    })
  }

  for (const account of VULNERABLE_ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        phone: account.phone,
        role: 'VULNERABLE',
      },
      create: {
        email: account.email,
        password: vulnerablePassword,
        name: account.name,
        role: 'VULNERABLE',
        phone: account.phone,
      },
    })

    await prisma.vulnerableProfile.upsert({
      where: { userId: user.id },
      update: {
        lastName: account.lastName,
        firstName: account.firstName,
        middleName: account.middleName,
        dateOfBirth: new Date(account.birthDate),
        gender: account.gender,
        civilStatus: account.civilStatus,
        mobileNumber: account.phone,
        emailAddress: account.email,
        barangay: account.barangay,
        latitude: account.lat,
        longitude: account.lng,
        vulnerabilityTypes: JSON.stringify(account.types),
        needsAssistance: account.needsAssistance,
        assistanceType: account.assistanceType,
        registrationStatus: 'APPROVED',
      },
      create: {
        userId: user.id,
        lastName: account.lastName,
        firstName: account.firstName,
        middleName: account.middleName,
        suffix: '',
        dateOfBirth: new Date(account.birthDate),
        gender: account.gender,
        civilStatus: account.civilStatus,
        mobileNumber: account.phone,
        landlineNumber: '',
        emailAddress: account.email,
        houseNumber: 'N/A',
        street: 'Municipal Road',
        barangay: account.barangay,
        municipality: 'San Policarpo',
        province: 'Eastern Samar',
        latitude: account.lat,
        longitude: account.lng,
        educationalAttainment: 'Not specified',
        employmentStatus: 'Not specified',
        employmentDetails: '',
        vulnerabilityTypes: JSON.stringify(account.types),
        disabilityType: account.types.includes('PWD') ? 'Not specified' : '',
        disabilityCause: '',
        disabilityIdNumber: '',
        emergencyContact: '',
        emergencyPhone: '',
        hasMedicalCondition: false,
        medicalConditions: '',
        needsAssistance: account.needsAssistance,
        assistanceType: account.assistanceType,
        hasRepresentative: false,
        representativeName: '',
        representativeRelationship: '',
        representativePhone: '',
        representativeEmail: '',
        hasAuthorizationLetter: false,
        registrationStatus: 'APPROVED',
      },
    })
  }

  const totalUsers =
    ADMIN_ACCOUNTS.length +
    WORKER_ACCOUNTS.length +
    VULNERABLE_ACCOUNTS.length

  console.log(`✅ Seeded ${totalUsers} demo users`)
  console.log(`   Admins: ${ADMIN_ACCOUNTS.length}`)
  console.log(`   Workers: ${WORKER_ACCOUNTS.length}`)
  console.log(`   Vulnerable citizens: ${VULNERABLE_ACCOUNTS.length}`)
  console.log('')
  console.log('📋 Demo password pattern:')
  console.log('   Admin accounts: admin123')
  console.log('   Worker accounts: worker123')
  console.log('   Vulnerable accounts: vulnerable123')
  console.log('')
  console.log('Primary demo accounts remain:')
  console.log('   admin@crms.gov.ph / admin123')
  console.log('   worker@sampolicarpo.gov / worker123')
  console.log('   maria.garcia@email.com / vulnerable123')

  const expectedDemoEmails = [
    'admin@crms.gov.ph',
    'admin.operations@crms.gov.ph',
    'admin.records@crms.gov.ph',
    'admin.reports@crms.gov.ph',
    'worker@sampolicarpo.gov',
    'worker.alugan@sampolicarpo.gov',
    'worker.bahai@sampolicarpo.gov',
    'worker.bangon@sampolicarpo.gov',
    'worker.binogawan@sampolicarpo.gov',
    'worker.poblacion@sampolicarpo.gov',
    'maria.garcia@email.com',
    'jose.dela.cruz@email.com',
    'ana.bautista@email.com',
    'pedro.mercado@email.com',
    'rosa.navarro@email.com',
    'manuel.gonzales@email.com',
    'teresa.aquino@email.com',
    'ricardo.fernandez@email.com',
    'elena.morales@email.com',
    'antonio.soriano@email.com',
    'carmen.rivera@email.com',
    'benjamin.torres@email.com',
    'lucia.martinez@email.com',
    'ernesto.villanueva@email.com',
  ]

  const recordedDemoUsers = await prisma.user.findMany({
    where: {
      email: {
        in: expectedDemoEmails,
      },
    },
    select: {
      email: true,
      role: true,
    },
  })

  const recordedEmails = new Set(
    recordedDemoUsers.map((user) =>
      user.email.toLowerCase(),
    ),
  )
  const missingDemoUsers =
    expectedDemoEmails.filter(
      (email) => !recordedEmails.has(email),
    )

  if (missingDemoUsers.length > 0) {
    throw new Error(
      `Demo-user verification failed. Missing: ${missingDemoUsers.join(', ')}`,
    )
  }

  console.log('')
  console.log(
    `✅ Verified ${recordedDemoUsers.length}/${expectedDemoEmails.length} demo users in the same database used by CRMS.`,
  )
}

main()
  .catch((error) => {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
