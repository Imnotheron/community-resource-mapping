// scripts/migrate-turso.mjs
// Pushes the database schema to Turso cloud database
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migrations = [
  // User table
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "profilePicture" TEXT,
    "preferences" TEXT,
    "lastActive" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,

  // VulnerableProfile table
  `CREATE TABLE IF NOT EXISTS "VulnerableProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "suffix" TEXT,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "civilStatus" TEXT,
    "mobileNumber" TEXT NOT NULL,
    "landlineNumber" TEXT,
    "emailAddress" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "barangay" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "educationalAttainment" TEXT,
    "employmentStatus" TEXT,
    "employmentDetails" TEXT,
    "vulnerabilityTypes" TEXT NOT NULL,
    "disabilityType" TEXT,
    "disabilityCause" TEXT,
    "disabilityIdNumber" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "hasMedicalCondition" BOOLEAN NOT NULL DEFAULT false,
    "medicalConditions" TEXT,
    "needsAssistance" BOOLEAN NOT NULL DEFAULT false,
    "assistanceType" TEXT,
    "hasRepresentative" BOOLEAN NOT NULL DEFAULT false,
    "representativeName" TEXT,
    "representativeRelationship" TEXT,
    "representativePhone" TEXT,
    "representativeEmail" TEXT,
    "hasAuthorizationLetter" BOOLEAN NOT NULL DEFAULT false,
    "registrationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VulnerableProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VulnerableProfile_userId_key" ON "VulnerableProfile"("userId")`,

  // VulnerabilityDocument table
  `CREATE TABLE IF NOT EXISTS "VulnerabilityDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VulnerabilityDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "VulnerableProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  // Household table
  `CREATE TABLE IF NOT EXISTS "Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "barangay" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "headOfHousehold" TEXT,
    "totalMembers" INTEGER NOT NULL DEFAULT 1,
    "vulnerableMembers" INTEGER NOT NULL DEFAULT 0,
    "assignedWorkerId" TEXT,
    "vulnerableProfileId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Household_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Household_vulnerableProfileId_fkey" FOREIGN KEY ("vulnerableProfileId") REFERENCES "VulnerableProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Household_vulnerableProfileId_key" ON "Household"("vulnerableProfileId")`,

  // ReliefDistribution table
  `CREATE TABLE IF NOT EXISTS "ReliefDistribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT,
    "vulnerableProfileId" TEXT,
    "workerId" TEXT NOT NULL,
    "distributionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distributionType" TEXT NOT NULL,
    "itemsProvided" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReliefDistribution_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReliefDistribution_vulnerableProfileId_fkey" FOREIGN KEY ("vulnerableProfileId") REFERENCES "VulnerableProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReliefDistribution_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  // ReliefFeedback table
  `CREATE TABLE IF NOT EXISTS "ReliefFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reliefDistributionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "adminResponse" TEXT,
    "adminResponseDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReliefFeedback_reliefDistributionId_fkey" FOREIGN KEY ("reliefDistributionId") REFERENCES "ReliefDistribution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReliefFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  // CommunityResource table
  `CREATE TABLE IF NOT EXISTS "CommunityResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "barangay" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "capacity" INTEGER,
    "contactInfo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,

  // FieldNote table
  `CREATE TABLE IF NOT EXISTS "FieldNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FieldNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  // Notification table
  `CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentViaEmail" BOOLEAN NOT NULL DEFAULT false,
    "sentViaSms" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" DATETIME,
    "smsSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  // AdminSignupRequest table
  `CREATE TABLE IF NOT EXISTS "AdminSignupRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "requestedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AdminSignupRequest_email_key" ON "AdminSignupRequest"("email")`,

  // Announcement table
  `CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetRole" TEXT,
    "eventDate" DATETIME,
    "eventTime" TEXT,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,

  // Feedback table
  `CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "adminResponse" TEXT,
    "adminResponseDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
];

async function migrate() {
  console.log('🚀 Starting Turso database migration...');
  console.log(`📡 Connecting to: ${process.env.TURSO_DATABASE_URL}`);

  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i];
    const tableName = sql.match(/(?:TABLE|INDEX).*?"(\w+)"/)?.[1] || `Statement ${i + 1}`;
    try {
      await client.execute(sql);
      console.log(`✅ ${tableName}`);
    } catch (error) {
      console.error(`❌ Failed: ${tableName}`, error.message);
    }
  }

  console.log('\n🎉 Migration complete!');
  process.exit(0);
}

migrate();
