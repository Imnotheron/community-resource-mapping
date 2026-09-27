'use client'

import {
  useEffect,
  useMemo,
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

type RecognitionResultEvent = {
  resultIndex?: number
  results: ArrayLike<{
    0: { transcript: string }
    isFinal?: boolean
    length?: number
  }>
}

type SpeechRecognitionConstructor = new () => {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onresult:
    | ((event: RecognitionResultEvent) => void)
    | null
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

const POSITION_KEY =
  'crms-assistant-launcher-position-v3'
const LAUNCHER_SIZE = 54
const LAUNCHER_VISIBLE_EDGE = 18
const SILENCE_TIMEOUT_MS = 12_000
const VOICE_PAUSE_SUBMIT_MS = 1_250
const VOICE_TURN_MAX_MS = 8_000

function greeting(role: string) {
  const normalized =
    String(role || '').toUpperCase()

  if (normalized === 'ADMIN') {
    return 'I only handle CRMS. Ask what is currently recorded, what is pending, what this page does, or what you should do next.'
  }

  if (normalized === 'WORKER') {
    return 'I only handle CRMS. Ask about your relief records, registrations, Activity History, field notes, reports, or your next CRMS step.'
  }

  return 'I only handle CRMS. Ask about your profile, relief history, announcements, feedback, or what you should do next.'
}

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
  const minY = offsetTop
  const maxY =
    offsetTop +
    height -
    LAUNCHER_SIZE

  return {
    x: Math.min(
      Math.max(minX, position.x),
      Math.max(minX, maxX),
    ),
    y: Math.min(
      Math.max(minY, position.y),
      Math.max(minY, maxY),
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
      Math.max(
        12,
        height -
          LAUNCHER_SIZE -
          92,
      ),
  })
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
  const [listening, setListening] =
    useState(false)
  const [voiceMode, setVoiceMode] =
    useState(false)
  const [voiceStatus, setVoiceStatus] =
    useState('Voice chat ready')
  const [providerLabel, setProviderLabel] =
    useState('AI connection not verified')
  const [
    launcherPosition,
    setLauncherPosition,
  ] = useState<{
    x: number
    y: number
  } | null>(null)
  const [portalReady, setPortalReady] =
    useState(false)
  const [dragging, setDragging] =
    useState(false)

  const messagesRef =
    useRef<Message[]>([])
  const sendingRef = useRef(false)
  const voiceModeRef = useRef(false)
  const speakingRef = useRef(false)
  const recognitionRef =
    useRef<InstanceType<SpeechRecognitionConstructor> | null>(
      null,
    )
  const silenceTimerRef =
    useRef<number | null>(null)
  const voiceSubmitTimerRef =
    useRef<number | null>(null)
  const voiceMaxTimerRef =
    useRef<number | null>(null)
  const voiceTranscriptRef =
    useRef('')
  const voiceTurnSubmittedRef =
    useRef(false)
  const dragRef = useRef<{
    pointerId: number
    grabX: number
    grabY: number
    lastX: number
    lastY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    voiceModeRef.current = voiceMode
  }, [voiceMode])

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

    const onResize = () => {
      setLauncherPosition((current) =>
        clampLauncher(
          current ||
            defaultLauncherPosition(),
        ),
      )
    }

    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener(
      'resize',
      onResize,
    )
    window.visualViewport?.addEventListener(
      'scroll',
      onResize,
    )

    return () => {
      window.removeEventListener(
        'resize',
        onResize,
      )
      window.visualViewport?.removeEventListener(
        'resize',
        onResize,
      )
      window.visualViewport?.removeEventListener(
        'scroll',
        onResize,
      )
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()

      if (
        silenceTimerRef.current !== null
      ) {
        window.clearTimeout(
          silenceTimerRef.current,
        )
      }

      if (
        voiceSubmitTimerRef.current !== null
      ) {
        window.clearTimeout(
          voiceSubmitTimerRef.current,
        )
      }

      if (
        voiceMaxTimerRef.current !== null
      ) {
        window.clearTimeout(
          voiceMaxTimerRef.current,
        )
      }
    }
  }, [])

  const voiceInputSupported =
    useMemo(() => {
      if (
        typeof window === 'undefined'
      ) {
        return false
      }

      return Boolean(
        window.SpeechRecognition ||
          window.webkitSpeechRecognition,
      )
    }, [])

  function saveLauncherPosition(
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
      // Ignore storage failures.
    }
  }

  function clearSilenceTimer() {
    if (
      silenceTimerRef.current !== null
    ) {
      window.clearTimeout(
        silenceTimerRef.current,
      )
      silenceTimerRef.current = null
    }
  }

  function clearVoiceSubmitTimer() {
    if (
      voiceSubmitTimerRef.current !== null
    ) {
      window.clearTimeout(
        voiceSubmitTimerRef.current,
      )
      voiceSubmitTimerRef.current = null
    }
  }

  function clearVoiceMaxTimer() {
    if (
      voiceMaxTimerRef.current !== null
    ) {
      window.clearTimeout(
        voiceMaxTimerRef.current,
      )
      voiceMaxTimerRef.current = null
    }
  }

  function startNewChat() {
    stopVoiceMode()
    clearVoiceSubmitTimer()
    messagesRef.current = []
    setMessages([])
    setInput('')
    setProviderLabel(
      'AI connection not verified',
    )
    setVoiceStatus('Voice chat ready')
    toast.success('New CRMS chat started')
  }

  function stopRecognition() {
    clearSilenceTimer()
    clearVoiceSubmitTimer()
    clearVoiceMaxTimer()

    const recognition =
      recognitionRef.current
    recognitionRef.current = null

    if (recognition) {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null

      try {
        recognition.abort()
      } catch {
        // It may already be stopped.
      }
    }

    setListening(false)
  }

  function stopVoiceMode(
    status = 'Voice chat ready',
  ) {
    voiceModeRef.current = false
    setVoiceMode(false)
    setVoiceStatus(status)
    stopRecognition()

    if (
      typeof window !== 'undefined'
    ) {
      window.speechSynthesis?.cancel()
    }

    speakingRef.current = false
  }

  function speakVoiceReply(text: string) {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      stopVoiceMode(
        'Spoken replies are unavailable in this browser.',
      )
      toast.info(
        'Spoken replies are unavailable',
      )
      return
    }

    window.speechSynthesis.cancel()

    const utterance =
      new SpeechSynthesisUtterance(text)

    utterance.lang = 'en-PH'
    utterance.rate = 1
    speakingRef.current = true
    setVoiceStatus(
      'CRMS Assistant is speaking…',
    )

    utterance.onend = () => {
      speakingRef.current = false

      if (voiceModeRef.current) {
        window.setTimeout(
          () => beginVoiceTurn(),
          350,
        )
      }
    }

    utterance.onerror = () => {
      speakingRef.current = false
      stopVoiceMode(
        'Voice playback failed. Tap Voice Chat to try again.',
      )
    }

    window.speechSynthesis.speak(
      utterance,
    )
  }

  async function submitMessage(
    rawContent: string,
    fromVoice: boolean,
  ) {
    const content = rawContent.trim()

    if (
      !content ||
      sendingRef.current
    ) {
      return
    }

    const nextMessages: Message[] = [
      ...messagesRef.current,
      { role: 'user', content },
    ].slice(-14)

    messagesRef.current = nextMessages
    setMessages(nextMessages)
    setInput('')
    sendingRef.current = true
    setSending(true)

    if (fromVoice) {
      setVoiceStatus(
        'Checking CRMS…',
      )
    }

    try {
      const data = await apiFetch<{
        reply: string
        provider?: string
        model?: string
      }>('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: content,
          history:
            nextMessages.slice(0, -1),
          activeView,
          activeViewLabel,
        }),
      })

      const reply =
        String(
          data.reply || '',
        ).trim() ||
        'The assistant returned an empty response.'

      setProviderLabel(
        data.provider === 'gemini'
          ? `Gemini · ${data.model || 'connected model'}`
          : 'AI connected',
      )

      const withReply: Message[] = [
        ...nextMessages,
        {
          role: 'assistant',
          content: reply,
        },
      ]

      messagesRef.current = withReply
      setMessages(withReply)

      if (
        fromVoice &&
        voiceModeRef.current
      ) {
        speakVoiceReply(reply)
      }
    } catch (error: any) {
      setProviderLabel(
        'AI offline / not configured',
      )

      const errorMessage =
        error?.message ||
        'The CRMS AI connection is unavailable.'

      const failure: Message = {
        role: 'assistant',
        content:
          'The CRMS AI connection is unavailable right now. Check the Gemini configuration and try again.',
      }

      const withFailure = [
        ...nextMessages,
        failure,
      ]

      messagesRef.current = withFailure
      setMessages(withFailure)

      toast.error(
        'CRMS Assistant unavailable',
        {
          description: errorMessage,
        },
      )

      if (fromVoice) {
        stopVoiceMode(
          'AI unavailable. Tap Voice Chat after the connection is fixed.',
        )
      }
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  function submitVoiceTranscript() {
    const transcript =
      voiceTranscriptRef.current
        .trim()

    if (
      !transcript ||
      voiceTurnSubmittedRef.current
    ) {
      return
    }

    voiceTurnSubmittedRef.current = true
    clearSilenceTimer()
    clearVoiceSubmitTimer()
    clearVoiceMaxTimer()

    try {
      recognitionRef.current?.stop()
    } catch {
      // Recognition may already be ending.
    }

    setListening(false)
    setInput(transcript)
    void submitMessage(
      transcript,
      true,
    )
  }

  function beginVoiceTurn() {
    if (
      !voiceModeRef.current ||
      sendingRef.current ||
      speakingRef.current
    ) {
      return
    }

    if (!voiceInputSupported) {
      stopVoiceMode(
        'Voice recognition is not supported in this browser.',
      )
      toast.info(
        'Voice chat is unavailable',
        {
          description:
            'Use a Chromium-based browser and allow microphone access.',
        },
      )
      return
    }

    stopRecognition()

    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    if (!Recognition) return

    const recognition =
      new Recognition()

    recognition.lang = 'en-PH'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1

    voiceTranscriptRef.current = ''
    voiceTurnSubmittedRef.current =
      false

    recognition.onstart = () => {
      setOpen(true)
      setListening(true)
      setVoiceStatus(
        'Listening — speak now…',
      )

      clearSilenceTimer()
      clearVoiceMaxTimer()

      silenceTimerRef.current =
        window.setTimeout(() => {
          if (
            voiceModeRef.current &&
            !voiceTranscriptRef.current.trim()
          ) {
            stopVoiceMode(
              'No speech detected. Tap Voice Chat to try again.',
            )
            toast.info(
              'No speech detected',
            )
          }
        }, SILENCE_TIMEOUT_MS)

      voiceMaxTimerRef.current =
        window.setTimeout(() => {
          if (
            !voiceModeRef.current ||
            voiceTurnSubmittedRef.current
          ) {
            return
          }

          if (
            voiceTranscriptRef.current.trim()
          ) {
            submitVoiceTranscript()
            return
          }

          stopVoiceMode(
            'No speech detected. Tap Voice Chat to try again.',
          )
        }, VOICE_TURN_MAX_MS)
    }

    recognition.onresult = (
      event,
    ) => {
      let transcript = ''
      let hasFinalResult = false

      for (
        let index = 0;
        index < event.results.length;
        index += 1
      ) {
        const result =
          event.results[index]
        const part =
          result?.[0]?.transcript ||
          ''

        transcript +=
          (transcript ? ' ' : '') +
          part.trim()

        if (result?.isFinal) {
          hasFinalResult = true
        }
      }

      transcript =
        transcript.trim()

      if (!transcript) return

      voiceTranscriptRef.current =
        transcript
      setInput(transcript)
      setVoiceStatus(
        `Heard: "${transcript}"`,
      )

      clearVoiceSubmitTimer()

      if (hasFinalResult) {
        submitVoiceTranscript()
        return
      }

      // Some Chromium/Web Speech implementations keep returning interim
      // text without marking a final result. Submit after a short pause so
      // Voice Chat never listens forever after the user has already spoken.
      voiceSubmitTimerRef.current =
        window.setTimeout(() => {
          if (
            voiceModeRef.current &&
            voiceTranscriptRef.current.trim() &&
            !voiceTurnSubmittedRef.current
          ) {
            submitVoiceTranscript()
          }
        }, VOICE_PAUSE_SUBMIT_MS)
    }

    recognition.onerror = (
      event,
    ) => {
      const reason =
        event.error || 'unknown'

      if (
        reason === 'aborted' &&
        voiceTurnSubmittedRef.current
      ) {
        return
      }

      stopVoiceMode(
        reason === 'not-allowed' ||
          reason === 'service-not-allowed'
          ? 'Microphone permission was denied.'
          : reason === 'no-speech'
            ? 'No speech detected. Tap Voice Chat to try again.'
            : 'Voice recognition stopped. Tap Voice Chat to try again.',
      )

      if (
        reason !== 'aborted'
      ) {
        toast.error(
          'Voice chat stopped',
          {
            description: reason,
          },
        )
      }
    }

    recognition.onend = () => {
      setListening(false)
      clearSilenceTimer()

      if (
        !voiceModeRef.current ||
        sendingRef.current ||
        speakingRef.current ||
        voiceTurnSubmittedRef.current
      ) {
        return
      }

      if (
        voiceTranscriptRef.current.trim()
      ) {
        submitVoiceTranscript()
        return
      }

      stopVoiceMode(
        'No speech detected. Tap Voice Chat to try again.',
      )
    }

    recognitionRef.current =
      recognition

    try {
      recognition.start()
    } catch (error) {
      stopVoiceMode(
        'Voice chat could not start. Tap Voice Chat to try again.',
      )
      toast.error(
        'Voice chat could not start',
      )
    }
  }

  function toggleVoiceChat() {
    if (voiceModeRef.current) {
      stopVoiceMode()
      return
    }

    if (!voiceInputSupported) {
      toast.info(
        'Voice chat is unavailable',
        {
          description:
            'Use Chrome or another Chromium-based browser and allow microphone access.',
        },
      )
      return
    }

    voiceModeRef.current = true
    setVoiceMode(true)
    setOpen(true)
    setVoiceStatus(
      'Starting microphone…',
    )

    window.setTimeout(
      () => beginVoiceTurn(),
      150,
    )
  }

  function onLauncherPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect()

    dragRef.current = {
      pointerId: event.pointerId,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      lastX: rect.left,
      lastY: rect.top,
      moved: false,
    }

    setDragging(true)

    const onMove = (
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
          next.x - drag.lastX,
        ) > 3 ||
        Math.abs(
          next.y - drag.lastY,
        ) > 3
      ) {
        drag.moved = true
      }

      drag.lastX = next.x
      drag.lastY = next.y
      setLauncherPosition(next)
    }

    const onUp = (
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
        onMove,
      )
      window.removeEventListener(
        'pointerup',
        onUp,
      )
      window.removeEventListener(
        'pointercancel',
        onUp,
      )

      dragRef.current = null
      setDragging(false)

      if (drag.moved) {
        saveLauncherPosition({
          x: drag.lastX,
          y: drag.lastY,
        })
      } else {
        setOpen(true)
      }
    }

    window.addEventListener(
      'pointermove',
      onMove,
      { passive: false },
    )
    window.addEventListener(
      'pointerup',
      onUp,
    )
    window.addEventListener(
      'pointercancel',
      onUp,
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
      className="fixed z-[2147483000] grid h-[54px] w-[54px] touch-none select-none place-items-center rounded-full bg-emerald-700 text-white shadow-2xl ring-4 ring-emerald-200/80 transition-[box-shadow,background-color] hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
      style={
        launcherPosition
          ? {
              left:
                launcherPosition.x,
              top:
                launcherPosition.y,
              right: 'auto',
              bottom: 'auto',
            }
          : {
              right: 12,
              bottom: 88,
            }
      }
    >
      <Bot className="h-6 w-6" />
      <span className="sr-only">
        {dragging
          ? 'Moving CRMS Assistant'
          : 'Open CRMS Assistant'}
      </span>
    </button>
  )

  return (
    <>
      {portalReady
        ? createPortal(
            launcher,
            document.body,
          )
        : null}

      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            stopVoiceMode()
          }

          setOpen(nextOpen)
        }}
      >
        <SheetContent
          side="right"
          className="w-[94vw] gap-0 p-0 sm:max-w-md"
          onInteractOutside={(
            event,
          ) => {
            if (
              voiceModeRef.current
            ) {
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
                    CRMS-only help with live database lookup.
                  </SheetDescription>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={startNewChat}
                className="shrink-0 gap-1.5 px-2 text-xs"
                title="Start a new CRMS chat"
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
                  {greeting(
                    userRole,
                  )}
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
                  Live DB lookup
                </span>
              </div>

              {voiceMode ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-700 text-white">
                      <AudioLines className="h-5 w-5" />
                      {listening ? (
                        <span className="absolute inset-0 animate-ping rounded-full border border-emerald-500" />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-emerald-950">
                        Voice Chat
                      </p>
                      <p className="text-xs text-emerald-800">
                        {voiceStatus}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <p className="text-xs leading-5 text-muted-foreground">
                This assistant is limited to CRMS. For each question it can look up role-appropriate current records from the CRMS database, including users, registrations, relief history, announcements, feedback, resources, and other system data. Authentication secrets are never included.
              </p>

              {messages.map(
                (message, index) => (
                  <div
                    key={`${message.role}-${index}`}
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
                onClick={
                  toggleVoiceChat
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
                      event.target
                        .value,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                        'Enter' &&
                      !event.shiftKey
                    ) {
                      event.preventDefault()
                      void submitMessage(
                        input,
                        false,
                      )
                    }
                  }}
                  placeholder={
                    voiceMode
                      ? voiceStatus
                      : 'Ask about CRMS…'
                  }
                  maxLength={2000}
                  disabled={
                    voiceMode
                  }
                />

                <Button
                  type="button"
                  size="icon"
                  onClick={() =>
                    void submitMessage(
                      input,
                      false,
                    )
                  }
                  disabled={
                    !input.trim() ||
                    sending ||
                    voiceMode
                  }
                  aria-label="Send CRMS question"
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <p className="mt-2 text-[0.6875rem] leading-4 text-muted-foreground">
                {voiceInputSupported
                  ? 'One voice control only: tap Voice Chat, speak normally, then pause. CRMS submits after the pause (or by the 8-second turn limit), speaks the reply, and listens again. Silence stops the session instead of listening forever.'
                  : 'Voice recognition is unavailable in this browser. Typed CRMS chat still works.'}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
