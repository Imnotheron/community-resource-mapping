/**
 * cleanup-orphaned-users.js
 * 
 * Removes User records that are blocking email re-registration:
 * - VULNERABLE users with a REJECTED VulnerableProfile
 * - VULNERABLE users with NO VulnerableProfile at all
 * 
 * Run with: node scripts/cleanup-orphaned-users.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanup() {
  console.log('\n===== Cleaning Up Orphaned & Rejected User Records =====\n')

  // Case 1: VULNERABLE users whose profile is REJECTED
  const rejectedUsers = await prisma.user.findMany({
    where: {
      role: 'VULNERABLE',
      vulnerableProfile: { registrationStatus: 'REJECTED' }
    },
    select: { id: true, email: true, name: true }
  })

  // Case 2: VULNERABLE users whose profile was deleted (no profile at all)
  const orphanedUsers = await prisma.user.findMany({
    where: { role: 'VULNERABLE', vulnerableProfile: null },
    select: { id: true, email: true, name: true }
  })

  const allToDelete = [...rejectedUsers, ...orphanedUsers]

  if (allToDelete.length === 0) {
    console.log('✅ No orphaned or rejected users. Database is already clean!\n')
    await prisma.$disconnect()
    return
  }

  console.log(`Found ${rejectedUsers.length} rejected user(s):`)
  rejectedUsers.forEach(u => console.log(`  → ${u.email} (${u.name})`))

  console.log(`\nFound ${orphanedUsers.length} orphaned user(s) (no profile):`)
  orphanedUsers.forEach(u => console.log(`  → ${u.email} (${u.name})`))

  // Delete all — Prisma cascade handles: VulnerabilityDocument, Household, VulnerableProfile automatically
  for (const user of allToDelete) {
    await prisma.user.delete({ where: { id: user.id } })
    console.log(`\n✅ Deleted: ${user.email}`)
  }

  console.log(`\n===== Done! Freed ${allToDelete.length} email(s) for re-registration =====\n`)
  await prisma.$disconnect()
}

cleanup().catch(async (e) => {
  console.error('Cleanup failed:', e.message, e.code || '')
  await prisma.$disconnect()
  process.exit(1)
})
