import bcrypt from 'bcryptjs'

import { db as prisma } from '../src/lib/db'
import {
  SAN_POLICARPO_BARANGAY_REFERENCE_POINTS,
  type SanPolicarpoBarangay,
} from '../src/lib/san-policarpo-geography'

const RESIDENTIAL_BUILDING_TAG =
  '^(house|residential|detached|semidetached_house|terrace|bungalow|apartments)$'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

type DemoHousePoint = {
  lat: number
  lng: number
  osmType: string
  osmId: number
  buildingType: string
}

function distanceMeters(
  left: { lat: number; lng: number },
  right: { lat: number; lng: number },
) {
  const earthRadius = 6_371_000
  const toRadians = (value: number) =>
    (value * Math.PI) / 180
  const dLat = toRadians(right.lat - left.lat)
  const dLng = toRadians(right.lng - left.lng)
  const lat1 = toRadians(left.lat)
  const lat2 = toRadians(right.lat)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2

  return (
    2 *
    earthRadius *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    )
  )
}

async function fetchResidentialBuildingCandidates() {
  const query = [
    '[out:json][timeout:35];',
    '(',
    'way["building"~"' + RESIDENTIAL_BUILDING_TAG + '"](12.165,125.405,12.278,125.555);',
    'node["building"~"' + RESIDENTIAL_BUILDING_TAG + '"](12.165,125.405,12.278,125.555);',
    ');',
    'out center tags;',
  ].join('\\n')

  let lastError: unknown = null

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      40_000,
    )

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent':
            'CRMS-Capstone-Demo-Seeder/1.0',
        },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(
          'Overpass returned HTTP ' + response.status,
        )
      }

      const payload = await response.json()
      const elements = Array.isArray(payload?.elements)
        ? payload.elements
        : []

      const candidates: DemoHousePoint[] =
        elements
          .map((element: any) => {
            const lat =
              Number(element?.lat) ||
              Number(element?.center?.lat)
            const lng =
              Number(element?.lon) ||
              Number(element?.center?.lon)

            if (
              !Number.isFinite(lat) ||
              !Number.isFinite(lng)
            ) {
              return null
            }

            return {
              lat,
              lng,
              osmType: String(
                element?.type || 'way',
              ),
              osmId: Number(element?.id),
              buildingType: String(
                element?.tags?.building ||
                  'residential',
              ),
            }
          })
          .filter(Boolean) as DemoHousePoint[]

      if (candidates.length === 0) {
        throw new Error(
          'No mapped residential buildings were returned.',
        )
      }

      console.log(
        '🏠 Loaded ' + candidates.length +
          ' mapped residential buildings from OpenStreetMap.',
      )

      return candidates
    } catch (error) {
      lastError = error
      console.warn(
        '⚠️ Could not load residential buildings from ' +
          endpoint +
          ':',
        error instanceof Error
          ? error.message
          : String(error),
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new Error(
    'Could not verify demo house locations from OpenStreetMap. The seed stops instead of placing demo markers on roads, water, forest, or arbitrary coordinates. Check your internet connection and run the seed again.' +
      (lastError
        ? ' Last error: ' + String(lastError)
        : ''),
  )
}

function assignDemoHousePoints(
  candidates: DemoHousePoint[],
) {
  const used = new Set<string>()
  const assigned = new Map<
    SanPolicarpoBarangay,
    DemoHousePoint
  >()

  for (const barangay of Object.keys(
    SAN_POLICARPO_BARANGAY_REFERENCE_POINTS,
  ) as SanPolicarpoBarangay[]) {
    const reference =
      SAN_POLICARPO_BARANGAY_REFERENCE_POINTS[barangay]

    const maximumDistance =
      barangay.includes('(Poblacion)')
        ? 350
        : 1_500

    const ranked = candidates
      .map((candidate) => ({
        candidate,
        distance: distanceMeters(
          reference,
          candidate,
        ),
      }))
      .filter(
        ({ candidate, distance }) =>
          distance <= maximumDistance &&
          !used.has(
            candidate.osmType + ':' + candidate.osmId,
          ),
      )
      .sort(
        (left, right) =>
          left.distance - right.distance,
      )

    const selected = ranked[0]?.candidate

    if (!selected) {
      throw new Error(
        'No OpenStreetMap residential-building footprint was found close enough to the ' +
          barangay +
          ' reference point. CRMS will not invent a demo-house coordinate. Add/verify a residential building in OpenStreetMap or adjust the verified demo location before seeding.',
      )
    }

    used.add(
      selected.osmType + ':' + selected.osmId,
    )
    assigned.set(barangay, selected)

    console.log(
      '   🏠 ' +
        barangay +
        ': OSM ' +
        selected.osmType +
        ' ' +
        selected.osmId +
        ' (' +
        selected.buildingType +
        ')',
    )
  }

  return assigned
}
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
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Barangay No. 1 (Poblacion)' as SanPolicarpoBarangay],
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
    barangay: 'Barangay No. 2 (Poblacion)',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Barangay No. 2 (Poblacion)' as SanPolicarpoBarangay],
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
    barangay: 'Barangay No. 3 (Poblacion)',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Barangay No. 3 (Poblacion)' as SanPolicarpoBarangay],
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
    barangay: 'Barangay No. 4 (Poblacion)',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Barangay No. 4 (Poblacion)' as SanPolicarpoBarangay],
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
    barangay: 'Barangay No. 5 (Poblacion)',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Barangay No. 5 (Poblacion)' as SanPolicarpoBarangay],
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
    barangay: 'Alugan',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Alugan' as SanPolicarpoBarangay],
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
    barangay: 'Bahay',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Bahay' as SanPolicarpoBarangay],
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
    barangay: 'Baras (Lipata)',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Baras (Lipata)' as SanPolicarpoBarangay],
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
    barangay: 'Binogawan',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Binogawan' as SanPolicarpoBarangay],
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
    barangay: 'Cajagwayan',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Cajagwayan' as SanPolicarpoBarangay],
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
    barangay: 'Japunan',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Japunan' as SanPolicarpoBarangay],
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
    barangay: 'Natividad',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Natividad' as SanPolicarpoBarangay],
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
    barangay: 'Pangpang',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Pangpang' as SanPolicarpoBarangay],
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
    barangay: 'Tabo',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Tabo' as SanPolicarpoBarangay],
    types: ['SENIOR_CITIZEN', 'PWD'],
    needsAssistance: true,
    assistanceType: 'Medicine, Food assistance',
  },
  {
    email: 'demo.bangon@crms.test',
    name: 'Demo Resident Bangon',
    phone: '09172000014',
    firstName: 'DEMO',
    middleName: '',
    lastName: 'BANGON',
    birthDate: '1966-02-14',
    gender: 'Male',
    civilStatus: 'Married',
    barangay: 'Bangon',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Bangon' as SanPolicarpoBarangay],
    types: ['SENIOR_CITIZEN'],
    needsAssistance: true,
    assistanceType: 'Food assistance',
  },
  {
    email: 'demo.santacruz@crms.test',
    name: 'Demo Resident Santa Cruz',
    phone: '09172000015',
    firstName: 'DEMO',
    middleName: '',
    lastName: 'SANTA CRUZ',
    birthDate: '1979-07-09',
    gender: 'Female',
    civilStatus: 'Single',
    barangay: 'Santa Cruz',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Santa Cruz' as SanPolicarpoBarangay],
    types: ['PWD'],
    needsAssistance: false,
    assistanceType: '',
  },
  {
    email: 'demo.tanawan@crms.test',
    name: 'Demo Resident Tan-awan',
    phone: '09172000016',
    firstName: 'DEMO',
    middleName: '',
    lastName: 'TAN-AWAN',
    birthDate: '1962-10-25',
    gender: 'Male',
    civilStatus: 'Widowed',
    barangay: 'Tan-awan',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Tan-awan' as SanPolicarpoBarangay],
    types: ['SENIOR_CITIZEN'],
    needsAssistance: true,
    assistanceType: 'Medicine',
  }]

async function main() {
  console.log('🌱 Starting database seeding...')
  console.log(
    '🏠 Resolving demo residents to real OpenStreetMap residential-building footprints...',
  )

  const residentialBuildings =
    await fetchResidentialBuildingCandidates()
  const demoHousePoints =
    assignDemoHousePoints(
      residentialBuildings,
    )

  const adminPassword = await bcrypt.hash('admin123', 10)
  const workerPassword = await bcrypt.hash('worker123', 10)
  const vulnerablePassword = await bcrypt.hash('vulnerable123', 10)

  const invalidVulnerableEntries =
    VULNERABLE_ACCOUNTS.filter(
      (account) =>
        !account ||
        !account.email ||
        !account.barangay ||
        !SAN_POLICARPO_BARANGAY_REFERENCE_POINTS[
          account.barangay as SanPolicarpoBarangay
        ],
    )

  if (invalidVulnerableEntries.length > 0) {
    throw new Error(
      'Demo vulnerable account configuration contains an invalid or incomplete entry.',
    )
  }

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
    const barangay =
      account.barangay as SanPolicarpoBarangay
    const housePoint =
      demoHousePoints.get(barangay)

    if (!housePoint) {
      throw new Error(
        `No verified demo-house point is available for ${account.barangay}.`,
      )
    }

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
        latitude: housePoint.lat,
        longitude: housePoint.lng,
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
        houseNumber: 'DEMO',
        street: 'OpenStreetMap residential building — demo record',
        barangay: account.barangay,
        municipality: 'San Policarpo',
        province: 'Eastern Samar',
        latitude: housePoint.lat,
        longitude: housePoint.lng,
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

    const profile = await prisma.vulnerableProfile.findUniqueOrThrow({
      where: { userId: user.id },
      select: { id: true },
    })

    await prisma.household.upsert({
      where: {
        vulnerableProfileId: profile.id,
      },
      update: {
        address: `OSM residential building — demo record, ${account.barangay}`,
        barangay: account.barangay,
        latitude: housePoint.lat,
        longitude: housePoint.lng,
        headOfHousehold: account.name,
        totalMembers: 1,
        vulnerableMembers: 1,
        notes:
          `Demo-only marker snapped to an OpenStreetMap residential-building footprint (OSM ${housePoint.osmType} ${housePoint.osmId}); it does not identify a real CRMS beneficiary household.`,
      },
      create: {
        address: `OSM residential building — demo record, ${account.barangay}`,
        barangay: account.barangay,
        latitude: housePoint.lat,
        longitude: housePoint.lng,
        headOfHousehold: account.name,
        totalMembers: 1,
        vulnerableMembers: 1,
        vulnerableProfileId: profile.id,
        notes:
          `Demo-only marker snapped to an OpenStreetMap residential-building footprint (OSM ${housePoint.osmType} ${housePoint.osmId}); it does not identify a real CRMS beneficiary household.`,
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
    ...ADMIN_ACCOUNTS,
    ...WORKER_ACCOUNTS,
    ...VULNERABLE_ACCOUNTS,
  ].map((account) => account.email.toLowerCase())

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


const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

type DemoHousePoint = {
  lat: number
  lng: number
  osmType: string
  osmId: number
  buildingType: string
}

function distanceMeters(
  left: { lat: number; lng: number },
  right: { lat: number; lng: number },
) {
  const earthRadius = 6_371_000
  const toRadians = (value: number) =>
    (value * Math.PI) / 180
  const dLat = toRadians(right.lat - left.lat)
  const dLng = toRadians(right.lng - left.lng)
  const lat1 = toRadians(left.lat)
  const lat2 = toRadians(right.lat)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2

  return (
    2 *
    earthRadius *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    )
  )
}

async function fetchResidentialBuildingCandidates() {
  const query = `
[out:json][timeout:35];
(
  way["building"~"${RESIDENTIAL_BUILDING_TAG}"](12.165,125.405,12.278,125.555);
  node["building"~"${RESIDENTIAL_BUILDING_TAG}"](12.165,125.405,12.278,125.555);
);
out center tags;
`.trim()

  let lastError: unknown = null

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      40_000,
    )

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent':
            'CRMS-Capstone-Demo-Seeder/1.0',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(
          `Overpass returned HTTP ${response.status}`,
        )
      }

      const payload = await response.json()
      const elements = Array.isArray(payload?.elements)
        ? payload.elements
        : []

      const candidates: DemoHousePoint[] =
        elements
          .map((element: any) => {
            const lat =
              Number(element?.lat) ||
              Number(element?.center?.lat)
            const lng =
              Number(element?.lon) ||
              Number(element?.center?.lon)

            if (
              !Number.isFinite(lat) ||
              !Number.isFinite(lng)
            ) {
              return null
            }

            return {
              lat,
              lng,
              osmType: String(
                element?.type || 'way',
              ),
              osmId: Number(element?.id),
              buildingType: String(
                element?.tags?.building ||
                  'residential',
              ),
            }
          })
          .filter(Boolean) as DemoHousePoint[]

      if (candidates.length === 0) {
        throw new Error(
          'No mapped residential buildings were returned.',
        )
      }

      console.log(
        `🏠 Loaded ${candidates.length} mapped residential buildings from OpenStreetMap.`,
      )

      return candidates
    } catch (error) {
      lastError = error
      console.warn(
        `⚠️ Could not load residential buildings from ${endpoint}:`,
        error instanceof Error
          ? error.message
          : String(error),
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new Error(
    'Could not verify demo house locations from OpenStreetMap. The seed stops instead of placing demo markers on roads, water, forest, or arbitrary coordinates. Check your internet connection and run the seed again.' +
      (lastError
        ? ` Last error: ${String(lastError)}`
        : ''),
  )
}

function assignDemoHousePoints(
  candidates: DemoHousePoint[],
) {
  const used = new Set<string>()
  const assigned = new Map<
    SanPolicarpoBarangay,
    DemoHousePoint
  >()

  for (const barangay of Object.keys(
    SAN_POLICARPO_BARANGAY_REFERENCE_POINTS,
  ) as SanPolicarpoBarangay[]) {
    const reference =
      SAN_POLICARPO_BARANGAY_REFERENCE_POINTS[
        barangay
      ]

    const maximumDistance =
      barangay.includes('(Poblacion)')
        ? 350
        : 1_500

    const ranked = candidates
      .map((candidate) => ({
        candidate,
        distance: distanceMeters(
          reference,
          candidate,
        ),
      }))
      .filter(
        ({ candidate, distance }) =>
          distance <= maximumDistance &&
          !used.has(
            `${candidate.osmType}:${candidate.osmId}`,
          ),
      )
      .sort(
        (left, right) =>
          left.distance - right.distance,
      )

    const selected = ranked[0]?.candidate

    if (!selected) {
      throw new Error(
        `No OpenStreetMap residential-building footprint was found close enough to the ${barangay} reference point. CRMS will not invent a demo-house coordinate. Add/verify a residential building in OpenStreetMap or adjust the verified demo location before seeding.`,
      )
    }

    used.add(
      `${selected.osmType}:${selected.osmId}`,
    )
    assigned.set(barangay, selected)

    console.log(
      `   🏠 ${barangay}: OSM ${selected.osmType} ${selected.osmId} (${selected.buildingType})`,
    )
  }

  return assigned
}

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
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Barangay No. 1 (Poblacion)' as SanPolicarpoBarangay],
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
    barangay: 'Barangay No. 2 (Poblacion)',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Barangay No. 2 (Poblacion)' as SanPolicarpoBarangay],
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
    barangay: 'Barangay No. 3 (Poblacion)',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Barangay No. 3 (Poblacion)' as SanPolicarpoBarangay],
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
    barangay: 'Barangay No. 4 (Poblacion)',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Barangay No. 4 (Poblacion)' as SanPolicarpoBarangay],
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
    barangay: 'Barangay No. 5 (Poblacion)',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Barangay No. 5 (Poblacion)' as SanPolicarpoBarangay],
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
    barangay: 'Alugan',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Alugan' as SanPolicarpoBarangay],
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
    barangay: 'Bahay',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Bahay' as SanPolicarpoBarangay],
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
    barangay: 'Baras (Lipata)',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Baras (Lipata)' as SanPolicarpoBarangay],
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
    barangay: 'Binogawan',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Binogawan' as SanPolicarpoBarangay],
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
    barangay: 'Cajagwayan',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Cajagwayan' as SanPolicarpoBarangay],
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
    barangay: 'Japunan',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Japunan' as SanPolicarpoBarangay],
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
    barangay: 'Natividad',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Natividad' as SanPolicarpoBarangay],
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
    barangay: 'Pangpang',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Pangpang' as SanPolicarpoBarangay],
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
    barangay: 'Tabo',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Tabo' as SanPolicarpoBarangay],
    types: ['SENIOR_CITIZEN', 'PWD'],
    needsAssistance: true,
    assistanceType: 'Medicine, Food assistance',
  },
  {
    email: 'demo.bangon@crms.test',
    name: 'Demo Resident Bangon',
    phone: '09172000014',
    firstName: 'DEMO',
    middleName: '',
    lastName: 'BANGON',
    birthDate: '1966-02-14',
    gender: 'Male',
    civilStatus: 'Married',
    barangay: 'Bangon',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Bangon' as SanPolicarpoBarangay],
    types: ['SENIOR_CITIZEN'],
    needsAssistance: true,
    assistanceType: 'Food assistance',
  },
  {
    email: 'demo.santacruz@crms.test',
    name: 'Demo Resident Santa Cruz',
    phone: '09172000015',
    firstName: 'DEMO',
    middleName: '',
    lastName: 'SANTA CRUZ',
    birthDate: '1979-07-09',
    gender: 'Female',
    civilStatus: 'Single',
    barangay: 'Santa Cruz',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Santa Cruz' as SanPolicarpoBarangay],
    types: ['PWD'],
    needsAssistance: false,
    assistanceType: '',
  },
  {
    email: 'demo.tanawan@crms.test',
    name: 'Demo Resident Tan-awan',
    phone: '09172000016',
    firstName: 'DEMO',
    middleName: '',
    lastName: 'TAN-AWAN',
    birthDate: '1962-10-25',
    gender: 'Male',
    civilStatus: 'Widowed',
    barangay: 'Tan-awan',
    ...SAN_POLICARPO_BARANGAY_REFERENCE_POINTS['Tan-awan' as SanPolicarpoBarangay],
    types: ['SENIOR_CITIZEN'],
    needsAssistance: true,
    assistanceType: 'Medicine',
  }]

async function main() {
  console.log('🌱 Starting database seeding...')

  const adminPassword = await bcrypt.hash('admin123', 10)
  const workerPassword = await bcrypt.hash('worker123', 10)
  const vulnerablePassword = await bcrypt.hash('vulnerable123', 10)

  const invalidVulnerableEntries =
    VULNERABLE_ACCOUNTS.filter(
      (account) =>
        !account ||
        !account.email ||
        !account.barangay ||
        !Number.isFinite(account.lat) ||
        !Number.isFinite(account.lng),
    )

  if (invalidVulnerableEntries.length > 0) {
    throw new Error(
      'Demo vulnerable account configuration contains an invalid or incomplete entry.',
    )
  }

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
        latitude: housePoint.lat,
        longitude: housePoint.lng,
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
        houseNumber: 'DEMO',
        street: 'OpenStreetMap residential building — demo record',
        barangay: account.barangay,
        municipality: 'San Policarpo',
        province: 'Eastern Samar',
        latitude: housePoint.lat,
        longitude: housePoint.lng,
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

    const profile = await prisma.vulnerableProfile.findUniqueOrThrow({
      where: { userId: user.id },
      select: { id: true },
    })

    await prisma.household.upsert({
      where: {
        vulnerableProfileId: profile.id,
      },
      update: {
        address: `OSM residential building — demo record, ${account.barangay}`,
        barangay: account.barangay,
        latitude: housePoint.lat,
        longitude: housePoint.lng,
        headOfHousehold: account.name,
        totalMembers: 1,
        vulnerableMembers: 1,
        notes:
          `Demo-only marker snapped to an OpenStreetMap residential-building footprint (OSM ${housePoint.osmType} ${housePoint.osmId}); it does not identify a real CRMS beneficiary household.`,
      },
      create: {
        address: `OSM residential building — demo record, ${account.barangay}`,
        barangay: account.barangay,
        latitude: housePoint.lat,
        longitude: housePoint.lng,
        headOfHousehold: account.name,
        totalMembers: 1,
        vulnerableMembers: 1,
        vulnerableProfileId: profile.id,
        notes:
          `Demo-only marker snapped to an OpenStreetMap residential-building footprint (OSM ${housePoint.osmType} ${housePoint.osmId}); it does not identify a real CRMS beneficiary household.`,
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
    ...ADMIN_ACCOUNTS,
    ...WORKER_ACCOUNTS,
    ...VULNERABLE_ACCOUNTS,
  ].map((account) => account.email.toLowerCase())

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
