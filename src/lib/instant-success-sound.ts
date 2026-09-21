'use client'

let sharedAudioContext: AudioContext | null = null

function getAudioContext() {
  if (typeof window === 'undefined') return null

  const AudioContextConstructor =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext
    }).webkitAudioContext

  if (!AudioContextConstructor) return null

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextConstructor()
  }

  return sharedAudioContext
}

/**
 * Plays an immediate two-note success chime.
 * Web Audio avoids MP3 encoder padding and leading-silence delays.
 */
export function playInstantSuccessSound() {
  const context = getAudioContext()
  if (!context) return

  const play = () => {
    const start = context.currentTime
    const master = context.createGain()
    master.gain.setValueAtTime(0.0001, start)
    master.gain.exponentialRampToValueAtTime(0.28, start + 0.008)
    master.gain.exponentialRampToValueAtTime(0.0001, start + 0.52)
    master.connect(context.destination)

    const first = context.createOscillator()
    first.type = 'sine'
    first.frequency.setValueAtTime(659.25, start)
    first.connect(master)
    first.start(start)
    first.stop(start + 0.22)

    const second = context.createOscillator()
    second.type = 'sine'
    second.frequency.setValueAtTime(880, start + 0.12)
    second.connect(master)
    second.start(start + 0.12)
    second.stop(start + 0.52)
  }

  if (context.state === 'suspended') {
    void context.resume().then(play).catch(() => {
      // Audio restrictions must never interrupt a successful save.
    })
    return
  }

  play()
}
