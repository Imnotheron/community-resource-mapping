'use client'

import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  AudioLines,
  Bot,
  Loader2,
  MessageSquarePlus,
  PhoneOff,
  Send,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { apiFetch } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type LiveTokenResponse = {
  mode: 'live' | 'turn'
  token?: string
  model: string
  systemInstruction?: string
  expiresAt?: string
  reason?: string
}

const POSITION_KEY =
  'crms-assistant-launcher-position-v4'
const LAUNCHER_SIZE = 54
const LAUNCHER_VISIBLE_EDGE = 18

function viewportSize() {
  if (typeof window === 'undefined') {
    return {
      width: 0,
      height: 0,
      offsetLeft: 0,
      offsetTop: 0,
    }
  }

  const visual = window.visualViewport

  return {
    width: Math.max(
      1,
      visual?.width || window.innerWidth,
    ),
    height: Math.max(
      1,
      visual?.height || window.innerHeight,
    ),
    offsetLeft: visual?.offsetLeft || 0,
    offsetTop: visual?.offsetTop || 0,
  }
}

function clampLauncher(
  position: { x: number; y: number },
) {
  const {
    width,
    height,
    offsetLeft,
    offsetTop,
  } = viewportSize()

  const minX =
    offsetLeft - LAUNCHER_VISIBLE_EDGE
  const maxX =
    offsetLeft +
    width -
    LAUNCHER_SIZE +
    LAUNCHER_VISIBLE_EDGE

  return {
    x: Math.min(
      Math.max(minX, position.x),
      Math.max(minX, maxX),
    ),
    y: Math.min(
      Math.max(offsetTop, position.y),
      Math.max(
        offsetTop,
        offsetTop +
          height -
          LAUNCHER_SIZE,
      ),
    ),
  }
}

function defaultLauncherPosition() {
  const {
    width,
    height,
    offsetLeft,
    offsetTop,
  } = viewportSize()

  return clampLauncher({
    x:
      offsetLeft +
      width -
      LAUNCHER_SIZE -
      12,
    y:
      offsetTop +
      height -
      LAUNCHER_SIZE -
      92,
  })
}

function floatToPcm16(
  input: Float32Array,
  inputRate: number,
  outputRate = 16_000,
) {
  const ratio =
    inputRate / outputRate
  const outputLength =
    Math.max(
      1,
      Math.floor(
        input.length / ratio,
      ),
    )
  const output =
    new Int16Array(outputLength)

  for (
    let index = 0;
    index < outputLength;
    index += 1
  ) {
    const sourceIndex =
      index * ratio
    const left =
      Math.floor(sourceIndex)
    const right =
      Math.min(
        input.length - 1,
        left + 1,
      )
    const fraction =
      sourceIndex - left
    const sample =
      input[left] +
      (input[right] - input[left]) *
        fraction

    output[index] =
      Math.max(
        -1,
        Math.min(1, sample),
      ) < 0
        ? Math.round(
            Math.max(
              -1,
              Math.min(1, sample),
            ) * 0x8000,
          )
        : Math.round(
            Math.max(
              -1,
              Math.min(1, sample),
            ) * 0x7fff,
          )
  }

  return new Uint8Array(
    output.buffer,
  )
}

function bytesToBase64(
  bytes: Uint8Array,
) {
  let binary = ''
  const chunk = 0x8000

  for (
    let index = 0;
    index < bytes.length;
    index += chunk
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(
        index,
        Math.min(
          bytes.length,
          index + chunk,
        ),
      ),
    )
  }

  return btoa(binary)
}

function base64ToPcm16(
  value: string,
) {
  const binary = atob(value)
  const bytes =
    new Uint8Array(binary.length)

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(index)
  }

  return new Int16Array(
    bytes.buffer,
  )
}

function appendTranscript(
  current: string,
  next: string,
) {
  const incoming = next.trim()
  if (!incoming) return current

  if (!current) return incoming
  if (incoming === current) return current
  if (incoming.startsWith(current)) {
    return incoming
  }

  return (
    current +
    (current.endsWith(' ') ? '' : ' ') +
    incoming
  ).trim()
}

async function blobToBase64(
  blob: Blob,
) {
  const bytes =
    new Uint8Array(
      await blob.arrayBuffer(),
    )

  return bytesToBase64(bytes)
}

function preferredRecordingMime() {
  if (
    typeof MediaRecorder ===
    'undefined'
  ) {
    return ''
  }

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ]

  return (
    candidates.find((mime) =>
      MediaRecorder.isTypeSupported(
        mime,
      ),
    ) || ''
  )
}

export function CrmsAssistant({
  userName,
  userRole,
  activeView,
  activeViewLabel,
}: {
  userName: string
  userRole: string
  activeView: string
  activeViewLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] =
    useState<Message[]>([])
  const [sending, setSending] =
    useState(false)
  const [providerLabel, setProviderLabel] =
    useState('AI connection not verified')
  const [voiceMode, setVoiceMode] =
    useState(false)
  const [
    voiceTransport,
    setVoiceTransport,
  ] = useState<
    'live' | 'turn' | null
  >(null)
  const [voiceStatus, setVoiceStatus] =
    useState('Voice Chat ready')
  const [voiceError, setVoiceError] =
    useState<string | null>(null)
  const [
    launcherPosition,
    setLauncherPosition,
  ] = useState<{
    x: number
    y: number
  } | null>(null)
  const [portalReady, setPortalReady] =
    useState(false)

  const messagesRef =
    useRef<Message[]>([])
  const socketRef =
    useRef<WebSocket | null>(null)
  const mediaStreamRef =
    useRef<MediaStream | null>(null)
  const voiceTransportRef =
    useRef<'live' | 'turn' | null>(
      null,
    )
  const turnModelRef =
    useRef('gemini-3.5-flash-lite')
  const turnRecorderRef =
    useRef<MediaRecorder | null>(
      null,
    )
  const turnChunksRef =
    useRef<Blob[]>([])
  const turnAnalyserRef =
    useRef<AnalyserNode | null>(
      null,
    )
  const turnFrameRef =
    useRef<number | null>(null)
  const turnSpeechWatchdogRef =
    useRef<number | null>(null)
  const turnSpeechSeenRef =
    useRef(false)
  const turnLastSpeechAtRef =
    useRef(0)
  const turnStartedAtRef =
    useRef(0)
  const inputContextRef =
    useRef<AudioContext | null>(null)
  const outputContextRef =
    useRef<AudioContext | null>(null)
  const inputProcessorRef =
    useRef<ScriptProcessorNode | null>(null)
  const inputSourceRef =
    useRef<MediaStreamAudioSourceNode | null>(null)
  const silentGainRef =
    useRef<GainNode | null>(null)
  const liveReadyRef = useRef(false)
  const voiceModeRef = useRef(false)
  const preflightRef = useRef(false)
  const preflightAudioRef = useRef(false)
  const preflightTimeoutRef =
    useRef<number | null>(null)
  const setupTimeoutRef =
    useRef<number | null>(null)
  const stoppingVoiceRef =
    useRef(false)
  const nextPlaybackTimeRef =
    useRef(0)
  const inputTranscriptRef =
    useRef('')
  const outputTranscriptRef =
    useRef('')
  const playbackSourcesRef =
    useRef<Set<AudioBufferSourceNode>>(
      new Set(),
    )
  const dragRef = useRef<{
    pointerId: number
    grabX: number
    grabY: number
    x: number
    y: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    setPortalReady(true)

    try {
      const saved =
        window.localStorage.getItem(
          POSITION_KEY,
        )

      if (saved) {
        const parsed = JSON.parse(saved)

        if (
          Number.isFinite(parsed?.x) &&
          Number.isFinite(parsed?.y)
        ) {
          setLauncherPosition(
            clampLauncher({
              x: Number(parsed.x),
              y: Number(parsed.y),
            }),
          )
        } else {
          setLauncherPosition(
            defaultLauncherPosition(),
          )
        }
      } else {
        setLauncherPosition(
          defaultLauncherPosition(),
        )
      }
    } catch {
      setLauncherPosition(
        defaultLauncherPosition(),
      )
    }

    const resize = () => {
      setLauncherPosition((current) =>
        clampLauncher(
          current ||
            defaultLauncherPosition(),
        ),
      )
    }

    window.addEventListener(
      'resize',
      resize,
    )
    window.visualViewport?.addEventListener(
      'resize',
      resize,
    )
    window.visualViewport?.addEventListener(
      'scroll',
      resize,
    )

    return () => {
      window.removeEventListener(
        'resize',
        resize,
      )
      window.visualViewport?.removeEventListener(
        'resize',
        resize,
      )
      window.visualViewport?.removeEventListener(
        'scroll',
        resize,
      )

      void stopVoiceChat(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function persistLauncher(
    position: { x: number; y: number },
  ) {
    const safe =
      clampLauncher(position)

    setLauncherPosition(safe)

    try {
      window.localStorage.setItem(
        POSITION_KEY,
        JSON.stringify(safe),
      )
    } catch {
      // Position storage is optional.
    }
  }

  function addMessage(
    message: Message,
  ) {
    const next = [
      ...messagesRef.current,
      message,
    ].slice(-40)

    messagesRef.current = next
    setMessages(next)
  }

  async function requestAssistantReply(
    content: string,
  ) {
    const history = [
      ...messagesRef.current,
    ].slice(-14)

    addMessage({
      role: 'user',
      content,
    })

    const data =
      await apiFetch<{
        reply: string
        provider?: string
        model?: string
      }>('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: content,
          history,
          activeView,
          activeViewLabel,
        }),
      })

    const reply =
      String(
        data.reply || '',
      ).trim() ||
      'The assistant returned an empty response.'

    addMessage({
      role: 'assistant',
      content: reply,
    })

    setProviderLabel(
      data.provider === 'gemini'
        ? `Gemini · ${data.model || 'connected model'}`
        : 'AI connected',
    )

    return {
      reply,
      model:
        data.model ||
        'connected model',
    }
  }

  async function sendTypedMessage() {
    const content = input.trim()
    if (!content || sending) return

    setInput('')
    setSending(true)

    try {
      await requestAssistantReply(
        content,
      )
    } catch (error: any) {
      setProviderLabel(
        'AI offline / not configured',
      )
      toast.error(
        'CRMS Assistant unavailable',
        {
          description:
            error?.message ||
            'Please try again.',
        },
      )
    } finally {
      setSending(false)
    }
  }

  function playLiveAudio(
    base64: string,
    mimeType = 'audio/pcm;rate=24000',
  ) {
    const context =
      outputContextRef.current

    if (!context) return

    const pcm =
      base64ToPcm16(base64)

    if (pcm.length === 0) return

    const rateMatch =
      /rate=(\d+)/i.exec(
        mimeType,
      )
    const sampleRate =
      Number(rateMatch?.[1]) ||
      24_000

    const buffer =
      context.createBuffer(
        1,
        pcm.length,
        sampleRate,
      )
    const channel =
      buffer.getChannelData(0)

    for (
      let index = 0;
      index < pcm.length;
      index += 1
    ) {
      channel[index] =
        pcm[index] / 32768
    }

    const source =
      context.createBufferSource()

    source.buffer = buffer
    source.connect(
      context.destination,
    )

    const startAt = Math.max(
      context.currentTime + 0.02,
      nextPlaybackTimeRef.current,
    )

    playbackSourcesRef.current.add(
      source,
    )
    source.onended = () => {
      playbackSourcesRef.current.delete(
        source,
      )
    }

    source.start(startAt)
    nextPlaybackTimeRef.current =
      startAt + buffer.duration
  }

  function startMicrophoneStreaming(
    stream: MediaStream,
  ) {
    const socket =
      socketRef.current

    if (
      !socket ||
      socket.readyState !==
        WebSocket.OPEN
    ) {
      return
    }

    const context =
      new AudioContext({
        latencyHint: 'interactive',
      })

    inputContextRef.current = context

    const source =
      context.createMediaStreamSource(
        stream,
      )
    const processor =
      context.createScriptProcessor(
        4096,
        1,
        1,
      )
    const silentGain =
      context.createGain()

    silentGain.gain.value = 0

    processor.onaudioprocess = (
      event,
    ) => {
      const currentSocket =
        socketRef.current

      if (
        !liveReadyRef.current ||
        !currentSocket ||
        currentSocket.readyState !==
          WebSocket.OPEN
      ) {
        return
      }

      const inputChannel =
        event.inputBuffer.getChannelData(
          0,
        )

      const pcm =
        floatToPcm16(
          inputChannel,
          context.sampleRate,
          16_000,
        )

      currentSocket.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              data:
                bytesToBase64(
                  pcm,
                ),
              mimeType:
                'audio/pcm;rate=16000',
            },
          },
        }),
      )
    }

    source.connect(processor)
    processor.connect(silentGain)
    silentGain.connect(
      context.destination,
    )

    inputSourceRef.current =
      source
    inputProcessorRef.current =
      processor
    silentGainRef.current =
      silentGain

    void context.resume()

    setVoiceStatus(
      'Listening — speak naturally',
    )
  }

  function finishLiveTurn() {
    const userText =
      inputTranscriptRef.current.trim()
    const assistantText =
      outputTranscriptRef.current.trim()

    if (userText) {
      addMessage({
        role: 'user',
        content:
          '🎙 ' + userText,
      })
    }

    if (assistantText) {
      addMessage({
        role: 'assistant',
        content:
          '🔊 ' + assistantText,
      })
    }

    inputTranscriptRef.current = ''
    outputTranscriptRef.current = ''

    if (
      voiceModeRef.current &&
      !preflightRef.current
    ) {
      setVoiceStatus(
        'Listening — speak naturally',
      )
    }
  }

  function clearTurnMonitor() {
    if (
      turnFrameRef.current !== null
    ) {
      window.cancelAnimationFrame(
        turnFrameRef.current,
      )
      turnFrameRef.current = null
    }

    turnAnalyserRef.current = null
  }

  function clearSpeechWatchdog() {
    if (
      turnSpeechWatchdogRef.current !== null
    ) {
      window.clearTimeout(
        turnSpeechWatchdogRef.current,
      )
      turnSpeechWatchdogRef.current = null
    }
  }

  function closeCompatibleInputGraph() {
    clearTurnMonitor()

    inputSourceRef.current?.disconnect()
    inputSourceRef.current = null
    turnAnalyserRef.current = null

    const context =
      inputContextRef.current
    inputContextRef.current = null

    if (context) {
      void context
        .close()
        .catch(() => undefined)
    }
  }

  function speakCompatibleReply(
    text: string,
  ) {
    if (
      !voiceModeRef.current ||
      voiceTransportRef.current !==
        'turn'
    ) {
      return
    }

    if (
      !('speechSynthesis' in window)
    ) {
      setVoiceError(
        'This browser cannot play spoken replies. Typed chat still works.',
      )
      void stopVoiceChat(false)
      return
    }

    window.speechSynthesis.cancel()

    const utterance =
      new SpeechSynthesisUtterance(
        text,
      )
    utterance.lang = 'en-PH'
    utterance.rate = 1

    setVoiceStatus(
      'CRMS Assistant is speaking…',
    )

    const continueListening = () => {
      clearSpeechWatchdog()

      if (
        voiceModeRef.current &&
        voiceTransportRef.current ===
          'turn' &&
        mediaStreamRef.current
      ) {
        window.setTimeout(() => {
          if (
            voiceModeRef.current &&
            mediaStreamRef.current
          ) {
            startCompatibleVoiceTurn(
              mediaStreamRef.current,
            )
          }
        }, 300)
      }
    }

    utterance.onend =
      continueListening

    utterance.onerror = () => {
      clearSpeechWatchdog()
      setVoiceError(
        'The browser could not play the spoken reply.',
      )
      void stopVoiceChat(false)
    }

    clearSpeechWatchdog()
    turnSpeechWatchdogRef.current =
      window.setTimeout(() => {
        if (
          voiceModeRef.current &&
          voiceTransportRef.current ===
            'turn'
        ) {
          window.speechSynthesis.cancel()
          continueListening()
        }
      }, Math.min(
        45_000,
        Math.max(
          8_000,
          text.length * 65,
        ),
      ))

    window.speechSynthesis.speak(
      utterance,
    )
  }

  async function processCompatibleVoice(
    blob: Blob,
    mimeType: string,
  ) {
    if (
      !voiceModeRef.current ||
      stoppingVoiceRef.current
    ) {
      return
    }

    try {
      setVoiceStatus(
        'Understanding your voice…',
      )

      const audio =
        await blobToBase64(blob)

      const transcription =
        await apiFetch<{
          transcript: string
          model?: string
        }>(
          '/api/assistant/transcribe',
          {
            method: 'POST',
            body: JSON.stringify({
              audio,
              mimeType,
              model:
                turnModelRef.current,
            }),
          },
        )

      const transcript =
        String(
          transcription.transcript ||
            '',
        ).trim()

      if (!transcript) {
        throw new Error(
          'No speech was understood.',
        )
      }

      setInput(transcript)
      setVoiceStatus(
        'Checking CRMS…',
      )
      setSending(true)

      const result =
        await requestAssistantReply(
          transcript,
        )

      setInput('')
      setProviderLabel(
        `Gemini Voice · ${transcription.model || turnModelRef.current}`,
      )
      setVoiceStatus(
        'Preparing spoken reply…',
      )

      speakCompatibleReply(
        result.reply,
      )
    } catch (error: any) {
      const message =
        error?.message ||
        'Compatible Voice Chat failed.'

      setVoiceError(message)
      setVoiceStatus(
        'Voice Chat stopped',
      )
      await stopVoiceChat(false)
    } finally {
      setSending(false)
    }
  }

  function startCompatibleVoiceTurn(
    stream: MediaStream,
  ) {
    if (
      !voiceModeRef.current ||
      voiceTransportRef.current !==
        'turn' ||
      stoppingVoiceRef.current
    ) {
      return
    }

    if (
      typeof MediaRecorder ===
      'undefined'
    ) {
      setVoiceError(
        'This browser does not support audio recording for Voice Chat.',
      )
      void stopVoiceChat(false)
      return
    }

    clearTurnMonitor()

    const mimeType =
      preferredRecordingMime()

    let recorder: MediaRecorder

    try {
      recorder = mimeType
        ? new MediaRecorder(
            stream,
            { mimeType },
          )
        : new MediaRecorder(
            stream,
          )
    } catch {
      setVoiceError(
        'The browser could not start the microphone recorder.',
      )
      void stopVoiceChat(false)
      return
    }

    turnRecorderRef.current =
      recorder
    turnChunksRef.current = []
    turnSpeechSeenRef.current =
      false
    turnStartedAtRef.current =
      performance.now()
    turnLastSpeechAtRef.current =
      0

    recorder.ondataavailable = (
      event,
    ) => {
      if (
        event.data &&
        event.data.size > 0
      ) {
        turnChunksRef.current.push(
          event.data,
        )
      }
    }

    recorder.onerror = () => {
      setVoiceError(
        'The browser microphone recorder reported an error.',
      )
      void stopVoiceChat(false)
    }

    recorder.onstop = () => {
      closeCompatibleInputGraph()

      if (
        stoppingVoiceRef.current ||
        !voiceModeRef.current
      ) {
        return
      }

      const chunks =
        turnChunksRef.current
      turnChunksRef.current = []

      if (
        !turnSpeechSeenRef.current ||
        chunks.length === 0
      ) {
        setVoiceError(
          'No speech was detected. Tap Voice Chat to try again.',
        )
        void stopVoiceChat(false)
        return
      }

      const blob = new Blob(
        chunks,
        {
          type:
            recorder.mimeType ||
            mimeType ||
            'audio/webm',
        },
      )

      void processCompatibleVoice(
        blob,
        blob.type,
      )
    }

    const context =
      new AudioContext({
        latencyHint: 'interactive',
      })
    inputContextRef.current =
      context

    const source =
      context.createMediaStreamSource(
        stream,
      )
    inputSourceRef.current =
      source

    const analyser =
      context.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant =
      0.15
    turnAnalyserRef.current =
      analyser

    source.connect(analyser)

    const samples =
      new Float32Array(
        analyser.fftSize,
      )

    let noiseFloor = 0.003
    let speechFrames = 0

    const monitor = () => {
      if (
        !voiceModeRef.current ||
        recorder.state !==
          'recording'
      ) {
        return
      }

      analyser.getFloatTimeDomainData(
        samples,
      )

      let sum = 0
      for (
        let index = 0;
        index < samples.length;
        index += 1
      ) {
        sum +=
          samples[index] *
          samples[index]
      }

      const rms = Math.sqrt(
        sum / samples.length,
      )
      const now =
        performance.now()
      const elapsed =
        now -
        turnStartedAtRef.current

      if (
        !turnSpeechSeenRef.current &&
        elapsed < 700 &&
        rms < 0.02
      ) {
        noiseFloor =
          noiseFloor * 0.85 +
          rms * 0.15
      }

      const threshold =
        Math.max(
          0.007,
          Math.min(
            0.03,
            noiseFloor * 2.4 +
              0.0025,
          ),
        )

      if (rms >= threshold) {
        speechFrames += 1

        if (speechFrames >= 2) {
          turnSpeechSeenRef.current =
            true
          turnLastSpeechAtRef.current =
            now
          setVoiceStatus(
            'Listening — speak naturally',
          )
        }
      } else {
        speechFrames = 0

        if (
          turnSpeechSeenRef.current &&
          now -
            turnLastSpeechAtRef.current >=
            950
        ) {
          setVoiceStatus(
            'Processing your voice…',
          )
          recorder.stop()
          return
        }
      }

      if (
        !turnSpeechSeenRef.current &&
        elapsed >= 12_000
      ) {
        recorder.stop()
        return
      }

      if (
        turnSpeechSeenRef.current &&
        elapsed >= 20_000
      ) {
        recorder.stop()
        return
      }

      turnFrameRef.current =
        window.requestAnimationFrame(
          monitor,
        )
    }

    setVoiceStatus(
      'Listening — speak naturally',
    )

    recorder.start(250)
    void context.resume()

    turnFrameRef.current =
      window.requestAnimationFrame(
        monitor,
      )
  }

  function clearPreflightTimeout() {
    if (
      preflightTimeoutRef.current !== null
    ) {
      window.clearTimeout(
        preflightTimeoutRef.current,
      )
      preflightTimeoutRef.current = null
    }
  }

  function stopQueuedPlayback() {
    for (
      const source of playbackSourcesRef.current
    ) {
      try {
        source.stop()
      } catch {
        // Source may already have ended.
      }
    }

    playbackSourcesRef.current.clear()
    nextPlaybackTimeRef.current =
      outputContextRef.current
        ?.currentTime || 0
  }

  function clearSetupTimeout() {
    if (
      setupTimeoutRef.current !== null
    ) {
      window.clearTimeout(
        setupTimeoutRef.current,
      )
      setupTimeoutRef.current = null
    }
  }

  async function startVoiceChat() {
    if (voiceMode) {
      await stopVoiceChat(true)
      return
    }

    if (
      !navigator.mediaDevices
        ?.getUserMedia
    ) {
      toast.error(
        'Microphone access is unavailable in this browser.',
      )
      return
    }

    stoppingVoiceRef.current = false
    liveReadyRef.current = false
    voiceModeRef.current = true
    voiceTransportRef.current = null
    setVoiceTransport(null)
    preflightRef.current = false
    preflightAudioRef.current = false
    clearPreflightTimeout()
    setVoiceError(null)
    inputTranscriptRef.current = ''
    outputTranscriptRef.current = ''
    nextPlaybackTimeRef.current = 0
    setVoiceMode(true)
    setOpen(true)
    setVoiceStatus(
      'Requesting microphone permission…',
    )
    setProviderLabel(
      'Connecting Gemini Live…',
    )

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            },
            video: false,
          },
        )

      mediaStreamRef.current =
        stream

      setVoiceStatus(
        'Getting secure Gemini Live access…',
      )

      const token =
        await apiFetch<LiveTokenResponse>(
          '/api/assistant/live-token',
          {
            method: 'POST',
            body: JSON.stringify({
              activeView,
              activeViewLabel,
            }),
          },
        )

      if (
        token.mode === 'turn'
      ) {
        voiceTransportRef.current =
          'turn'
        setVoiceTransport('turn')
        turnModelRef.current =
          token.model

        setProviderLabel(
          `Gemini Voice · ${token.model}`,
        )
        setVoiceStatus(
          'Listening — speak naturally',
        )

        startCompatibleVoiceTurn(
          stream,
        )
        return
      }

      if (!token.token) {
        throw new Error(
          'Gemini Live did not return a session token.',
        )
      }

      voiceTransportRef.current =
        'live'
      setVoiceTransport('live')

      const outputContext =
        new AudioContext({
          sampleRate: 24_000,
          latencyHint: 'interactive',
        })
      outputContextRef.current =
        outputContext
      await outputContext.resume()

      setVoiceStatus(
        'Opening secure Gemini Live connection…',
      )

      const socket = new WebSocket(
        'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=' +
          encodeURIComponent(
            token.token,
          ),
      )

      socketRef.current = socket

      clearSetupTimeout()
      setupTimeoutRef.current =
        window.setTimeout(() => {
          if (
            liveReadyRef.current ||
            stoppingVoiceRef.current
          ) {
            return
          }

          const message =
            'Gemini Live did not complete the WebSocket setup within 12 seconds.'

          setVoiceError(message)
          setVoiceStatus(
            'Voice Chat connection failed',
          )

          try {
            socket.close(
              4000,
              'setup timeout',
            )
          } catch {
            // Socket may already be closed.
          }

          void stopVoiceChat(false)

          toast.error(
            'Gemini Live setup timed out',
            {
              description: message,
            },
          )
        }, 12_000)

      socket.onopen = () => {
        setVoiceStatus(
          'Configuring Gemini Live…',
        )

        // Keep the first setup message intentionally minimal and
        // aligned with Google's raw-WebSocket Live API example. Optional
        // transcription/VAD fields are omitted here so provider setup is
        // validated before microphone streaming begins.
        socket.send(
          JSON.stringify({
            setup: {
              model:
                'models/' +
                token.model,
              responseModalities: [
                'AUDIO',
              ],
              systemInstruction: {
                parts: [
                  {
                    text:
                      token.systemInstruction ||
                        'You are the CRMS voice assistant.',
                  },
                ],
              },
            },
          }),
        )
      }

      socket.onmessage = (
        event,
      ) => {
        let payload: any

        try {
          payload = JSON.parse(
            event.data,
          )
        } catch {
          return
        }

        if (
          payload.setupComplete
        ) {
          clearSetupTimeout()
          liveReadyRef.current =
            true
          preflightRef.current =
            true
          preflightAudioRef.current =
            false

          setProviderLabel(
            'Gemini Live · ' +
              token.model,
          )
          setVoiceStatus(
            'Testing Live audio response…',
          )

          // Verify the provider can actually generate an audio turn before
          // enabling the microphone. This prevents the UI from claiming
          // "Listening" when only the socket handshake succeeded.
          socket.send(
            JSON.stringify({
              realtimeInput: {
                text:
                  'CRMS connectivity test. Reply only with: Voice ready.',
              },
            }),
          )

          clearPreflightTimeout()
          preflightTimeoutRef.current =
            window.setTimeout(() => {
              if (
                !preflightRef.current ||
                stoppingVoiceRef.current
              ) {
                return
              }

              const message =
                'Gemini Live connected, but no audio response arrived during the provider self-test.'

              setVoiceError(message)
              setVoiceStatus(
                'Voice Chat self-test failed',
              )
              void stopVoiceChat(false)

              toast.error(
                'Gemini Live self-test failed',
                {
                  description:
                    message,
                },
              )
            }, 12_000)

          return
        }

        if (payload.error) {
          clearSetupTimeout()
          clearPreflightTimeout()
          console.error(
            'Gemini Live server error:',
            payload.error,
          )

          const message =
            String(
              payload.error?.message ||
                payload.error,
            )

          setVoiceError(message)
          setVoiceStatus(
            'Gemini Live rejected the session',
          )
          void stopVoiceChat(false)

          toast.error(
            'Gemini Live rejected the session',
            {
              description: message,
            },
          )
          return
        }

        const serverContent =
          payload.serverContent

        if (!serverContent) return

        if (
          serverContent
            .inputTranscription?.text
        ) {
          inputTranscriptRef.current =
            appendTranscript(
              inputTranscriptRef.current,
              String(
                serverContent
                  .inputTranscription
                  .text,
              ),
            )
          setVoiceStatus(
            'Heard: ' +
              inputTranscriptRef.current,
          )
        }

        if (
          serverContent
            .outputTranscription?.text
        ) {
          outputTranscriptRef.current =
            appendTranscript(
              outputTranscriptRef.current,
              String(
                serverContent
                  .outputTranscription
                  .text,
              ),
            )
          setVoiceStatus(
            'CRMS Assistant is responding…',
          )
        }

        const parts =
          serverContent.modelTurn
            ?.parts

        if (Array.isArray(parts)) {
          for (const part of parts) {
            const inline =
              part?.inlineData

            if (
              inline?.data &&
              String(
                inline.mimeType ||
                  '',
              ).startsWith(
                'audio/',
              )
            ) {
              if (
                preflightRef.current
              ) {
                preflightAudioRef.current =
                  true
              }

              playLiveAudio(
                inline.data,
                String(
                  inline.mimeType ||
                    'audio/pcm;rate=24000',
                ),
              )
            }
          }
        }

        if (
          serverContent.interrupted
        ) {
          stopQueuedPlayback()

          if (
            !preflightRef.current
          ) {
            setVoiceStatus(
              'Listening — speak naturally',
            )
          }
        }

        if (
          serverContent.turnComplete
        ) {
          if (
            preflightRef.current
          ) {
            clearPreflightTimeout()

            if (
              !preflightAudioRef.current
            ) {
              const message =
                'Gemini Live completed the self-test turn without returning playable audio.'

              setVoiceError(message)
              setVoiceStatus(
                'Voice Chat self-test failed',
              )
              void stopVoiceChat(false)
              return
            }

            preflightRef.current =
              false
            inputTranscriptRef.current =
              ''
            outputTranscriptRef.current =
              ''

            setVoiceStatus(
              'Listening — speak naturally',
            )

            startMicrophoneStreaming(
              stream,
            )
            return
          }

          finishLiveTurn()
        }
      }

      socket.onerror = () => {
        if (
          stoppingVoiceRef.current
        ) {
          return
        }

        clearSetupTimeout()
        clearPreflightTimeout()

        const message =
          'The browser could not establish the secure Gemini Live WebSocket.'

        setVoiceError(message)
        setVoiceStatus(
          'Gemini Live connection error',
        )

        toast.error(
          'Gemini Live connection error',
          {
            description: message,
          },
        )
      }

      socket.onclose = (
        event,
      ) => {
        clearSetupTimeout()

        if (
          stoppingVoiceRef.current
        ) {
          return
        }

        const wasReady =
          liveReadyRef.current
        const reason =
          event.reason?.trim()
        const detail =
          reason ||
          `WebSocket closed with code ${event.code}.`

        setVoiceError(
          (current) =>
            current || detail,
        )
        setVoiceStatus(
          wasReady
            ? 'Voice Chat disconnected'
            : 'Gemini Live could not start',
        )

        void stopVoiceChat(
          false,
        )

        toast.error(
          wasReady
            ? 'Voice Chat disconnected'
            : 'Gemini Live could not start',
          {
            description: detail,
          },
        )
      }
    } catch (error: any) {
      const denied =
        error?.name ===
          'NotAllowedError' ||
        error?.name ===
          'PermissionDeniedError'
      const message = denied
        ? 'Microphone permission was denied. Allow microphone access for localhost/CRMS and try again.'
        : error?.message ||
          'Voice Chat could not start.'

      setVoiceError(message)
      setVoiceStatus(
        denied
          ? 'Microphone permission denied'
          : 'Voice Chat could not start',
      )

      await stopVoiceChat(false)

      toast.error(
        denied
          ? 'Microphone permission denied'
          : 'Voice Chat could not start',
        {
          description: message,
        },
      )
    }
  }

  async function stopVoiceChat(
    userInitiated: boolean,
  ) {
    stoppingVoiceRef.current = true
    clearSetupTimeout()
    closeCompatibleInputGraph()
    clearSpeechWatchdog()

    window.speechSynthesis?.cancel()

    const recorder =
      turnRecorderRef.current
    turnRecorderRef.current = null

    if (
      recorder &&
      recorder.state !== 'inactive'
    ) {
      recorder.onstop = null
      try {
        recorder.stop()
      } catch {
        // Recorder may already be stopped.
      }
    }

    turnChunksRef.current = []

    clearPreflightTimeout()
    preflightRef.current = false
    preflightAudioRef.current = false
    voiceModeRef.current = false
    voiceTransportRef.current = null
    setVoiceTransport(null)
    stopQueuedPlayback()

    const socket =
      socketRef.current
    socketRef.current = null

    if (
      socket?.readyState ===
        WebSocket.OPEN &&
      liveReadyRef.current
    ) {
      try {
        socket.send(
          JSON.stringify({
            realtimeInput: {
              audioStreamEnd: true,
            },
          }),
        )
      } catch {
        // Ignore a stream already ending.
      }
    }

    if (
      socket &&
      (socket.readyState ===
        WebSocket.OPEN ||
        socket.readyState ===
          WebSocket.CONNECTING)
    ) {
      try {
        socket.close(
          1000,
          'CRMS voice chat ended',
        )
      } catch {
        // Ignore a socket already closing.
      }
    }

    liveReadyRef.current = false

    inputProcessorRef.current?.disconnect()
    inputSourceRef.current?.disconnect()
    silentGainRef.current?.disconnect()

    inputProcessorRef.current = null
    inputSourceRef.current = null
    silentGainRef.current = null

    mediaStreamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop(),
      )
    mediaStreamRef.current = null

    const inputContext =
      inputContextRef.current
    inputContextRef.current = null

    if (inputContext) {
      await inputContext
        .close()
        .catch(() => undefined)
    }

    const outputContext =
      outputContextRef.current
    outputContextRef.current = null

    if (outputContext) {
      await outputContext
        .close()
        .catch(() => undefined)
    }

    setVoiceMode(false)
    setVoiceStatus(
      'Voice Chat ready',
    )

    if (userInitiated) {
      setProviderLabel(
        'Gemini Live ended',
      )
    }

    window.setTimeout(() => {
      stoppingVoiceRef.current =
        false
    }, 50)
  }

  async function newChat() {
    await stopVoiceChat(false)
    messagesRef.current = []
    setMessages([])
    setInput('')
    setProviderLabel(
      'AI connection not verified',
    )
    setVoiceError(null)
    toast.success(
      'New CRMS chat started',
    )
  }

  function onLauncherPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect()

    dragRef.current = {
      pointerId: event.pointerId,
      grabX:
        event.clientX - rect.left,
      grabY:
        event.clientY - rect.top,
      x: rect.left,
      y: rect.top,
      moved: false,
    }

    const move = (
      moveEvent: PointerEvent,
    ) => {
      const drag =
        dragRef.current

      if (
        !drag ||
        moveEvent.pointerId !==
          drag.pointerId
      ) {
        return
      }

      moveEvent.preventDefault()

      const next =
        clampLauncher({
          x:
            moveEvent.clientX -
            drag.grabX,
          y:
            moveEvent.clientY -
            drag.grabY,
        })

      if (
        Math.abs(
          next.x - drag.x,
        ) > 3 ||
        Math.abs(
          next.y - drag.y,
        ) > 3
      ) {
        drag.moved = true
      }

      drag.x = next.x
      drag.y = next.y
      setLauncherPosition(next)
    }

    const up = (
      upEvent: PointerEvent,
    ) => {
      const drag =
        dragRef.current

      if (
        !drag ||
        upEvent.pointerId !==
          drag.pointerId
      ) {
        return
      }

      window.removeEventListener(
        'pointermove',
        move,
      )
      window.removeEventListener(
        'pointerup',
        up,
      )
      window.removeEventListener(
        'pointercancel',
        up,
      )

      dragRef.current = null

      if (drag.moved) {
        persistLauncher({
          x: drag.x,
          y: drag.y,
        })
      } else {
        setOpen(true)
      }
    }

    window.addEventListener(
      'pointermove',
      move,
      { passive: false },
    )
    window.addEventListener(
      'pointerup',
      up,
    )
    window.addEventListener(
      'pointercancel',
      up,
    )
  }

  const launcher = (
    <button
      type="button"
      onPointerDown={
        onLauncherPointerDown
      }
      onKeyDown={(event) => {
        if (
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          event.preventDefault()
          setOpen(true)
        }
      }}
      aria-label="CRMS Assistant. Drag anywhere on the visible screen or click to open."
      title="CRMS Assistant — drag anywhere on the visible screen"
      className="fixed z-[2147483000] grid h-[54px] w-[54px] touch-none select-none place-items-center rounded-full bg-emerald-700 text-white shadow-2xl ring-4 ring-emerald-200/80 hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
      style={
        launcherPosition
          ? {
              left:
                launcherPosition.x,
              top:
                launcherPosition.y,
            }
          : {
              right: 12,
              bottom: 88,
            }
      }
    >
      <Bot className="h-6 w-6" />
    </button>
  )

  return (
    <>
      {portalReady && !open
        ? createPortal(
            launcher,
            document.body,
          )
        : null}

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next && voiceMode) {
            void stopVoiceChat(
              true,
            )
          }

          setOpen(next)
        }}
      >
        <SheetContent
          side="right"
          className="w-[94vw] gap-0 p-0 sm:max-w-md"
          onInteractOutside={(
            event,
          ) => {
            if (voiceMode) {
              event.preventDefault()
            }
          }}
        >
          <SheetHeader className="border-b bg-emerald-50/70 pr-12">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <SheetTitle>
                    CRMS Assistant
                  </SheetTitle>
                  <SheetDescription>
                    CRMS-only help with live database context.
                  </SheetDescription>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  void newChat()
                }
                className="shrink-0 gap-1.5 px-2 text-xs"
              >
                <MessageSquarePlus className="h-4 w-4" />
                New chat
              </Button>
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
                <p className="font-semibold">
                  Hello
                  {userName
                    ? `, ${userName}`
                    : ''}
                  .
                </p>
                <p className="mt-1">
                  I only handle CRMS and use role-appropriate current system data.
                </p>
                <p className="mt-2 text-xs text-emerald-800">
                  Current page:{' '}
                  {activeViewLabel}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <span className="font-medium text-slate-700">
                  {providerLabel}
                </span>
                <span className="text-slate-500">
                  CRMS data access
                </span>
              </div>

              {voiceError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  <p className="font-semibold">
                    Voice Chat diagnostic
                  </p>
                  <p className="mt-1 break-words text-xs leading-5">
                    {voiceError}
                  </p>
                </div>
              ) : null}

              {voiceMode ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-700 text-white">
                      <AudioLines className="h-5 w-5" />
                      <span className="absolute inset-0 animate-ping rounded-full border border-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">
                        {voiceTransport === 'live'
                          ? 'Gemini Live Voice'
                          : 'CRMS Voice Chat'}
                      </p>
                      <p className="text-xs text-emerald-800">
                        {voiceStatus}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {messages.map(
                (message, index) => (
                  <div
                    key={
                      message.role +
                      '-' +
                      index
                    }
                    className={
                      message.role ===
                      'user'
                        ? 'ml-8 rounded-2xl bg-slate-900 px-4 py-3 text-sm leading-6 text-white'
                        : 'mr-8 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800'
                    }
                  >
                    {
                      message.content
                    }
                  </div>
                ),
              )}

              {sending ? (
                <div className="mr-8 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking CRMS…
                </div>
              ) : null}
            </div>

            <div className="border-t bg-white p-3">
              <Button
                type="button"
                onClick={() =>
                  void startVoiceChat()
                }
                variant={
                  voiceMode
                    ? 'destructive'
                    : 'outline'
                }
                className="mb-2 w-full gap-2"
              >
                {voiceMode ? (
                  <>
                    <PhoneOff className="h-4 w-4" />
                    End Voice Chat
                  </>
                ) : (
                  <>
                    <AudioLines className="h-4 w-4" />
                    Voice Chat
                  </>
                )}
              </Button>

              <div className="flex items-end gap-2">
                <Input
                  value={input}
                  onChange={(event) =>
                    setInput(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        'Enter' &&
                      !event.shiftKey
                    ) {
                      event.preventDefault()
                      void sendTypedMessage()
                    }
                  }}
                  placeholder={
                    voiceMode
                      ? voiceStatus
                      : 'Ask about CRMS…'
                  }
                  maxLength={2000}
                  disabled={voiceMode}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() =>
                    void sendTypedMessage()
                  }
                  disabled={
                    !input.trim() ||
                    sending ||
                    voiceMode
                  }
                  aria-label="Send CRMS question"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <p className="mt-2 text-[0.6875rem] leading-4 text-muted-foreground">
                One button controls Voice Chat. CRMS uses Gemini Live when your project supports it; otherwise it automatically uses Gemini audio understanding for each spoken turn and reads the answer aloud.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
