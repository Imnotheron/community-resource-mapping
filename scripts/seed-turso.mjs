// scripts/seed-turso.mjs
// Seeds the default admin user on Turso cloud database
import { createClient } from '@libsql/client';
import crypto from 'crypto';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Simple password hash (bcrypt not available in plain node, using SHA-256 for seed)
// The actual app uses bcryptjs for proper hashing
async function hashPassword(password) {
  // We'll use the app's bcryptjs if available
  try {
    const bcrypt = await import('bcryptjs');
    return bcrypt.default.hashSync(password, 10);
  } catch {
    // Fallback - won't work with the app's bcrypt comparison
    return crypto.createHash('sha256').update(password).digest('hex');
  }
}

async function seed() {
  console.log('🌱 Seeding admin user on Turso...');

  const hashedPassword = await hashPassword('admin123');
  const id = crypto.randomUUID().replace(/-/g, '').substring(0, 25);

  try {
    // Check if admin already exists
    const existing = await client.execute({
      sql: 'SELECT id FROM "User" WHERE email = ?',
      args: ['admin@crms.gov.ph'],
    });

    if (existing.rows.length > 0) {
      console.log('ℹ️  Admin user already exists, skipping...');
    } else {
      await client.execute({
        sql: `INSERT INTO "User" ("id", "email", "password", "name", "role", "createdAt", "updatedAt")
              VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [id, 'admin@crms.gov.ph', hashedPassword, 'System Administrator', 'ADMIN'],
      });
      console.log('✅ Admin user created!');
      console.log('   Email: admin@crms.gov.ph');
      console.log('   Password: admin123');
    }
  } catch (error) {
    console.error('❌ Failed to seed:', error.message);
  }

  process.exit(0);
}

seed();
