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
  token: string
  model: string
  systemInstruction: string
  expiresAt: string
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
  const [voiceStatus, setVoiceStatus] =
    useState('Voice Chat ready')
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
  const stoppingVoiceRef =
    useRef(false)
  const nextPlaybackTimeRef =
    useRef(0)
  const inputTranscriptRef =
    useRef('')
  const outputTranscriptRef =
    useRef('')
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

  async function sendTypedMessage() {
    const content = input.trim()
    if (!content || sending) return

    const history = [
      ...messagesRef.current,
    ].slice(-14)

    addMessage({
      role: 'user',
      content,
    })
    setInput('')
    setSending(true)

    try {
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

      addMessage({
        role: 'assistant',
        content:
          String(
            data.reply || '',
          ).trim() ||
          'The assistant returned an empty response.',
      })

      setProviderLabel(
        data.provider === 'gemini'
          ? `Gemini · ${data.model || 'connected model'}`
          : 'AI connected',
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
  ) {
    const context =
      outputContextRef.current

    if (!context) return

    const pcm =
      base64ToPcm16(base64)

    if (pcm.length === 0) return

    const buffer =
      context.createBuffer(
        1,
        pcm.length,
        24_000,
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

    if (voiceMode) {
      setVoiceStatus(
        'Listening — speak naturally',
      )
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

      const outputContext =
        new AudioContext({
          sampleRate: 24_000,
          latencyHint: 'interactive',
        })
      outputContextRef.current =
        outputContext
      await outputContext.resume()

      setVoiceStatus(
        'Connecting to Gemini Live…',
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

      const socket = new WebSocket(
        'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=' +
          encodeURIComponent(
            token.token,
          ),
      )

      socketRef.current = socket

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            setup: {
              model:
                'models/' +
                token.model,
              generationConfig: {
                responseModalities: [
                  'AUDIO',
                ],
                temperature: 0.2,
              },
              inputAudioTranscription:
                {},
              outputAudioTranscription:
                {},
              realtimeInputConfig: {
                automaticActivityDetection:
                  {
                    disabled: false,
                    startOfSpeechSensitivity:
                      'START_SENSITIVITY_HIGH',
                    endOfSpeechSensitivity:
                      'END_SENSITIVITY_HIGH',
                    prefixPaddingMs: 120,
                    silenceDurationMs: 650,
                  },
              },
              systemInstruction: {
                parts: [
                  {
                    text:
                      token.systemInstruction,
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
          liveReadyRef.current =
            true
          setProviderLabel(
            'Gemini Live · ' +
              token.model,
          )
          setVoiceStatus(
            'Listening — speak naturally',
          )
          startMicrophoneStreaming(
            stream,
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
              playLiveAudio(
                inline.data,
              )
            }
          }
        }

        if (
          serverContent.interrupted
        ) {
          nextPlaybackTimeRef.current =
            outputContextRef.current
              ?.currentTime || 0
          setVoiceStatus(
            'Listening — speak naturally',
          )
        }

        if (
          serverContent.turnComplete
        ) {
          finishLiveTurn()
        }
      }

      socket.onerror = () => {
        if (
          stoppingVoiceRef.current
        ) {
          return
        }

        toast.error(
          'Gemini Live connection error',
          {
            description:
              'The live voice connection could not continue.',
          },
        )
      }

      socket.onclose = (
        event,
      ) => {
        if (
          stoppingVoiceRef.current
        ) {
          return
        }

        void stopVoiceChat(
          false,
        )

        toast.error(
          'Voice Chat disconnected',
          {
            description:
              event.reason ||
              'The live connection closed. Tap Voice Chat to reconnect.',
          },
        )
      }
    } catch (error: any) {
      await stopVoiceChat(false)

      const denied =
        error?.name ===
          'NotAllowedError' ||
        error?.name ===
          'PermissionDeniedError'

      toast.error(
        denied
          ? 'Microphone permission denied'
          : 'Voice Chat could not start',
        {
          description: denied
            ? 'Allow microphone access for localhost/CRMS in your browser, then try again.'
            : error?.message ||
              'Check Gemini Live configuration and try again.',
        },
      )
    }
  }

  async function stopVoiceChat(
    userInitiated: boolean,
  ) {
    stoppingVoiceRef.current = true
    liveReadyRef.current = false

    const socket =
      socketRef.current
    socketRef.current = null

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
      {portalReady
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

              {voiceMode ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-700 text-white">
                      <AudioLines className="h-5 w-5" />
                      <span className="absolute inset-0 animate-ping rounded-full border border-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">
                        Gemini Live Voice
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
                Voice Chat now uses Gemini Live directly instead of browser speech recognition. One button starts/stops the real-time audio session.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
