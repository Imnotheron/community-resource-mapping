const DEFAULT_WALKTHROUGH_ROLLOUT_AT = '2026-07-31T00:00:00.000Z'

export const WALKTHROUGH_ROLLOUT_AT = Date.parse(
  process.env.NEXT_PUBLIC_WALKTHROUGH_ROLLOUT_AT ||
    DEFAULT_WALKTHROUGH_ROLLOUT_AT,
)

export function isNewWalkthroughAccount(createdAt?: string | null) {
  if (!createdAt) return false

  const created = Date.parse(createdAt)
  return Number.isFinite(created) && created >= WALKTHROUGH_ROLLOUT_AT
}

export function userScopedTourId(baseTourId: string, userId: string) {
  return `${baseTourId}:${userId}`
}
