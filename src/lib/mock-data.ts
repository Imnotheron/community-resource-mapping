/**
 * Mock Data Provider
 * ==================
 * Simulates the community resource mapping data that would normally be
 * fetched from the backend API (/api/map/data, /api/admin/profiles, etc.).
 * Used by the landing page to render data-driven cards and map markers
 * without requiring authentication.
 */
import type {
  CategoryMeta,
  CommunityAsset,
  FeatureSlide,
  MapMarker,
  AssetCategory,
} from './types/community-asset'

/** San Policarpo municipality center (used for mock coordinates). */
export const SAN_POLICARPO_CENTER = {
  latitude: 12.1792,
  longitude: 125.5072,
}

/** Display metadata for each resource category. */
export const CATEGORY_META: Record<AssetCategory, CategoryMeta> = {
  VULNERABLE_CITIZENS: {
    category: 'VULNERABLE_CITIZENS',
    label: 'Vulnerable Citizens',
    shortLabel: 'Citizens',
    accentColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.4)',
    description:
      'Registered seniors, PWDs, and low-income households receiving targeted assistance from the MSWDO.',
  },
  RELIEF_DISTRIBUTION: {
    category: 'RELIEF_DISTRIBUTION',
    label: 'Relief Distribution',
    shortLabel: 'Relief',
    accentColor: '#6ee7b7',
    glowColor: 'rgba(110, 231, 183, 0.4)',
    description:
      'Food packs, hygiene kits, and medical supplies tracked from request to delivery across barangays.',
  },
  COMMUNITY_FACILITIES: {
    category: 'COMMUNITY_FACILITIES',
    label: 'Community Facilities',
    shortLabel: 'Facilities',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    description:
      'Evacuation centers, health stations, barangay halls, and schools mapped for emergency readiness.',
  },
  EMERGENCY_ALERTS: {
    category: 'EMERGENCY_ALERTS',
    label: 'Emergency Alerts',
    shortLabel: 'Alerts',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    description:
      'Real-time typhoon, flood, and health advisories broadcast to citizens and field workers.',
  },
}

/** Mock vulnerable citizen assets (mirrors /api/map/data shape). */
const vulnerableCitizens: CommunityAsset[] = [
  {
    id: 'vc-001',
    kind: 'VULNERABLE_CITIZEN',
    category: 'VULNERABLE_CITIZENS',
    name: 'Maria Garcia',
    location: { latitude: 12.1792, longitude: 125.5072 },
    barangay: 'Barangay No. 1 (Poblacion)',
    subtitle: 'Senior Citizen · Hypertension',
    description:
      'Widowed senior citizen with chronic hypertension. Receives monthly food assistance and medicine refills.',
    updatedAt: '2026-06-20T08:00:00Z',
    vulnerabilityTypes: ['SENIOR_CITIZEN', 'LOW_INCOME', 'CHRONIC_ILLNESS'],
    registrationStatus: 'APPROVED',
    hasReceivedRelief: true,
    needsAssistance: false,
    mobileNumber: '+63 917 000 0003',
  },
  {
    id: 'vc-002',
    kind: 'VULNERABLE_CITIZEN',
    category: 'VULNERABLE_CITIZENS',
    name: 'Pedro Reyes',
    location: { latitude: 12.181, longitude: 125.505 },
    barangay: 'Barangay No. 2',
    subtitle: 'PWD · Mobility Impaired',
    description:
      'Person with disability requiring mobility assistance. Pending registration approval for relief eligibility.',
    updatedAt: '2026-07-01T10:30:00Z',
    vulnerabilityTypes: ['PWD', 'LOW_INCOME'],
    registrationStatus: 'PENDING',
    hasReceivedRelief: false,
    needsAssistance: true,
    mobileNumber: '+63 917 222 2222',
  },
  {
    id: 'vc-003',
    kind: 'VULNERABLE_CITIZEN',
    category: 'VULNERABLE_CITIZENS',
    name: 'Ana Dela Cruz',
    location: { latitude: 12.177, longitude: 125.51 },
    barangay: 'Barangay No. 3',
    subtitle: 'Single Parent · 3 Children',
    description:
      'Single mother of three, currently unemployed. Eligible for food packs and educational assistance.',
    updatedAt: '2026-06-28T14:00:00Z',
    vulnerabilityTypes: ['SINGLE_PARENT', 'LOW_INCOME', 'PREGNANT'],
    registrationStatus: 'APPROVED',
    hasReceivedRelief: true,
    needsAssistance: true,
  },
]

/** Mock relief distribution assets. */
const reliefDistributions: CommunityAsset[] = [
  {
    id: 'rd-001',
    kind: 'RELIEF_DISTRIBUTION',
    category: 'RELIEF_DISTRIBUTION',
    name: 'July Food Pack Distribution',
    location: { latitude: 12.1795, longitude: 125.5075 },
    barangay: 'Barangay No. 1 (Poblacion)',
    subtitle: 'Rice 5kg · Canned goods · Water',
    description:
      'Standard family food pack distributed to 12 approved households. Recorded by Field Worker One.',
    updatedAt: '2026-07-02T09:00:00Z',
    distributionType: 'Food Pack',
    itemsProvided: 'Rice 5kg, Canned goods x6, Water 5L',
    quantity: 12,
    status: 'APPROVED',
    beneficiaryName: 'Maria Garcia',
    workerName: 'Field Worker One',
  },
  {
    id: 'rd-002',
    kind: 'RELIEF_DISTRIBUTION',
    category: 'RELIEF_DISTRIBUTION',
    name: 'Hygiene Kit Distribution',
    location: { latitude: 12.182, longitude: 125.504 },
    barangay: 'Barangay No. 2',
    subtitle: 'Soap · Toothpaste · Sanitizer',
    description:
      'Hygiene kits for vulnerable families. Pending admin approval before scheduled delivery.',
    updatedAt: '2026-07-03T11:00:00Z',
    distributionType: 'Hygiene Kit',
    itemsProvided: 'Soap, Toothpaste, Sanitizer, Tissues',
    quantity: 8,
    status: 'PENDING',
    beneficiaryName: 'Pedro Reyes',
    workerName: 'Field Worker One',
  },
  {
    id: 'rd-003',
    kind: 'RELIEF_DISTRIBUTION',
    category: 'RELIEF_DISTRIBUTION',
    name: 'Medical Supplies Drop',
    location: { latitude: 12.1765, longitude: 125.511 },
    barangay: 'Barangay No. 3',
    subtitle: 'BP monitor · Vitamins · First aid',
    description:
      'Medical supplies for senior citizens with chronic conditions. Delivered to 5 households.',
    updatedAt: '2026-06-25T13:00:00Z',
    distributionType: 'Medical Supplies',
    itemsProvided: 'BP monitor, Vitamins, First aid kit',
    quantity: 5,
    status: 'DISTRIBUTED',
    beneficiaryName: 'Ana Dela Cruz',
    workerName: 'Field Worker One',
  },
]

/** Mock community facility assets. */
export const communityFacilities: CommunityAsset[] = [
  {
    id: 'cf-001',
    kind: 'COMMUNITY_FACILITY',
    category: 'COMMUNITY_FACILITIES',
    name: 'San Policarpo Gymnasium',
    location: { latitude: 12.179, longitude: 125.5068 },
    barangay: 'Barangay No. 1 (Poblacion)',
    subtitle: 'Evacuation Center · Cap. 200',
    description:
      'Primary evacuation center during typhoons and floods. Equipped with emergency supplies and sleeping quarters.',
    updatedAt: '2026-06-15T00:00:00Z',
    facilityType: 'EVACUATION_CENTER',
    capacity: 200,
    contactInfo: '+63 917 555 0001',
    isOpen: true,
  },
  {
    id: 'cf-002',
    kind: 'COMMUNITY_FACILITY',
    category: 'COMMUNITY_FACILITIES',
    name: 'Rural Health Unit',
    location: { latitude: 12.1805, longitude: 125.508 },
    barangay: 'Barangay No. 1 (Poblacion)',
    subtitle: 'Health Station · Daily 8AM-5PM',
    description:
      'Municipal health station providing primary care, vaccinations, and maternal health services.',
    updatedAt: '2026-06-10T00:00:00Z',
    facilityType: 'HEALTH_STATION',
    capacity: 50,
    contactInfo: '+63 917 555 0002',
    isOpen: true,
  },
  {
    id: 'cf-003',
    kind: 'COMMUNITY_FACILITY',
    category: 'COMMUNITY_FACILITIES',
    name: 'Barangay No. 2 Hall',
    location: { latitude: 12.1815, longitude: 125.5045 },
    barangay: 'Barangay No. 2',
    subtitle: 'Barangay Hall · 24/7 Contact',
    description:
      'Local government frontline service desk for barangay-level concerns and relief coordination.',
    updatedAt: '2026-06-01T00:00:00Z',
    facilityType: 'BARANGAY_HALL',
    capacity: 40,
    contactInfo: '+63 917 555 0003',
    isOpen: true,
  },
]

/** Mock emergency alert assets. */
const emergencyAlerts: CommunityAsset[] = [
  {
    id: 'ea-001',
    kind: 'EMERGENCY_ALERT',
    category: 'EMERGENCY_ALERTS',
    name: 'Typhoon Preparedness Advisory',
    location: { latitude: 12.1792, longitude: 125.5072 },
    barangay: 'Municipality-wide',
    subtitle: 'URGENT · All Barangays',
    description:
      'Approaching weather disturbance. All residents advised to prepare emergency kits. Field workers conducting safety checks.',
    updatedAt: '2026-07-03T06:00:00Z',
    priority: 'URGENT',
    alertType: 'TYPHOON',
    eventDate: '2026-07-05T00:00:00Z',
    isActive: true,
  },
  {
    id: 'ea-002',
    kind: 'EMERGENCY_ALERT',
    category: 'EMERGENCY_ALERTS',
    name: 'Vaccination Drive',
    location: { latitude: 12.1805, longitude: 125.508 },
    barangay: 'Barangay No. 1 (Poblacion)',
    subtitle: 'HIGH · Health Station',
    description:
      'Free flu and COVID-19 booster shots for seniors and vulnerable individuals at the Rural Health Unit.',
    updatedAt: '2026-07-01T00:00:00Z',
    priority: 'HIGH',
    alertType: 'HEALTH',
    eventDate: '2026-07-10T08:00:00Z',
    isActive: true,
  },
  {
    id: 'ea-003',
    kind: 'EMERGENCY_ALERT',
    category: 'EMERGENCY_ALERTS',
    name: 'Water Source Maintenance',
    location: { latitude: 12.177, longitude: 125.511 },
    barangay: 'Barangay No. 3',
    subtitle: 'NORMAL · Scheduled',
    description:
      'Community water source under scheduled maintenance. Alternative supply available at barangay hall.',
    updatedAt: '2026-06-28T00:00:00Z',
    priority: 'NORMAL',
    alertType: 'GENERAL',
    eventDate: '2026-07-08T07:00:00Z',
    isActive: true,
  },
]

/** All mock assets in one flat array (for map markers). */
export const ALL_ASSETS: CommunityAsset[] = [
  ...vulnerableCitizens,
  ...reliefDistributions,
  ...communityFacilities,
  ...emergencyAlerts,
]

/**
 * Builds feature slides for the carousel, grouping assets by category.
 * If `liveAssets` is provided, uses those for categories that have data;
 * falls back to mock data for any category that's empty or missing.
 */
export function buildFeatureSlides(liveAssets?: CommunityAsset[]): FeatureSlide[] {
  const source = liveAssets || ALL_ASSETS
  const byCategory = (cat: AssetCategory) => {
    const live = source.filter((a) => a.category === cat)
    // If live data returned at least one item for this category, use it;
    // otherwise fall back to mock so every slide has content.
    if (live.length > 0) return live
    return ALL_ASSETS.filter((a) => a.category === cat)
  }
  const groups: Array<{ category: AssetCategory; assets: CommunityAsset[] }> = [
    { category: 'VULNERABLE_CITIZENS', assets: byCategory('VULNERABLE_CITIZENS') },
    { category: 'RELIEF_DISTRIBUTION', assets: byCategory('RELIEF_DISTRIBUTION') },
    { category: 'COMMUNITY_FACILITIES', assets: byCategory('COMMUNITY_FACILITIES') },
    { category: 'EMERGENCY_ALERTS', assets: byCategory('EMERGENCY_ALERTS') },
  ]
  const total = groups.length
  return groups.map((g, i) => {
    const meta = CATEGORY_META[g.category]
    return {
      id: `slide-${i + 1}`,
      index: i + 1,
      total,
      category: g.category,
      title: meta.label,
      tagline: meta.shortLabel,
      description: meta.description,
      accentColor: meta.accentColor,
      assets: g.assets,
    }
  })
}

/** Quick stats for the hero section. */
export const HERO_STATS = [
  { label: 'Registered Citizens', value: 247, suffix: '' },
  { label: 'Relief Distributions', value: 1842, suffix: '' },
  { label: 'Active Barangays', value: 18, suffix: '' },
  { label: 'Response Rate', value: 98, suffix: '%' },
] as const

/**
 * Converts assets into map marker metadata.
 * Pulses for active alerts and citizens needing assistance.
 */
export function assetsToMarkers(assets: CommunityAsset[]): MapMarker[] {
  return assets.map((a) => {
    const meta = CATEGORY_META[a.category]
    let pulse = false
    if (a.kind === 'EMERGENCY_ALERT') pulse = a.isActive && a.priority === 'URGENT'
    if (a.kind === 'VULNERABLE_CITIZEN') pulse = a.needsAssistance
    return {
      id: a.id,
      position: a.location,
      category: a.category,
      label: a.name,
      color: meta.accentColor,
      pulse,
    }
  })
}
