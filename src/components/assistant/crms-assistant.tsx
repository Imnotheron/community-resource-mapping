'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AudioLines,
  Bot,
  GripVertical,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
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
  results: ArrayLike<{
    0: { transcript: string }
    isFinal?: boolean
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
  onresult: ((event: RecognitionResultEvent) => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

const POSITION_KEY = 'crms-assistant-launcher-position'
const LAUNCHER_SIZE = 52
const LAUNCHER_MARGIN = 12

function greeting(role: string) {
  const normalized = String(role || '').toUpperCase()

  if (normalized === 'ADMIN') {
    return 'I focus only on CRMS. I can explain the current system status, approvals, Operations History, reports, analytics, map status, users, announcements, and what to do next.'
  }

  if (normalized === 'WORKER') {
    return 'I focus only on CRMS. I can help with your relief records, citizen registration, Activity History, field notes, announcements, daily reports, and the next step in your workflow.'
  }

  return 'I focus only on CRMS. I can explain your profile, relief history, community updates, feedback, current system status available to you, and what to do next.'
}

function clampPosition(position: {
  x: number
  y: number
}) {
  if (typeof window === 'undefined') return position

  return {
    x: Math.min(
      Math.max(LAUNCHER_MARGIN, position.x),
      Math.max(
        LAUNCHER_MARGIN,
        window.innerWidth -
          LAUNCHER_SIZE -
          LAUNCHER_MARGIN,
      ),
    ),
    y: Math.min(
      Math.max(LAUNCHER_MARGIN, position.y),
      Math.max(
        LAUNCHER_MARGIN,
        window.innerHeight -
          LAUNCHER_SIZE -
          LAUNCHER_MARGIN,
      ),
    ),
  }
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
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [voiceStatus, setVoiceStatus] =
    useState('Voice chat ready')
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [providerLabel, setProviderLabel] = useState(
    'AI connection not verified',
  )
  const [launcherPosition, setLauncherPosition] =
    useState<{ x: number; y: number } | null>(null)

  const recognitionRef =
    useRef<InstanceType<SpeechRecognitionConstructor> | null>(
      null,
    )
  const messagesRef = useRef<Message[]>([])
  const sendingRef = useRef(false)
  const speakingRef = useRef(false)
  const voiceModeRef = useRef(false)
  const stopVoiceRequestedRef = useRef(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const draggedRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    voiceModeRef.current = voiceMode
  }, [voiceMode])

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(POSITION_KEY)

      if (saved) {
        const parsed = JSON.parse(saved)
        if (
          Number.isFinite(parsed?.x) &&
          Number.isFinite(parsed?.y)
        ) {
          setLauncherPosition(
            clampPosition({
              x: Number(parsed.x),
              y: Number(parsed.y),
            }),
          )
        }
      }
    } catch {
      // Keep the default corner position.
    }

    const handleResize = () => {
      setLauncherPosition((current) =>
        current ? clampPosition(current) : current,
      )
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener(
        'resize',
        handleResize,
      )
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
    }
  }, [])

  const voiceInputSupported = useMemo(() => {
    if (typeof window === 'undefined') return false

    return Boolean(
      window.SpeechRecognition ||
        window.webkitSpeechRecognition,
    )
  }, [open])

  function saveLauncherPosition(position: {
    x: number
    y: number
  }) {
    const safe = clampPosition(position)
    setLauncherPosition(safe)

    try {
      window.localStorage.setItem(
        POSITION_KEY,
        JSON.stringify(safe),
      )
    } catch {
      // Position persistence is a convenience only.
    }
  }

  function stopRecognition() {
    try {
      recognitionRef.current?.abort()
    } catch {
      // Browser recognition may already be stopped.
    }

    recognitionRef.current = null
    setListening(false)
  }

  function stopVoiceMode() {
    stopVoiceRequestedRef.current = true
    voiceModeRef.current = false
    setVoiceMode(false)
    setVoiceStatus('Voice chat ready')
    stopRecognition()

    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel()
    }

    speakingRef.current = false
  }

  function speak(
    text: string,
    resumeVoice = false,
  ) {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      (!speechEnabled && !resumeVoice)
    ) {
      if (
        resumeVoice &&
        voiceModeRef.current &&
        !stopVoiceRequestedRef.current
      ) {
        window.setTimeout(
          () => startRecognition(true),
          250,
        )
      }
      return
    }

    window.speechSynthesis.cancel()

    const utterance =
      new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-PH'
    utterance.rate = 1

    speakingRef.current = true
    setVoiceStatus('CRMS Assistant is speaking…')

    utterance.onend = () => {
      speakingRef.current = false

      if (
        resumeVoice &&
        voiceModeRef.current &&
        !stopVoiceRequestedRef.current
      ) {
        setVoiceStatus('Listening…')
        window.setTimeout(
          () => startRecognition(true),
          300,
        )
      } else {
        setVoiceStatus('Voice chat ready')
      }
    }

    utterance.onerror = () => {
      speakingRef.current = false

      if (
        resumeVoice &&
        voiceModeRef.current &&
        !stopVoiceRequestedRef.current
      ) {
        window.setTimeout(
          () => startRecognition(true),
          350,
        )
      }
    }

    window.speechSynthesis.speak(utterance)
  }

  async function submitMessage(
    rawContent: string,
    fromVoice = false,
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
      setVoiceStatus('Thinking…')
    }

    try {
      const data = await apiFetch<{
        reply: string
        provider?: string
        model?: string
        contextUpdatedAt?: string
      }>('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: content,
          history: nextMessages.slice(0, -1),
          activeView,
          activeViewLabel,
        }),
      })

      const reply =
        String(data.reply || '').trim() ||
        'I could not generate a response.'

      setProviderLabel(
        data.provider === 'gemini'
          ? `Gemini · ${data.model || 'connected model'}`
          : 'AI connected',
      )

      const withReply: Message[] = [
        ...nextMessages,
        { role: 'assistant', content: reply },
      ]

      messagesRef.current = withReply
      setMessages(withReply)

      if (fromVoice || voiceModeRef.current) {
        speak(reply, true)
      } else {
        speak(reply)
      }
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        'The real AI assistant is unavailable.'

      setProviderLabel('AI offline / not configured')

      const failureMessage: Message = {
        role: 'assistant',
        content:
          'The CRMS AI connection is unavailable right now. Check the configured Gemini API key/model and try again.',
      }

      const withFailure = [
        ...nextMessages,
        failureMessage,
      ]

      messagesRef.current = withFailure
      setMessages(withFailure)

      toast.error('CRMS Assistant unavailable', {
        description: errorMessage,
      })

      if (
        fromVoice &&
        voiceModeRef.current &&
        !stopVoiceRequestedRef.current
      ) {
        setVoiceStatus(
          'AI unavailable — listening remains paused',
        )
      }
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  function startRecognition(autoSend: boolean) {
    if (!voiceInputSupported) {
      toast.info(
        'Voice input is not available in this browser',
        {
          description:
            'Use a Chromium-based browser and allow microphone permission, or continue with typed CRMS chat.',
        },
      )
      return
    }

    if (
      sendingRef.current ||
      speakingRef.current
    ) {
      return
    }

    stopRecognition()

    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    if (!Recognition) return

    const recognition = new Recognition()
    recognition.lang = 'en-PH'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setListening(true)
      setVoiceStatus('Listening…')
    }

    recognition.onresult = (event) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript?.trim() ||
        ''

      if (!transcript) return

      setInput(transcript)

      if (autoSend || voiceModeRef.current) {
        void submitMessage(transcript, true)
      }
    }

    recognition.onerror = (event) => {
      setListening(false)

      const reason =
        event.error || 'Microphone recognition failed.'

      if (
        reason !== 'aborted' &&
        reason !== 'no-speech'
      ) {
        toast.error('Voice input stopped', {
          description: reason,
        })
      }

      if (
        voiceModeRef.current &&
        !stopVoiceRequestedRef.current &&
        !sendingRef.current &&
        !speakingRef.current &&
        (reason === 'no-speech' ||
          reason === 'aborted')
      ) {
        window.setTimeout(
          () => startRecognition(true),
          500,
        )
      }
    }

    recognition.onend = () => {
      setListening(false)

      if (
        voiceModeRef.current &&
        !stopVoiceRequestedRef.current &&
        !sendingRef.current &&
        !speakingRef.current
      ) {
        window.setTimeout(
          () => startRecognition(true),
          450,
        )
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      setListening(false)
      setVoiceStatus('Voice chat could not start')
    }
  }

  function toggleOneShotVoiceInput() {
    if (listening) {
      stopRecognition()
      return
    }

    stopVoiceRequestedRef.current = true
    startRecognition(false)
  }

  function startVoiceMode() {
    if (!voiceInputSupported) {
      toast.info(
        'Voice chat is not available in this browser',
        {
          description:
            'Use Chrome or another Chromium-based browser and allow microphone access.',
        },
      )
      return
    }

    stopVoiceRequestedRef.current = false
    voiceModeRef.current = true
    setVoiceMode(true)
    setOpen(true)
    setVoiceStatus('Starting microphone…')

    window.setTimeout(
      () => startRecognition(true),
      200,
    )
  }

  function handleLauncherPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect()

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: launcherPosition?.x ?? rect.left,
      originY: launcherPosition?.y ?? rect.top,
    }

    draggedRef.current = false
    event.currentTarget.setPointerCapture(
      event.pointerId,
    )
  }

  function handleLauncherPointerMove(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    const drag = dragRef.current

    if (
      !drag ||
      drag.pointerId !== event.pointerId
    ) {
      return
    }

    const deltaX =
      event.clientX - drag.startX
    const deltaY =
      event.clientY - drag.startY

    if (
      Math.abs(deltaX) > 4 ||
      Math.abs(deltaY) > 4
    ) {
      draggedRef.current = true
    }

    setLauncherPosition(
      clampPosition({
        x: drag.originX + deltaX,
        y: drag.originY + deltaY,
      }),
    )
  }

  function handleLauncherPointerUp(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    const drag = dragRef.current

    if (
      drag &&
      drag.pointerId === event.pointerId
    ) {
      const finalPosition =
        clampPosition({
          x:
            drag.originX +
            (event.clientX - drag.startX),
          y:
            drag.originY +
            (event.clientY - drag.startY),
        })

      if (draggedRef.current) {
        saveLauncherPosition(finalPosition)
      } else {
        setOpen(true)
      }
    }

    dragRef.current = null

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      )
    } catch {
      // Pointer capture may already have been released.
    }
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={handleLauncherPointerDown}
        onPointerMove={handleLauncherPointerMove}
        onPointerUp={handleLauncherPointerUp}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' ||
            event.key === ' '
          ) {
            setOpen(true)
          }
        }}
        aria-label="Open or move CRMS Assistant"
        title="CRMS Assistant — drag to move, click to open"
        className="fixed z-40 grid h-[52px] w-[52px] touch-none select-none place-items-center rounded-full bg-emerald-700 text-white shadow-xl ring-1 ring-emerald-800/20 transition hover:scale-105 hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
        style={
          launcherPosition
            ? {
                left: launcherPosition.x,
                top: launcherPosition.y,
              }
            : {
                right: 16,
                bottom: 96,
              }
        }
      >
        <Bot className="h-6 w-6" />
        <GripVertical className="absolute -left-1 -top-1 h-4 w-4 rounded-full bg-white p-0.5 text-emerald-700 shadow" />
        <span className="sr-only">
          Drag this floating icon to reposition it.
        </span>
      </button>

      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (
            !nextOpen &&
            voiceModeRef.current
          ) {
            return
          }

          setOpen(nextOpen)
        }}
      >
        <SheetContent
          side="right"
          className="w-[94vw] gap-0 p-0 sm:max-w-md"
          onInteractOutside={(event) => {
            if (voiceModeRef.current) {
              event.preventDefault()
            }
          }}
        >
          <SheetHeader className="border-b bg-emerald-50/70 pr-12">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-700 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <SheetTitle>
                  CRMS Assistant
                </SheetTitle>
                <SheetDescription>
                  CRMS-only help with current system context.
                </SheetDescription>
              </div>
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
                  {greeting(userRole)}
                </p>
                <p className="mt-2 text-xs text-emerald-800">
                  Current page: {activeViewLabel}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <span className="font-medium text-slate-700">
                  {providerLabel}
                </span>
                <span className="text-slate-500">
                  Live CRMS context
                </span>
              </div>

              {voiceMode ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative grid h-10 w-10 place-items-center rounded-full bg-emerald-700 text-white">
                      <AudioLines className="h-5 w-5" />
                      {listening ? (
                        <span className="absolute inset-0 animate-ping rounded-full border border-emerald-500" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-emerald-950">
                        Hands-free voice chat
                      </p>
                      <p className="text-xs text-emerald-800">
                        {voiceStatus}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={stopVoiceMode}
                      className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <PhoneOff className="h-4 w-4" />
                      End
                    </Button>
                  </div>
                </div>
              ) : null}

              <p className="text-xs leading-5 text-muted-foreground">
                This assistant is restricted to CRMS. It receives your role, current CRMS page, recent chat context, and a role-appropriate live system snapshot. It does not need your password, OTP, or API key.
              </p>

              {messages.map(
                (message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={
                      message.role === 'user'
                        ? 'ml-8 rounded-2xl bg-slate-900 px-4 py-3 text-sm leading-6 text-white'
                        : 'mr-8 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800'
                    }
                  >
                    {message.content}
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
              <div className="mb-2 flex gap-2">
                {!voiceMode ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startVoiceMode}
                    disabled={!voiceInputSupported}
                    className="flex-1 gap-2"
                  >
                    <AudioLines className="h-4 w-4" />
                    Start Voice Chat
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={stopVoiceMode}
                    className="flex-1 gap-2 border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <PhoneOff className="h-4 w-4" />
                    End Voice Chat
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSpeechEnabled(
                      (current) => {
                        const next = !current

                        if (
                          !next &&
                          typeof window !==
                            'undefined'
                        ) {
                          window.speechSynthesis?.cancel()
                        }

                        return next
                      },
                    )
                  }}
                  className="gap-1.5"
                >
                  {speechEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                  Voice
                </Button>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={toggleOneShotVoiceInput}
                  aria-label={
                    listening
                      ? 'Stop voice input'
                      : 'Dictate one CRMS question'
                  }
                  disabled={voiceMode}
                  className="shrink-0"
                >
                  {listening && !voiceMode ? (
                    <MicOff className="h-4 w-4 text-red-600" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>

                <Input
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
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
                      : listening
                        ? 'Listening…'
                        : 'Ask about CRMS…'
                  }
                  maxLength={2000}
                  disabled={voiceMode}
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
                  ? 'Mic ready. Voice Chat automatically sends what you say, speaks the answer, then listens again.'
                  : 'Voice recognition is unavailable in this browser. Typed CRMS chat still works.'}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
