import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  try {
    console.log('🔄 Regenerating bcrypt hashes for live system...')
    const adminPassword = bcrypt.hashSync('admin123', 10);
    const workerPassword = bcrypt.hashSync('worker123', 10);
    const vulnerablePassword = bcrypt.hashSync('vulnerable123', 10);

    console.log('📡 Connected to Turso. Updating Admin...');
    
    // Check Admin
    const adminRes = await client.execute({ sql: 'SELECT * FROM "User" WHERE email = ?', args: ['admin@crms.gov.ph'] });
    if (adminRes.rows.length === 0) {
       console.log('Admin not found, creating...');
       await client.execute({
         sql: `INSERT INTO "User" ("id", "email", "password", "name", "role", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
         args: ['admin-live-id', 'admin@crms.gov.ph', adminPassword, 'System Administrator', 'ADMIN']
       });
    } else {
       console.log('Admin found, updating password...');
       await client.execute({ sql: 'UPDATE "User" SET "password" = ? WHERE email = ?', args: [adminPassword, 'admin@crms.gov.ph'] });
    }

    console.log('✅ Admin login fixed: admin@crms.gov.ph / admin123');
    
    // Add missing worker
    const workerRes = await client.execute({ sql: 'SELECT * FROM "User" WHERE email = ?', args: ['worker@sampolicarpo.gov'] });
    if (workerRes.rows.length === 0) {
       await client.execute({
         sql: `INSERT INTO "User" ("id", "email", "password", "name", "role", "phone", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
         args: ['worker-live-id', 'worker@sampolicarpo.gov', workerPassword, 'John Worker', 'WORKER', '09123456788']
       });
       console.log('✅ Added Worker login: worker@sampolicarpo.gov / worker123');
    }

    // Add missing vulnerable
    const vulnRes = await client.execute({ sql: 'SELECT * FROM "User" WHERE email = ?', args: ['maria.garcia@email.com'] });
    if (vulnRes.rows.length === 0) {
       await client.execute({
         sql: `INSERT INTO "User" ("id", "email", "password", "name", "role", "phone", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
         args: ['vuln-live-id', 'maria.garcia@email.com', vulnerablePassword, 'Maria Garcia', 'VULNERABLE', '09123456787']
       });
       console.log('✅ Added Vulnerable login: maria.garcia@email.com / vulnerable123');
    }

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

run();
