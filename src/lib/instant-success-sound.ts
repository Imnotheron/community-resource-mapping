'use client'

import { playSuccessSound } from '@/lib/success-sound'

/**
 * Use the original uploaded cue for reliable browser decoding.
 * The shortened re-encoded MP3 was silent in some browsers.
 */
export function playInstantSuccessSound() {
  playSuccessSound()
}
