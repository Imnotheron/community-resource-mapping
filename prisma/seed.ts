import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10)
  const workerPassword = await bcrypt.hash('worker123', 10)
  const vulnerablePassword = await bcrypt.hash('vulnerable123', 10)

  // Create Admin Account
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sampolicarpo.gov' },
    update: {},
    create: {
      email: 'admin@sampolicarpo.gov',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      phone: '09123456789',
    },
  })
  console.log('✅ Admin account created:', admin.email)

  // Create Worker Account
  const worker = await prisma.user.upsert({
    where: { email: 'worker@sampolicarpo.gov' },
    update: {},
    create: {
      email: 'worker@sampolicarpo.gov',
      password: workerPassword,
      name: 'John Worker',
      role: 'WORKER',
      phone: '09123456788',
    },
  })
  console.log('✅ Worker account created:', worker.email)

  // Create Vulnerable User Account
  const vulnerable = await prisma.user.upsert({
    where: { email: 'maria.garcia@email.com' },
    update: {},
    create: {
      email: 'maria.garcia@email.com',
      password: vulnerablePassword,
      name: 'Maria Garcia',
      role: 'VULNERABLE',
      phone: '09123456787',
    },
  })
  console.log('✅ Vulnerable account created:', vulnerable.email)

  // Create Vulnerable Profile for Maria
  const vulnerableProfile = await prisma.vulnerableProfile.upsert({
    where: { userId: vulnerable.id },
    update: {},
    create: {
      userId: vulnerable.id,
      lastName: 'GARCIA',
      firstName: 'MARIA',
      middleName: 'SANTOS',
      suffix: '',
      dateOfBirth: new Date('1965-05-15'),
      gender: 'Female',
      civilStatus: 'Widow',
      mobileNumber: '09123456787',
      landlineNumber: '',
      emailAddress: 'maria.garcia@email.com',
      houseNumber: '123',
      street: 'Rizal Street',
      barangay: 'Barangay No. 1 (Poblacion)',
      municipality: 'San Policarpo',
      province: 'Eastern Samar',
      latitude: 12.1792,
      longitude: 125.5072,
      educationalAttainment: 'Elementary School',
      employmentStatus: 'Unemployed',
      employmentDetails: '',
      vulnerabilityTypes: '["SENIOR_CITIZEN"]',
      disabilityType: '',
      disabilityCause: '',
      disabilityIdNumber: '',
      emergencyContact: 'Juan Garcia Jr.',
      emergencyPhone: '09123456786',
      hasMedicalCondition: true,
      medicalConditions: 'Hypertension',
      needsAssistance: true,
      assistanceType: 'Food assistance, Medicine',
      hasRepresentative: false,
      representativeName: '',
      representativeRelationship: '',
      representativePhone: '',
      representativeEmail: '',
      hasAuthorizationLetter: false,
      registrationStatus: 'APPROVED',
    },
  })
  console.log('✅ Vulnerable profile created for:', vulnerableProfile.firstName)

  console.log('\n🎉 Seeding completed successfully!\n')
  console.log('📋 Test Accounts:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👨‍💼 ADMIN:')
  console.log('   Email: admin@sampolicarpo.gov')
  console.log('   Password: admin123')
  console.log('')
  console.log('👷 WORKER:')
  console.log('   Email: worker@sampolicarpo.gov')
  console.log('   Password: worker123')
  console.log('')
  console.log('👤 VULNERABLE:')
  console.log('   Email: maria.garcia@email.com')
  console.log('   Password: vulnerable123')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
