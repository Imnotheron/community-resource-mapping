export const RELIEF_GENERAL_LABELS: Record<string, string> = {
  FOOD: 'Food',
  MEDICAL: 'Medical / Health',
  FINANCIAL: 'Financial',
  SHELTER: 'Shelter',
  WATER: 'Water',
  HYGIENE: 'Hygiene / Sanitation',
  CLOTHING: 'Clothing / Bedding',
  LIVELIHOOD: 'Livelihood',
  OTHER: 'Other Relief',
}

export const VULNERABILITY_GENERAL_LABELS: Record<string, string> = {
  SENIOR_CITIZEN: 'Senior Citizen',
  PWD: 'Person with Disability',
  NEEDS_ASSISTANCE: 'Needs Assistance',
  GENERAL_WELFARE: 'General Welfare / Low Income',
  CIVIL_REGISTRY: 'Civil Registry Concern',
  OTHER: 'Other Vulnerability',
}

function rawVulnerabilityTypes(profile: any): string[] {
  const raw = profile?.vulnerabilityTypes
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map((value) => String(value))

  try {
    const parsed = JSON.parse(String(raw))
    if (Array.isArray(parsed)) return parsed.map((value) => String(value))
  } catch {}

  return String(raw)
    .split(/[,;|]/)
    .map((value) => value.trim())
    .filter(Boolean)
}

export function reliefGeneralCategory(distribution: any) {
  const text = [
    distribution?.distributionType,
    distribution?.itemsProvided,
  ]
    .join(' ')
    .toLowerCase()

  if (/food|rice|grocery|canned|meal|noodle/.test(text)) return 'FOOD'
  if (/medical|medicine|health|first aid|vitamin|drug/.test(text)) return 'MEDICAL'
  if (/cash|financial|money|allowance|peso/.test(text)) return 'FINANCIAL'
  if (/shelter|housing|roof|tent|tarpaulin|repair/.test(text)) return 'SHELTER'
  if (/water|drinking/.test(text)) return 'WATER'
  if (/hygiene|sanitary|soap|toiletr|cleaning/.test(text)) return 'HYGIENE'
  if (/clothing|clothes|blanket|bedding|garment/.test(text)) return 'CLOTHING'
  if (/livelihood|seed|farm|tool|business/.test(text)) return 'LIVELIHOOD'

  return 'OTHER'
}

export function vulnerabilityGeneralGroups(profile: any) {
  if (!profile) return ['OTHER']

  const groups = new Set<string>()
  for (const sector of rawVulnerabilityTypes(profile)) {
    const normalized = String(sector || '').toUpperCase()

    if (normalized.includes('SENIOR')) groups.add('SENIOR_CITIZEN')
    if (
      normalized === 'PWD' ||
      normalized.includes('DISABILITY') ||
      normalized.includes('DISABLED')
    ) {
      groups.add('PWD')
    }
    if (normalized.includes('NEEDS_ASSISTANCE')) {
      groups.add('NEEDS_ASSISTANCE')
    }
    if (
      normalized.includes('GENERAL_WELFARE') ||
      normalized.includes('LOW_INCOME') ||
      normalized.includes('INDIGENT') ||
      normalized.includes('POVERTY')
    ) {
      groups.add('GENERAL_WELFARE')
    }
    if (normalized.includes('CIVIL_REGISTRY')) groups.add('CIVIL_REGISTRY')
  }

  if (groups.size === 0) groups.add('OTHER')
  return Array.from(groups)
}
