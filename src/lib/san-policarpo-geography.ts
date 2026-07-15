export const SAN_POLICARPO_CENTER = {
  lat: 12.1792,
  lng: 125.5072,
} as const

/**
 * A broad client-side safety envelope.
 *
 * This is not treated as the municipality boundary. The server also validates
 * the reverse-geocoded municipality/province before a point is accepted.
 */
export const SAN_POLICARPO_SERVICE_LIMITS = {
  south: 12.125,
  west: 125.375,
  north: 12.285,
  east: 125.625,
} as const

export const SAN_POLICARPO_BOUNDS: [
  [number, number],
  [number, number],
] = [
  [
    SAN_POLICARPO_SERVICE_LIMITS.west,
    SAN_POLICARPO_SERVICE_LIMITS.south,
  ],
  [
    SAN_POLICARPO_SERVICE_LIMITS.east,
    SAN_POLICARPO_SERVICE_LIMITS.north,
  ],
]

export const SAN_POLICARPO_BARANGAYS = [
  'Alugan',
  'Bahay',
  'Bangon',
  'Baras (Lipata)',
  'Binogawan',
  'Cajagwayan',
  'Japunan',
  'Natividad',
  'Pangpang',
  'Barangay No. 1 (Poblacion)',
  'Barangay No. 2 (Poblacion)',
  'Barangay No. 3 (Poblacion)',
  'Barangay No. 4 (Poblacion)',
  'Barangay No. 5 (Poblacion)',
  'Santa Cruz',
  'Tabo',
  'Tan-awan',
] as const

export type SanPolicarpoBarangay =
  (typeof SAN_POLICARPO_BARANGAYS)[number]

const BARANGAY_ALIASES: Record<
  SanPolicarpoBarangay,
  string[]
> = {
  Alugan: ['alugan'],
  Bahay: ['bahay'],
  Bangon: ['bangon'],
  'Baras (Lipata)': [
    'baras',
    'lipata',
    'baras lipata',
  ],
  Binogawan: ['binogawan'],
  Cajagwayan: [
    'cajagwayan',
    'cajag wayan',
    'cajagwayan',
  ],
  Japunan: [
    'japunan',
    'japonan',
  ],
  Natividad: ['natividad'],
  Pangpang: ['pangpang'],
  'Barangay No. 1 (Poblacion)': [
    '1',
    'no 1',
    'barangay 1',
    'barangay no 1',
    'poblacion 1',
    'pob 1',
  ],
  'Barangay No. 2 (Poblacion)': [
    '2',
    'no 2',
    'barangay 2',
    'barangay no 2',
    'poblacion 2',
    'pob 2',
  ],
  'Barangay No. 3 (Poblacion)': [
    '3',
    'no 3',
    'barangay 3',
    'barangay no 3',
    'poblacion 3',
    'pob 3',
  ],
  'Barangay No. 4 (Poblacion)': [
    '4',
    'no 4',
    'barangay 4',
    'barangay no 4',
    'poblacion 4',
    'pob 4',
  ],
  'Barangay No. 5 (Poblacion)': [
    '5',
    'no 5',
    'barangay 5',
    'barangay no 5',
    'poblacion 5',
    'pob 5',
  ],
  'Santa Cruz': [
    'santa cruz',
    'sta cruz',
  ],
  Tabo: ['tabo'],
  'Tan-awan': [
    'tan awan',
    'tan-awan',
    'tanauawan',
  ],
}

export function normalizeGeographyName(
  value: unknown,
) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bbarangay\b/g, ' ')
    .replace(/\bbrgy\b\.?/g, ' ')
    .replace(/\bpoblacion\b/g, ' ')
    .replace(/\bpob\b\.?/g, ' ')
    .replace(/\bnumber\b/g, ' no ')
    .replace(/[()[\].,_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isSanPolicarpoName(
  value: unknown,
) {
  const normalized =
    normalizeGeographyName(value)

  return (
    normalized === 'san policarpo' ||
    normalized ===
      'municipality of san policarpo' ||
    normalized.includes('san policarpo')
  )
}

export function isEasternSamarName(
  value: unknown,
) {
  return normalizeGeographyName(
    value,
  ).includes('eastern samar')
}

export function matchSanPolicarpoBarangay(
  value: unknown,
): SanPolicarpoBarangay | null {
  const normalized =
    normalizeGeographyName(value)

  if (!normalized) {
    return null
  }

  for (const barangay of SAN_POLICARPO_BARANGAYS) {
    const aliases = [
      barangay,
      ...BARANGAY_ALIASES[barangay],
    ]

    if (
      aliases.some(
        (alias) =>
          normalizeGeographyName(alias) ===
          normalized,
      )
    ) {
      return barangay
    }
  }

  return null
}

export function isWithinSanPolicarpoServiceEnvelope(
  lat: number,
  lng: number,
) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= SAN_POLICARPO_SERVICE_LIMITS.south &&
    lat <= SAN_POLICARPO_SERVICE_LIMITS.north &&
    lng >= SAN_POLICARPO_SERVICE_LIMITS.west &&
    lng <= SAN_POLICARPO_SERVICE_LIMITS.east
  )
}
