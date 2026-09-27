'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Bot,
  Loader2,
  Mic,
  MicOff,
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
    | ((event: {
        results: ArrayLike<{
          0: { transcript: string }
          isFinal?: boolean
        }>
      }) => void)
    | null
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

function greeting(role: string) {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'ADMIN') {
    return 'I can help with approvals, Operations History, reports, announcements, analytics, map status, and other CRMS workflows.'
  }
  if (normalized === 'WORKER') {
    return 'I can help with citizen registration, relief recording, Activity History, field notes, announcements, and daily reports.'
  }
  return 'I can help explain your profile, relief history, community updates, feedback, and other CRMS features.'
}

export function CrmsAssistant({
  userName,
  userRole,
}: {
  userName: string
  userRole: string
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null)

  const voiceInputSupported = useMemo(() => {
    if (typeof window === 'undefined') return false
    return Boolean(
      window.SpeechRecognition ||
        window.webkitSpeechRecognition,
    )
  }, [open])

  function speak(text: string) {
    if (
      !speechEnabled ||
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-PH'
    utterance.rate = 1
    window.speechSynthesis.speak(utterance)
  }

  function toggleVoiceInput() {
    if (!voiceInputSupported) {
      toast.info('Voice input is not available in this browser', {
        description:
          'You can still type your question. Chrome-based browsers generally provide the widest Web Speech support.',
      })
      return
    }

    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    if (!Recognition) return

    const recognition = new Recognition()
    recognition.lang = 'en-PH'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = (event) => {
      setListening(false)
      toast.error('Voice input stopped', {
        description:
          event.error ||
          'Microphone recognition was not available.',
      })
    }
    recognition.onresult = (event) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript?.trim() || ''
      if (transcript) {
        setInput(transcript)
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      setListening(false)
    }
  }

  async function sendMessage() {
    const content = input.trim()
    if (!content || sending) return

    const nextMessages: Message[] = [
      ...messages,
      { role: 'user', content },
    ].slice(-10)

    setMessages(nextMessages)
    setInput('')
    setSending(true)

    try {
      const data = await apiFetch<{
        reply: string
        provider?: string
      }>('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: content,
          history: nextMessages.slice(0, -1),
        }),
      })

      const reply =
        String(data.reply || '').trim() ||
        'I could not generate a response.'

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: reply },
      ])

      speak(reply)
    } catch (error: any) {
      toast.error('Assistant unavailable', {
        description:
          error?.message || 'Please try again.',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open CRMS Assistant"
        className="fixed bottom-24 right-4 z-40 h-12 rounded-full bg-emerald-700 px-4 text-white shadow-xl hover:bg-emerald-800 md:bottom-12 md:right-6"
      >
        <Bot className="h-5 w-5" />
        <span className="hidden sm:inline">
          CRMS Assistant
        </span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[94vw] gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b bg-emerald-50/70 pr-12">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-700 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <SheetTitle>CRMS Assistant</SheetTitle>
                <SheetDescription>
                  Ask about how to use the system.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
                <p className="font-semibold">
                  Hello{userName ? `, ${userName}` : ''}.
                </p>
                <p className="mt-1">
                  {greeting(userRole)}
                </p>
              </div>

              <p className="text-xs leading-5 text-muted-foreground">
                The assistant receives your question and role, not an automatic copy of citizen records. Avoid typing passwords or unnecessary sensitive personal information.
              </p>

              {messages.map((message, index) => (
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
              ))}

              {sending ? (
                <div className="mr-8 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
                </div>
              ) : null}
            </div>

            <div className="border-t bg-white p-3">
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={toggleVoiceInput}
                  aria-label={
                    listening
                      ? 'Stop voice input'
                      : 'Start voice input'
                  }
                  className="shrink-0"
                >
                  {listening ? (
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
                      void sendMessage()
                    }
                  }}
                  placeholder={
                    listening
                      ? 'Listening…'
                      : 'Ask about CRMS…'
                  }
                  maxLength={2000}
                />

                <Button
                  type="button"
                  size="icon"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || sending}
                  aria-label="Send question"
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-[0.6875rem] text-muted-foreground">
                  {voiceInputSupported
                    ? 'Voice input available'
                    : 'Type input available'}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSpeechEnabled((value) => {
                      const next = !value
                      if (!next && typeof window !== 'undefined') {
                        window.speechSynthesis?.cancel()
                      }
                      return next
                    })
                  }}
                  className="h-8 gap-1.5 px-2 text-xs"
                >
                  {speechEnabled ? (
                    <Volume2 className="h-3.5 w-3.5" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5" />
                  )}
                  Spoken replies
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
