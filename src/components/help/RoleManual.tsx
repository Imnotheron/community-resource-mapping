'use client'

import type { ComponentType } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  HelpCircle,
  LifeBuoy,
  Mail,
  MapPinned,
  Megaphone,
  Phone,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'

type ManualRole = 'ADMIN' | 'WORKER' | 'VULNERABLE'

interface RoleManualProps {
  role?: string | null
}

type QuickCard = {
  title: string
  text: string
  icon: ComponentType<{ className?: string }>
  tone: string
}

type GuideBlock = {
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  steps: string[]
}

function normalizeRole(role?: string | null): ManualRole {
  const value = String(role || 'ADMIN').trim().toUpperCase()
  if (value === 'WORKER') return 'WORKER'
  if (value === 'VULNERABLE') return 'VULNERABLE'
  return 'ADMIN'
}

const roleCopy: Record<ManualRole, { eyebrow: string; title: string; description: string }> = {
  ADMIN: {
    eyebrow: 'Administrator User Guide',
    title: 'Run daily CRMS operations with confidence.',
    description:
      'A simple, step-by-step guide for reviewing registrations, managing users, approving relief records, publishing announcements, and using the map for municipal decisions.',
  },
  WORKER: {
    eyebrow: 'Field Worker User Guide',
    title: 'Capture accurate field records and keep assistance moving.',
    description:
      'A practical guide for registering vulnerable citizens, updating household locations, submitting relief records, and syncing work back to the municipal dashboard.',
  },
  VULNERABLE: {
    eyebrow: 'Citizen User Guide',
    title: 'Understand your profile, announcements, and assistance updates.',
    description:
      'A simple guide for checking account information, reading official notices, and understanding assistance-related updates from the municipality.',
  },
}

const quickCards: Record<ManualRole, QuickCard[]> = {
  ADMIN: [
    {
      title: 'Start with Overview',
      text: 'Check alerts, pending work, mapped records, and overall system activity first.',
      icon: Activity,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    },
    {
      title: 'Process official records',
      text: 'Use Registrations and Relief Approval for verification and decision-making.',
      icon: ClipboardCheck,
      tone: 'bg-sky-50 text-sky-700 ring-sky-200',
    },
    {
      title: 'Plan using map data',
      text: 'Use Vulnerable Map and Analytics to identify barangays needing attention.',
      icon: MapPinned,
      tone: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
  ],
  WORKER: [
    {
      title: 'Review assignments',
      text: 'Check announcements and assigned field work before going to barangays.',
      icon: Megaphone,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    },
    {
      title: 'Register accurately',
      text: 'Complete citizen details, capture exact household location, and save drafts if needed.',
      icon: UserPlus,
      tone: 'bg-sky-50 text-sky-700 ring-sky-200',
    },
    {
      title: 'Sync field updates',
      text: 'Submit relief records and confirm updates are synchronized before ending work.',
      icon: RefreshCcw,
      tone: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
  ],
  VULNERABLE: [
    {
      title: 'Check your profile',
      text: 'Review your personal information and make sure your contact details are correct.',
      icon: FileCheck2,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    },
    {
      title: 'Read announcements',
      text: 'Use official announcements for schedule changes, assistance notices, and reminders.',
      icon: Megaphone,
      tone: 'bg-sky-50 text-sky-700 ring-sky-200',
    },
    {
      title: 'Ask for help',
      text: 'Contact support if your record, location, or assistance information appears incorrect.',
      icon: LifeBuoy,
      tone: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
  ],
}

const adminGuide: GuideBlock[] = [
  {
    title: 'Daily dashboard routine',
    description: 'Use this sequence at the beginning of every workday.',
    icon: Clock3,
    steps: [
      'Open Overview and check system activity, pending applications, active users, and mapped locations.',
      'Open Registrations and review new or pending vulnerable citizen records.',
      'Open Relief Approval and validate submitted distribution records before approving.',
      'Open Vulnerable Map to check barangay locations with needs assistance or no relief yet.',
      'Open Announcements if municipal instructions need to be published for workers or citizens.',
    ],
  },
  {
    title: 'Register a vulnerable citizen',
    description: 'Use this when assisting walk-in citizens or encoding verified field data.',
    icon: UserPlus,
    steps: [
      'Go to Registrations and select Register Vulnerable Person.',
      'Enter personal information first: name, birth date, gender, contact number, and barangay.',
      'Use the map picker to select the household location instead of guessing coordinates.',
      'Complete medical, vulnerability, guardian, and assistance details.',
      'Upload or mark required supporting documents when available.',
      'Review the summary, correct missing details, then submit or save as draft.',
    ],
  },
  {
    title: 'Approve or reject registrations',
    description: 'Use this to keep the vulnerable registry clean and reliable.',
    icon: ShieldCheck,
    steps: [
      'Filter Registrations by Pending to focus only on records needing action.',
      'Open the citizen record and verify identity, barangay, contact details, and map location.',
      'Approve complete and valid records. Reject only when the submission is invalid or duplicated.',
      'Use notes or remarks when a record needs correction so workers know what to fix.',
    ],
  },
  {
    title: 'Manage relief approvals',
    description: 'Use this before a distribution becomes an official municipal record.',
    icon: ClipboardCheck,
    steps: [
      'Open Relief Approval and keep the filter on Pending.',
      'Check beneficiary name, worker name, assistance type, quantity, date, and remarks.',
      'Approve valid records only after confirming the beneficiary and distribution details.',
      'Reject records with missing or suspicious data, then ask the worker to resubmit correctly.',
    ],
  },
  {
    title: 'Use map and analytics for decisions',
    description: 'Use this for planning, briefings, and municipal reporting.',
    icon: BarChart3,
    steps: [
      'Open Vulnerable Map to view household locations and assistance status by marker color.',
      'Open Analytics to review registration, distribution, and vulnerability trends.',
      'Use barangay-level patterns to identify underserved areas or records needing follow-up.',
      'Export reports when preparing audits, meetings, or relief planning summaries.',
    ],
  },
]

const workerGuide: GuideBlock[] = [
  {
    title: 'Field worker daily routine',
    description: 'Use this before and after field visits.',
    icon: Clock3,
    steps: [
      'Read announcements and check any assigned field work.',
      'Open registration tools for citizens who need assisted encoding.',
      'Use the map picker to capture accurate household locations.',
      'Submit relief records only after confirming beneficiary and quantity details.',
      'Check that your records are synced before ending your work session.',
    ],
  },
  {
    title: 'Register a citizen in the field',
    description: 'Use this when collecting records directly from barangays.',
    icon: UserPlus,
    steps: [
      'Collect personal, contact, barangay, and vulnerability information.',
      'Select the exact household point on the map picker.',
      'Add guardian, medical, and assistance details when applicable.',
      'Save as draft when documents or details are incomplete.',
      'Submit only after reviewing the information with the citizen or guardian.',
    ],
  },
  {
    title: 'Submit relief distribution records',
    description: 'Use this after assistance has been released.',
    icon: ClipboardCheck,
    steps: [
      'Select the correct beneficiary record.',
      'Enter assistance type, quantity, date, and remarks.',
      'Review all details before submission because admin approval depends on accuracy.',
      'Wait for admin review if the record remains pending.',
    ],
  },
]

const vulnerableGuide: GuideBlock[] = [
  {
    title: 'Use your citizen account',
    description: 'Simple steps for checking important information.',
    icon: FileCheck2,
    steps: [
      'Sign in using the account credentials provided by the municipality.',
      'Review your profile information and check if your contact details are correct.',
      'Read official announcements for schedules, notices, and assistance updates.',
      'Contact support if your profile, barangay, or assistance details need correction.',
    ],
  },
  {
    title: 'When to ask for help',
    description: 'Use official support channels for sensitive account or assistance concerns.',
    icon: HelpCircle,
    steps: [
      'Ask for help if your name, contact number, barangay, or household location is incorrect.',
      'Ask for help if you cannot sign in or forgot your temporary password.',
      'Ask for help if an assistance record appears missing or incorrect.',
    ],
  },
]

function GuideStepList({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
            {index + 1}
          </span>
          <span className="text-sm leading-6 text-slate-600">{step}</span>
        </li>
      ))}
    </ol>
  )
}

function GuideBlockCard({ block, initiallyOpen = false }: { block: GuideBlock; initiallyOpen?: boolean }) {
  const Icon = block.icon

  return (
    <details
      open={initiallyOpen}
      className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <summary className="flex cursor-pointer list-none items-center gap-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-emerald-700 ring-1 ring-slate-200">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-slate-950">{block.title}</span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">{block.description}</span>
        </span>
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition group-open:bg-emerald-50 group-open:text-emerald-700">
          <span className="group-open:hidden">Open</span>
          <span className="hidden group-open:inline">Close</span>
        </span>
      </summary>
      <GuideStepList steps={block.steps} />
    </details>
  )
}

export function RoleManual({ role }: RoleManualProps) {
  const normalizedRole = normalizeRole(role)
  const copy = roleCopy[normalizedRole]
  const cards = quickCards[normalizedRole]
  const guides =
    normalizedRole === 'WORKER'
      ? workerGuide
      : normalizedRole === 'VULNERABLE'
        ? vulnerableGuide
        : adminGuide

  return (
    <section className="space-y-6" aria-label={`${copy.eyebrow} content`}>
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
        <div className="relative border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-5 py-6 md:px-7 md:py-8">
          <div className="absolute right-6 top-6 hidden rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm md:inline-flex">
            Designed for daily use
          </div>

          <div className="flex max-w-4xl flex-col gap-4 md:flex-row md:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/15">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{copy.eyebrow}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">{copy.description}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-200 bg-slate-50/70 p-5 md:grid-cols-3 md:p-6">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <article key={card.title} className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-slate-950">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
              </article>
            )
          })}
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_330px] md:p-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Step-by-step guides</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Choose the task you are doing now</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Each guide opens only when needed, so the page stays clean and easy to read.
              </p>
            </div>

            <div className="space-y-3">
              {guides.map((guide, index) => (
                <GuideBlockCard key={guide.title} block={guide} initiallyOpen={index === 0} />
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                <h2 className="text-base font-semibold">Before you submit</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6">
                <li className="flex gap-2">
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                  Verify names, contact numbers, barangay, and household location.
                </li>
                <li className="flex gap-2">
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                  Review vulnerability details and supporting documents.
                </li>
                <li className="flex gap-2">
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                  Use remarks when rejecting or asking for corrections.
                </li>
              </ul>
            </div>

            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-amber-950">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
                <h2 className="text-base font-semibold">Emergency mode</h2>
              </div>
              <p className="mt-3 text-sm leading-6">
                During urgent operations, check the map first, prioritize red markers, approve verified relief records, and publish announcements only from official instructions.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-slate-600" />
                <h2 className="text-base font-semibold text-slate-950">Need help?</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-700" />
                  Emergency: <span className="font-medium text-slate-900">+63 917 123 4567</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-700" />
                  Office: <span className="font-medium text-slate-900">(043) 123-4567</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-700" />
                  Email: <span className="font-medium text-slate-900">admin@crms.gov.ph</span>
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-slate-600" />
                <h2 className="text-base font-semibold text-slate-950">Fast habit</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Start every task by filtering first. This keeps tables short, prevents mistakes, and helps staff focus on the records that need action.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

export default RoleManual
