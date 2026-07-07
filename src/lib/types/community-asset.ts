/**
 * Community Asset Data Schema
 * ===========================
 * TypeScript interfaces that model the community resource mapping domain.
 * These types mirror the Prisma models in the backend repository
 * (https://github.com/Imnotheron/community-resource-mapping) and are used
 * by the landing page's mock data provider to render data-driven cards
 * and map markers.
 */

/** Geographic coordinate pair (WGS84 lat/lng). */
export interface GeoPoint {
  latitude: number
  longitude: number
}

/** Top-level resource categories shown in the FeatureSlider carousel. */
export type AssetCategory =
  | 'VULNERABLE_CITIZENS'
  | 'RELIEF_DISTRIBUTION'
  | 'COMMUNITY_FACILITIES'
  | 'EMERGENCY_ALERTS'

/** Vulnerability type tags (matches backend VulnerabilityType enum). */
export type VulnerabilityType =
  | 'SENIOR_CITIZEN'
  | 'PWD'
  | 'LOW_INCOME'
  | 'PREGNANT'
  | 'CHRONIC_ILLNESS'
  | 'SINGLE_PARENT'
  | 'OTHER'

/** Status of a vulnerable citizen's registration. */
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** Status of a relief distribution lifecycle. */
export type DistributionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISTRIBUTED'

/** Priority level for announcements and alerts. */
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

/** Facility types for community infrastructure. */
export type FacilityType =
  | 'EVACUATION_CENTER'
  | 'HEALTH_STATION'
  | 'BARANGAY_HALL'
  | 'SCHOOL'
  | 'CHURCH'
  | 'MARKET'
  | 'WATER_SOURCE'

/**
 * CommunityAsset — the unified shape used by landing-page cards and map markers.
 * Discriminated by `kind` so the UI can render the right icon/color per type.
 */
export type CommunityAsset =
  | VulnerableCitizenAsset
  | ReliefDistributionAsset
  | CommunityFacilityAsset
  | EmergencyAlertAsset

/** Common fields shared by every asset variant. */
export interface AssetBase {
  id: string
  category: AssetCategory
  name: string
  location: GeoPoint
  barangay: string
  /** Short label shown on the card subtitle. */
  subtitle: string
  /** Longer description shown when expanded. */
  description: string
  /** ISO date string of last update. */
  updatedAt: string
}

export interface VulnerableCitizenAsset extends AssetBase {
  kind: 'VULNERABLE_CITIZEN'
  vulnerabilityTypes: VulnerabilityType[]
  registrationStatus: RegistrationStatus
  hasReceivedRelief: boolean
  needsAssistance: boolean
  mobileNumber?: string
}

export interface ReliefDistributionAsset extends AssetBase {
  kind: 'RELIEF_DISTRIBUTION'
  distributionType: string
  itemsProvided: string
  quantity: number
  status: DistributionStatus
  beneficiaryName: string
  workerName: string
}

export interface CommunityFacilityAsset extends AssetBase {
  kind: 'COMMUNITY_FACILITY'
  facilityType: FacilityType
  capacity: number
  contactInfo: string
  isOpen: boolean
}

export interface EmergencyAlertAsset extends AssetBase {
  kind: 'EMERGENCY_ALERT'
  priority: Priority
  alertType: 'TYPHOON' | 'FLOOD' | 'FIRE' | 'HEALTH' | 'GENERAL'
  eventDate?: string
  isActive: boolean
}

/** A featured slide in the FeatureSlider carousel. */
export interface FeatureSlide {
  id: string
  index: number
  total: number
  category: AssetCategory
  title: string
  tagline: string
  description: string
  accentColor: string
  /** Assets rendered as cards inside this slide. */
  assets: CommunityAsset[]
}

/** Category display metadata (icon label, color, blurb). */
export interface CategoryMeta {
  category: AssetCategory
  label: string
  shortLabel: string
  accentColor: string
  glowColor: string
  description: string
}

/** Map marker metadata derived from an asset. */
export interface MapMarker {
  id: string
  position: GeoPoint
  category: AssetCategory
  label: string
  /** Hex color for the marker pin. */
  color: string
  /** Whether the marker should pulse (active alerts, needs-assistance). */
  pulse: boolean
}
