export type WalkthroughPlacement = 'auto' | 'top' | 'right' | 'bottom' | 'left' | 'center'

export type WalkthroughRole = 'PUBLIC' | 'ADMIN' | 'WORKER' | 'VULNERABLE'

export interface WalkthroughStep {
  id: string
  title: string
  description: string
  target?: string
  placement?: WalkthroughPlacement
  eyebrow?: string
  padding?: number
  beforeEnter?: () => void | Promise<void>
}

export interface WalkthroughTour {
  id: string
  version: number
  title: string
  role?: WalkthroughRole
  steps: WalkthroughStep[]
}

export interface WalkthroughProgressRecord {
  version: number
  status: 'completed' | 'skipped'
  updatedAt: string
}

export type WalkthroughProgressStore = Record<string, WalkthroughProgressRecord>
