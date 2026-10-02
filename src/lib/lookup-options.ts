import { db } from '@/lib/db'

export const LOOKUP_GROUPS = [
  'BLOOD_TYPE',
  'EDUCATIONAL_ATTAINMENT',
  'EMPLOYMENT_STATUS',
  'GUARDIAN_RELATIONSHIP',
  'POVERTY_STATUS',
  'CIVIL_REGISTRY_STATUS',
  'DISABILITY_TYPE',
  'DISABILITY_SEVERITY',
  'DISABILITY_CAUSE',
  'ASSISTANCE_TYPE',
  'DISTRIBUTION_TYPE',
] as const

export type LookupGroup = (typeof LOOKUP_GROUPS)[number]

const DEFAULTS: Partial<Record<LookupGroup, string[]>> = {
  BLOOD_TYPE: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown / Not tested'],
  EDUCATIONAL_ATTAINMENT: [
    'No formal education',
    'Elementary level',
    'Elementary graduate',
    'Junior high school level',
    'Junior high school graduate',
    'Senior high school level',
    'Senior high school graduate',
    'Vocational / Technical',
    'College level',
    'College graduate',
    'Postgraduate',
  ],
  EMPLOYMENT_STATUS: [
    'Unemployed',
    'Employed full-time',
    'Employed part-time',
    'Self-employed',
    'Seasonal / Informal worker',
    'Student',
    'Homemaker',
    'Retired',
    'Unable to work',
    'Other / Not specified',
  ],
  GUARDIAN_RELATIONSHIP: [
    'Parent',
    'Spouse',
    'Child',
    'Sibling',
    'Grandparent',
    'Grandchild',
    'Other relative',
    'Legal guardian',
    'Caregiver',
    'Social worker',
    'Other / Not specified',
  ],
  POVERTY_STATUS: [
    'Not assessed',
    'Indigent',
    'Low-income',
    'Near-poor',
    'No regular income',
    'Food insecure',
    'Homeless / Displaced',
    'Other vulnerable household',
  ],
  CIVIL_REGISTRY_STATUS: [
    'Birth certificate available',
    'Late registered',
    'For verification',
    'No PSA record',
    'Not registered',
    'Unknown',
  ],
  DISABILITY_TYPE: [
    'Physical disability',
    'Visual disability',
    'Hearing disability',
    'Speech or language disability',
    'Intellectual disability',
    'Learning disability',
    'Psychosocial disability',
    'Mental disability',
    'Multiple disabilities',
    'Other / Not specified',
  ],
  DISABILITY_SEVERITY: ['Mild', 'Moderate', 'Severe', 'Profound', 'Not assessed'],
  DISABILITY_CAUSE: [
    'Congenital / Inborn',
    'Illness / Disease',
    'Injury / Accident',
    'Work-related injury',
    'Age-related',
    'Disaster / Conflict',
    'Unknown',
    'Other / Not specified',
  ],
  ASSISTANCE_TYPE: [
    'Food assistance',
    'Medical assistance',
    'Financial assistance',
    'Shelter assistance',
    'Mobility / assistive device',
    'Other assistance',
  ],
  DISTRIBUTION_TYPE: [
    'Food Pack',
    'Medical',
    'Cash Assistance',
    'Hygiene Kit',
    'Shelter Materials',
    'Other',
  ],
}

export function normalizeLookupGroup(value: unknown): LookupGroup | null {
  const group = String(value || '').trim().toUpperCase() as LookupGroup
  return LOOKUP_GROUPS.includes(group) ? group : null
}

export async function ensureLookupOptionsTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LookupOption" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "groupName" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("groupName", "value")
    )
  `)

  for (const [group, values] of Object.entries(DEFAULTS)) {
    for (let index = 0; index < (values || []).length; index += 1) {
      const value = values![index]
      await db.$executeRawUnsafe(
        `INSERT OR IGNORE INTO "LookupOption"
          ("id", "groupName", "value", "label", "isActive", "sortOrder")
         VALUES (?, ?, ?, ?, 1, ?)`,
        crypto.randomUUID(),
        group,
        value,
        value,
        index,
      )
    }
  }
}

export async function readLookupOptions(group?: LookupGroup | null) {
  await ensureLookupOptionsTable()

  type Row = {
    id: string
    groupName: string
    value: string
    label: string
    isActive: number | boolean
    sortOrder: number
  }

  const rows = group
    ? await db.$queryRawUnsafe<Row[]>(
        `SELECT "id", "groupName", "value", "label", "isActive", "sortOrder"
         FROM "LookupOption"
         WHERE "groupName" = ?
         ORDER BY "sortOrder" ASC, "label" ASC`,
        group,
      )
    : await db.$queryRawUnsafe<Row[]>(
        `SELECT "id", "groupName", "value", "label", "isActive", "sortOrder"
         FROM "LookupOption"
         ORDER BY "groupName" ASC, "sortOrder" ASC, "label" ASC`,
      )

  return rows.map((row) => ({
    ...row,
    isActive: Boolean(row.isActive),
  }))
}
