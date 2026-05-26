import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true }
  })
  console.log('Users in database:')
  console.log(JSON.stringify(users, null, 2))
  console.log(`Total: ${users.length}`)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
