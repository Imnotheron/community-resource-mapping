const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const count = await prisma.user.count();
    console.log('User count:', count);
    const users = await prisma.user.findMany();
    console.log('Found', users.length, 'users');
    users.forEach(u => console.log(' -', u.email, u.role));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.();
  }
}
test().catch(console.error);
