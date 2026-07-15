'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileClock,
  FileText,
  HeartPulse,
  RefreshCcw,
  Save,
  ShieldPlus,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { SAN_POLICARPO_BARANGAYS } from '@/lib/san-policarpo-geography'

const AddressPickerMap = dynamic(() => import('@/components/maps/address-picker-map'), {
  ssr: false,
  loading: () => (
    <div className="grid h-[340px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
      Loading map picker...
    </div>
  ),
})

const MODAL_MIN_WIDTH = 980
const MODAL_MIN_HEIGHT = 640
const MODAL_MAX_WIDTH_RATIO = 0.96
const MODAL_MAX_HEIGHT_RATIO = 0.96
const MODAL_MARGIN = 16

type ModalFrame = {
  width: number
  height: number
  left: number
  top: number
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getCenteredModalFrame(): ModalFrame {
  if (typeof window === 'undefined') {
    return { width: 1180, height: 720, left: 80, top: 60 }
  }

  const maxWidth = window.innerWidth - MODAL_MARGIN * 2
  const maxHeight = window.innerHeight - MODAL_MARGIN * 2
  const preferredWidth = Math.min(window.innerWidth * 0.86, 1500)
  const preferredHeight = window.innerHeight * 0.88
  const width = clampNumber(preferredWidth, Math.min(MODAL_MIN_WIDTH, maxWidth), maxWidth)
  const height = clampNumber(preferredHeight, Math.min(MODAL_MIN_HEIGHT, maxHeight), maxHeight)

  return {
    width,
    height,
    left: Math.round((window.innerWidth - width) / 2),
    top: Math.round((window.innerHeight - height) / 2),
  }
}

type StepKey =
  | 'personal'
  | 'medical'
  | 'administrative'
  | 'documents'
  | 'review'

interface VulnerableRegistrationModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (formData: Record<string, any>) => Promise<void> | void
  userRole?: string
}

interface FormState {
  // Personal
  lastName: string
  firstName: string
  middleName: string
  suffix: string
  dateOfBirth: string
  gender: string
  civilStatus: string
  mobileNumber: string
  landlineNumber: string
  emailAddress: string
  houseNumber: string
  street: string
  barangay: string
  municipality: string
  province: string
  latitude: string
  longitude: string

  // Government registry basis
  registryCategory: string
  governmentAgency: string
  governmentProgram: string
  povertyStatus: string
  seniorCitizenId: string
  oscaId: string
  pwdIdNumber: string
  psaReferenceNumber: string
  civilRegistryStatus: string
  consentToValidateInfo: boolean

  // Medical
  hasDisability: boolean
  disabilityType: string
  disabilitySeverity: string
  disabilityCause: string
  disabilityDetails: string
  medicalCertificateNumber: string
  medicalCertificateDate: string
  hasPhysicalEvidence: boolean
  hasMedicalCondition: boolean
  medicalConditions: string
  needsAssistance: boolean
  assistanceType: string

  // Administrative
  bloodType: string
  guardianName: string
  guardianRelationship: string
  guardianContact: string
  guardianAddress: string
  philHealthNumber: string
  sssNumber: string
  gsisNumber: string
  otherIdNumbers: string
  educationalAttainment: string
  schoolName: string
  employmentStatus: string
  employmentDetails: string
  employerName: string
  emergencyContact: string
  emergencyPhone: string

  // Documents
  hasPWDRegistrationForm: boolean
  pwdRegistrationForm: File | null
  hasMedicalCertificate: boolean
  medicalCertificate: File | null
  hasProofOfIdentity: boolean
  proofOfIdentity: File | null
  hasProofOfResidence: boolean
  proofOfResidence: File | null
  hasIDPhotos: boolean
  idPhotos: FileList | null
}

interface SavedDraft {
  id: string
  adminId: string
  title: string
  formData: Record<string, any>
  currentStep: number
  createdAt: string
  updatedAt: string
}


const STEPS: {
  key: StepKey
  title: string
  short: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
    { key: 'personal', title: 'Personal Information', short: 'Personal', icon: UserRound },
    { key: 'medical', title: 'Medical & Assistance', short: 'Medical', icon: HeartPulse },
    { key: 'administrative', title: 'Administrative Details', short: 'Administrative', icon: ClipboardList },
    { key: 'documents', title: 'Documents', short: 'Documents', icon: FileText },
    { key: 'review', title: 'Review & Submit', short: 'Review', icon: CheckCircle2 },
  ]

const BARANGAYS = SAN_POLICARPO_BARANGAYS

// Registration form controlled selection options
const BLOOD_TYPE_OPTIONS: string[] = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'Unknown / Not tested',
]

const EDUCATIONAL_ATTAINMENT_OPTIONS: string[] = [
  'No formal education',
  'Elementary level',
  'Elementary graduate',
  'Junior high school level',
  'Junior high school graduate',
  'Senior high school level',
  'Senior high school graduate',
  'Vocational / Technical',
  'College level',
  'College graduate',
  'Postgraduate',
]

const EMPLOYMENT_STATUS_OPTIONS: string[] = [
  'Unemployed',
  'Employed full-time',
  'Employed part-time',
  'Self-employed',
  'Seasonal / Informal worker',
  'Student',
  'Homemaker',
  'Retired',
  'Unable to work',
  'Other / Not specified',
]

const GUARDIAN_RELATIONSHIP_OPTIONS: string[] = [
  'Parent',
  'Spouse',
  'Child',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Other relative',
  'Legal guardian',
  'Caregiver',
  'Social worker',
  'Other / Not specified',
]

const POVERTY_STATUS_OPTIONS: string[] = [
  'Not assessed',
  'Indigent',
  'Low-income',
  'Near-poor',
  'No regular income',
  'Food insecure',
  'Homeless / Displaced',
  'Other vulnerable household',
]

const CIVIL_REGISTRY_STATUS_OPTIONS: string[] = [
  'Birth certificate available',
  'Late registered',
  'For verification',
  'No PSA record',
  'Not registered',
  'Unknown',
]

const DISABILITY_TYPE_OPTIONS: string[] = [
  'Physical disability',
  'Visual disability',
  'Hearing disability',
  'Speech or language disability',
  'Intellectual disability',
  'Learning disability',
  'Psychosocial disability',
  'Mental disability',
  'Multiple disabilities',
  'Other / Not specified',
]

const DISABILITY_SEVERITY_OPTIONS: string[] = [
  'Mild',
  'Moderate',
  'Severe',
  'Profound',
  'Not assessed',
]

const DISABILITY_CAUSE_OPTIONS: string[] = [
  'Congenital / Inborn',
  'Illness / Disease',
  'Injury / Accident',
  'Work-related injury',
  'Age-related',
  'Disaster / Conflict',
  'Unknown',
  'Other / Not specified',
]

function getEmptyForm(): FormState {
  return {
    lastName: '',
    firstName: '',
    middleName: '',
    suffix: '',
    dateOfBirth: '',
    gender: '',
    civilStatus: '',
    mobileNumber: '',
    landlineNumber: '',
    emailAddress: '',
    houseNumber: '',
    street: '',
    barangay: '',
    municipality: 'San Policarpo',
    province: 'Eastern Samar',
    latitude: '',
    longitude: '',

    registryCategory: '',
    governmentAgency: '',
    governmentProgram: '',
    povertyStatus: '',
    seniorCitizenId: '',
    oscaId: '',
    pwdIdNumber: '',
    psaReferenceNumber: '',
    civilRegistryStatus: '',
    consentToValidateInfo: false,

    hasDisability: false,
    disabilityType: '',
    disabilitySeverity: '',
    disabilityCause: '',
    disabilityDetails: '',
    medicalCertificateNumber: '',
    medicalCertificateDate: '',
    hasPhysicalEvidence: false,
    hasMedicalCondition: false,
    medicalConditions: '',
    needsAssistance: false,
    assistanceType: '',

    bloodType: '',
    guardianName: '',
    guardianRelationship: '',
    guardianContact: '',
    guardianAddress: '',
    philHealthNumber: '',
    sssNumber: '',
    gsisNumber: '',
    otherIdNumbers: '',
    educationalAttainment: '',
    schoolName: '',
    employmentStatus: '',
    employmentDetails: '',
    employerName: '',
    emergencyContact: '',
    emergencyPhone: '',

    hasPWDRegistrationForm: false,
    pwdRegistrationForm: null,
    hasMedicalCertificate: false,
    medicalCertificate: null,
    hasProofOfIdentity: false,
    proofOfIdentity: null,
    hasProofOfResidence: false,
    proofOfResidence: null,
    hasIDPhotos: false,
    idPhotos: null,
  }
}

type RequiredFieldIssue = {
  key: keyof FormState
  label: string
  step: number
  message: string
}

function getRequiredFieldIssues(
  form: FormState,
): RequiredFieldIssue[] {
  const issues: RequiredFieldIssue[] = []

  const addIssue = (
    key: keyof FormState,
    label: string,
    step: number,
    message: string,
  ) => {
    if (
      issues.some(
        (issue) => issue.key === key,
      )
    ) {
      return
    }

    issues.push({
      key,
      label,
      step,
      message,
    })
  }

  // Step 1: Personal — required for identity, contact, and location.
  if (!form.lastName.trim()) {
    addIssue(
      'lastName',
      'Last name',
      0,
      'Last name is required.',
    )
  }

  if (!form.firstName.trim()) {
    addIssue(
      'firstName',
      'First name',
      0,
      'First name is required.',
    )
  }

  if (!form.dateOfBirth.trim()) {
    addIssue(
      'dateOfBirth',
      'Date of birth',
      0,
      'Date of birth is required.',
    )
  }

  if (!form.gender.trim()) {
    addIssue(
      'gender',
      'Gender',
      0,
      'Gender is required.',
    )
  }

  if (!form.mobileNumber.trim()) {
    addIssue(
      'mobileNumber',
      'Mobile number',
      0,
      'Mobile number is required.',
    )
  }

  if (!form.emailAddress.trim()) {
    addIssue(
      'emailAddress',
      'Email address',
      0,
      'Email address is required so account credentials can be delivered.',
    )
  }

  if (!form.barangay.trim()) {
    addIssue(
      'barangay',
      'Barangay',
      0,
      'Barangay is required.',
    )
  }

  // Step 2: Medical and registry — only essential and conditional fields.
  if (!form.registryCategory.trim()) {
    addIssue(
      'registryCategory',
      'Government registry basis',
      1,
      'Government registry basis is required.',
    )
  }

  if (
    form.registryCategory ===
      'GENERAL_WELFARE' &&
    !form.povertyStatus.trim()
  ) {
    addIssue(
      'povertyStatus',
      'Poverty / welfare status',
      1,
      'Poverty or welfare status is required for a General Welfare registration.',
    )
  }

  if (
    form.registryCategory ===
      'CIVIL_REGISTRY' &&
    !form.civilRegistryStatus.trim()
  ) {
    addIssue(
      'civilRegistryStatus',
      'Civil registry status',
      1,
      'Civil registry status is required for a Civil Registry registration.',
    )
  }

  if (
    (form.registryCategory === 'PWD' ||
      form.hasDisability) &&
    !form.disabilityType.trim()
  ) {
    addIssue(
      'disabilityType',
      'Disability type',
      1,
      'Disability type is required when the citizen is registered as a PWD or has a disability.',
    )
  }

  if (
    form.hasDisability &&
    !form.disabilitySeverity.trim()
  ) {
    addIssue(
      'disabilitySeverity',
      'Disability severity',
      1,
      'Select the disability severity or choose Not assessed.',
    )
  }

  if (
    form.hasMedicalCondition &&
    !form.medicalConditions.trim()
  ) {
    addIssue(
      'medicalConditions',
      'Medical conditions',
      1,
      'Describe the medical condition when Has Medical Condition is enabled.',
    )
  }

  if (
    form.needsAssistance &&
    !form.assistanceType.trim()
  ) {
    addIssue(
      'assistanceType',
      'Assistance type',
      1,
      'Describe the required assistance when Needs Assistance is enabled.',
    )
  }

  if (!form.consentToValidateInfo) {
    addIssue(
      'consentToValidateInfo',
      'Consent to validate information',
      1,
      'Consent to validate information is required.',
    )
  }

  // Step 3: Administrative — emergency contact only.
  if (!form.emergencyContact.trim()) {
    addIssue(
      'emergencyContact',
      'Emergency contact',
      2,
      'Emergency contact is required.',
    )
  }

  if (!form.emergencyPhone.trim()) {
    addIssue(
      'emergencyPhone',
      'Emergency phone',
      2,
      'Emergency phone is required.',
    )
  }

  return issues
}

function getImportantMissingFields(
  form: FormState,
) {
  return getRequiredFieldIssues(
    form,
  ).map((issue) => issue.label)
}

function countCompletedSteps(
  form: FormState,
) {
  const issues =
    getRequiredFieldIssues(form)

  let completed = 0

  if (
    !issues.some(
      (issue) => issue.step === 0,
    )
  ) {
    completed += 1
  }

  if (
    !issues.some(
      (issue) => issue.step === 1,
    )
  ) {
    completed += 1
  }

  if (
    !issues.some(
      (issue) => issue.step === 2,
    )
  ) {
    completed += 1
  }

  // Documents are optional and never reduce required-completion progress.
  completed += 1

  // Review is complete only when every required field is complete.
  if (issues.length === 0) {
    completed += 1
  }

  return completed
}

function formatBoolean(value: boolean) {
  return value ? 'Yes' : 'No'
}

function fileNameOf(file: File | null | undefined) {
  return file?.name || 'Not attached'
}

function fileListNameOf(files: FileList | null | undefined) {
  if (!files || files.length === 0) return 'Not attached'
  if (files.length === 1) return files[0].name
  return `${files.length} files selected`
}

function ReviewItem({
  label,
  value,
}: {
  label: string
  value?: string | number | null
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">
        {value && String(value).trim() !== '' ? value : 'Not provided'}
      </p>
    </div>
  )
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-5">
      <h3 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl md:text-2xl">
        {title}
      </h3>
      {subtitle ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{subtitle}</p>
      ) : null}
    </div>
  )
}

function InputBlock({
  label,
  field,
  required,
  error,
  children,
}: {
  label: string
  field?: keyof FormState
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-registration-field={field}
      className={cn(
        'space-y-2 rounded-xl transition',
        error &&
          'bg-red-50/70 p-3 ring-1 ring-red-200',
      )}
    >
      <Label
        className={cn(
          'text-xs font-medium text-slate-700 sm:text-sm',
          error && 'text-red-700',
        )}
      >
        {label}
        {required ? (
          <span className="ml-1 text-red-500">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function getCurrentAdminId() {
  if (typeof window === 'undefined') return ''

  const storageKeys = ['crms_user', 'user', 'auth_user']

  for (const key of storageKeys) {
    try {
      const rawUser = localStorage.getItem(key)
      if (!rawUser) continue

      const parsedUser = JSON.parse(rawUser)
      if (parsedUser?.id) return parsedUser.id
      if (parsedUser?.user?.id) return parsedUser.user.id
    } catch {
      // Keep checking other possible session keys.
    }
  }

  return ''
}

function getSerializableForm(form: FormState) {
  return {
    ...form,
    pwdRegistrationForm: null,
    medicalCertificate: null,
    proofOfIdentity: null,
    proofOfResidence: null,
    idPhotos: null,
  }
}

function normalizeDraftForm(value: Record<string, any>): FormState {
  return {
    ...getEmptyForm(),
    ...value,
    pwdRegistrationForm: null,
    medicalCertificate: null,
    proofOfIdentity: null,
    proofOfResidence: null,
    idPhotos: null,
  }
}

function createDraftTitle(form: FormState) {
  const fullName = [form.firstName, form.middleName, form.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (fullName && form.barangay) return `${fullName} · ${form.barangay}`
  if (fullName) return fullName
  if (form.barangay) return `Unnamed citizen · ${form.barangay}`

  return `Untitled draft · ${new Date().toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`
}

function formatDraftTimestamp(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Recently saved'

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function VulnerableRegistrationModal({
  open,
  onClose,
  onSubmit,
}: VulnerableRegistrationModalProps) {
  const isMobile = useIsMobile()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(getEmptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [drafts, setDrafts] = useState<SavedDraft[]>([])
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [modalFrame, setModalFrame] = useState<ModalFrame | null>(null)

  const modalFrameStyle = useMemo(
    () => {
      if (isMobile) {
        return {
          width: 'calc(100vw - 16px)',
          height: 'calc(100dvh - 16px)',
          left: '8px',
          top: '8px',
          transform: 'none',
          translate: 'none',
          maxWidth: 'none',
          maxHeight: 'none',
        } as React.CSSProperties
      }

      const frame =
        modalFrame ||
        getCenteredModalFrame()

      return {
        width: `${frame.width}px`,
        height: `${frame.height}px`,
        left: 0,
        top: 0,
        transform: `translate3d(${frame.left}px, ${frame.top}px, 0)`,
        translate: 'none',
        maxWidth: 'none',
        maxHeight: 'none',
      } as React.CSSProperties
    },
    [isMobile, modalFrame],
  )

  function startModalDrag(event: React.MouseEvent<HTMLDivElement>) {
    if (isMobile) return
    if ((event.target as HTMLElement).closest('[data-no-drag="true"]')) return

    event.preventDefault()

    const modal = event.currentTarget.closest('[data-registration-modal]') as HTMLElement | null
    if (!modal || typeof window === 'undefined') return

    const rect = modal.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const startLeft = rect.left
    const startTop = rect.top

    const onMouseMove = (moveEvent: MouseEvent) => {
      const nextLeft = clampNumber(
        startLeft + (moveEvent.clientX - startX),
        MODAL_MARGIN,
        Math.max(MODAL_MARGIN, window.innerWidth - rect.width - MODAL_MARGIN)
      )
      const nextTop = clampNumber(
        startTop + (moveEvent.clientY - startY),
        MODAL_MARGIN,
        Math.max(MODAL_MARGIN, window.innerHeight - rect.height - MODAL_MARGIN)
      )

      setModalFrame({
        width: rect.width,
        height: rect.height,
        left: nextLeft,
        top: nextTop,
      })
    }

    const onMouseUp = () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'move'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function startModalResize(
    event: React.MouseEvent<HTMLDivElement>,
    edge: 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  ) {
    if (isMobile) return

    event.preventDefault()
    event.stopPropagation()

    const modal = event.currentTarget.closest('[data-registration-modal]') as HTMLElement | null
    if (!modal || typeof window === 'undefined') return

    const rect = modal.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const startWidth = rect.width
    const startHeight = rect.height
    const startLeft = rect.left
    const startTop = rect.top
    const startRight = rect.right
    const startBottom = rect.bottom
    const maxWidth = window.innerWidth - MODAL_MARGIN * 2
    const maxHeight = window.innerHeight - MODAL_MARGIN * 2
    const minWidth = Math.min(MODAL_MIN_WIDTH, maxWidth)
    const minHeight = Math.min(MODAL_MIN_HEIGHT, maxHeight)

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      let nextWidth = startWidth
      let nextHeight = startHeight
      let nextLeft = startLeft
      let nextTop = startTop

      if (edge.includes('right')) {
        nextWidth = clampNumber(startWidth + deltaX, minWidth, maxWidth)
      }

      if (edge.includes('left')) {
        nextWidth = clampNumber(startWidth - deltaX, minWidth, maxWidth)
        nextLeft = startRight - nextWidth
      }

      if (edge.includes('bottom')) {
        nextHeight = clampNumber(startHeight + deltaY, minHeight, maxHeight)
      }

      if (edge.includes('top')) {
        nextHeight = clampNumber(startHeight - deltaY, minHeight, maxHeight)
        nextTop = startBottom - nextHeight
      }

      nextLeft = clampNumber(nextLeft, MODAL_MARGIN, Math.max(MODAL_MARGIN, window.innerWidth - nextWidth - MODAL_MARGIN))
      nextTop = clampNumber(nextTop, MODAL_MARGIN, Math.max(MODAL_MARGIN, window.innerHeight - nextHeight - MODAL_MARGIN))

      setModalFrame({
        width: nextWidth,
        height: nextHeight,
        left: nextLeft,
        top: nextTop,
      })
    }

    const onMouseUp = () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = edge.includes('left') || edge.includes('right') ? 'ew-resize' : 'ns-resize'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const loadDrafts = useCallback(async () => {
    const adminId = getCurrentAdminId()

    if (!adminId) {
      setDrafts([])
      return
    }

    setLoadingDrafts(true)

    try {
      const response = await fetch(
        `/api/admin/vulnerable-drafts?adminId=${encodeURIComponent(adminId)}`,
        { cache: 'no-store' }
      )
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to load drafts')
      }

      setDrafts(data.drafts || [])
    } catch (error: any) {
      toast.error('Failed to load drafts', {
        description: error.message || 'Please try again.',
      })
    } finally {
      setLoadingDrafts(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    setModalFrame(
      isMobile
        ? null
        : getCenteredModalFrame(),
    )
    setForm(getEmptyForm())
    setErrors({})
    setStep(0)
    setCurrentDraftId(null)
    loadDrafts()
  }, [open, loadDrafts, isMobile])

  const progressWidth = useMemo(() => {
    return `${((step + 1) / STEPS.length) * 100}%`
  }, [step])

  const completedSteps = countCompletedSteps(form)
  const requiredFieldIssues =
    getRequiredFieldIssues(form)
  const missingImportantFields =
    requiredFieldIssues.map(
      (issue) => issue.label,
    )
  const canSubmit =
    requiredFieldIssues.length === 0

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key as string]) return prev
      const next = { ...prev }
      delete next[key as string]
      return next
    })
  }

  async function saveDraft() {
    const adminId = getCurrentAdminId()

    if (!adminId) {
      toast.error('User session missing', {
        description: 'Please sign in again before saving a draft.',
      })
      return
    }

    setSavingDraft(true)

    try {
      const response = await fetch('/api/admin/vulnerable-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId,
          draftId: currentDraftId,
          title: createDraftTitle(form),
          currentStep: step,
          formData: getSerializableForm(form),
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to save draft')
      }

      toast.success('Draft saved to the system', {
        description: 'The form has been cleared. You can resume this draft from the saved drafts list.',
      })
      setForm(getEmptyForm())
      setErrors({})
      setStep(0)
      setCurrentDraftId(null)
      await loadDrafts()
    } catch (error: any) {
      toast.error('Failed to save draft', {
        description: error.message || 'Please try again.',
      })
    } finally {
      setSavingDraft(false)
    }
  }

  function resumeDraft(draft: SavedDraft) {
    setForm(normalizeDraftForm(draft.formData || {}))
    setCurrentDraftId(draft.id)
    setStep(Math.min(Math.max(draft.currentStep || 0, 0), STEPS.length - 1))
    setErrors({})

    toast.success('Draft loaded', {
      description: draft.title,
    })
  }

  async function deleteDraft(draftId: string) {
    const adminId = getCurrentAdminId()

    if (!adminId) {
      toast.error('User session missing', {
        description: 'Please sign in again before deleting a draft.',
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/vulnerable-drafts/${draftId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to delete draft')
      }

      if (currentDraftId === draftId) {
        setCurrentDraftId(null)
        setForm(getEmptyForm())
        setStep(0)
        setErrors({})
      }

      toast.success('Draft deleted')
      await loadDrafts()
    } catch (error: any) {
      toast.error('Failed to delete draft', {
        description: error.message || 'Please try again.',
      })
    }
  }

  function clearAndClose() {
    setStep(0)
    setErrors({})
    onClose()
  }

  function validateCurrentStep() {
    const currentStepIssues =
      getRequiredFieldIssues(
        form,
      ).filter(
        (issue) =>
          issue.step === step,
      )

    const nextErrors =
      Object.fromEntries(
        currentStepIssues.map(
          (issue) => [
            issue.key,
            issue.message,
          ],
        ),
      )

    setErrors(nextErrors)

    if (
      currentStepIssues.length > 0
    ) {
      toast.error(
        'Important fields are incomplete',
        {
          description:
            'You may continue now, but these fields must be completed before registration.',
        },
      )

      return false
    }

    return true
  }

  function goNext() {
    setErrors({})
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  function goPrevious() {
    setStep((prev) => Math.max(prev - 1, 0))
  }

  function goToRequiredField(
    issue: RequiredFieldIssue,
  ) {
    setErrors((previous) => ({
      ...previous,
      [issue.key]: issue.message,
    }))
    setStep(issue.step)

    window.setTimeout(() => {
      const modal =
        document.querySelector(
          '[data-registration-modal]',
        )
      const target =
        modal?.querySelector<HTMLElement>(
          `[data-registration-field="${String(
            issue.key,
          )}"]`,
        )

      target?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })

      const control =
        target?.querySelector<HTMLElement>(
          'input:not([type="hidden"]), textarea, button[role="combobox"], button, [tabindex]:not([tabindex="-1"])',
        )

      control?.focus({
        preventScroll: true,
      })
    }, 120)
  }

  function goToFirstMissingRequiredField() {
    const issues =
      getRequiredFieldIssues(form)

    if (issues.length === 0) {
      return true
    }

    setErrors(
      Object.fromEntries(
        issues.map((issue) => [
          issue.key,
          issue.message,
        ]),
      ),
    )

    goToRequiredField(issues[0])

    toast.error(
      'Complete the highlighted field',
      {
        description:
          `${issues[0].label} is the first required field that was skipped.`,
      },
    )

    return false
  }

  async function handleSubmit() {
    if (
      !goToFirstMissingRequiredField()
    ) {
      return
    }

    setSubmitting(true)

    try {
      await onSubmit(form)

      if (currentDraftId) {
        const adminId = getCurrentAdminId()
        await fetch(`/api/admin/vulnerable-drafts/${currentDraftId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminId }),
        }).catch(() => null)
      }

      setForm(getEmptyForm())
      setErrors({})
      setStep(0)
      setCurrentDraftId(null)
      await loadDrafts()
      onClose()
    } catch {
      // handled by caller
    } finally {
      setSubmitting(false)
    }
  }

  function renderPersonalStep() {
    return (
      <>
        <SectionTitle
          title="Personal Information"
          subtitle="Basic identity and contact information."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <InputBlock label="Last Name" field="lastName" required error={errors.lastName}>
            <Input
              value={form.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              placeholder="Enter last name"
              className={cn(errors.lastName && 'border-red-400 focus-visible:ring-red-400')}
            />
          </InputBlock>

          <InputBlock label="First Name" field="firstName" required error={errors.firstName}>
            <Input
              value={form.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              placeholder="Enter first name"
              className={cn(errors.firstName && 'border-red-400 focus-visible:ring-red-400')}
            />
          </InputBlock>

          <InputBlock label="Middle Name">
            <Input
              value={form.middleName}
              onChange={(e) => updateField('middleName', e.target.value)}
              placeholder="Enter middle name"
            />
          </InputBlock>

          <InputBlock label="Suffix">
            <Select value={form.suffix} onValueChange={(value) => updateField('suffix', value)}>
              <SelectTrigger>
                <SelectValue placeholder="e.g., Jr., Sr., III" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="JR">Jr.</SelectItem>
                <SelectItem value="SR">Sr.</SelectItem>
                <SelectItem value="II">II</SelectItem>
                <SelectItem value="III">III</SelectItem>
                <SelectItem value="IV">IV</SelectItem>
              </SelectContent>
            </Select>
          </InputBlock>

          <InputBlock label="Date of Birth" field="dateOfBirth" required error={errors.dateOfBirth}>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
              className={cn(errors.dateOfBirth && 'border-red-400 focus-visible:ring-red-400')}
            />
          </InputBlock>

          <InputBlock label="Gender" field="gender" required error={errors.gender}>
            <Select value={form.gender} onValueChange={(value) => updateField('gender', value)}>
              <SelectTrigger className={cn(errors.gender && 'border-red-400 focus:ring-red-400')}>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
                <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </InputBlock>

          <InputBlock label="Civil Status">
            <Select value={form.civilStatus} onValueChange={(value) => updateField('civilStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select civil status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SINGLE">Single</SelectItem>
                <SelectItem value="MARRIED">Married</SelectItem>
                <SelectItem value="WIDOWED">Widowed</SelectItem>
                <SelectItem value="SEPARATED">Separated</SelectItem>
              </SelectContent>
            </Select>
          </InputBlock>

          <InputBlock label="Mobile Number" field="mobileNumber" required error={errors.mobileNumber}>
            <Input
              value={form.mobileNumber}
              onChange={(e) => updateField('mobileNumber', e.target.value)}
              placeholder="09XXXXXXXXX"
              className={cn(errors.mobileNumber && 'border-red-400 focus-visible:ring-red-400')}
            />
          </InputBlock>

          <InputBlock label="Landline Number">
            <Input
              value={form.landlineNumber}
              onChange={(e) => updateField('landlineNumber', e.target.value)}
              placeholder="Optional"
            />
          </InputBlock>

          <div className="md:col-span-2">
            <InputBlock label="Email Address" field="emailAddress" required error={errors.emailAddress}>
              <Input
                type="email"
                value={form.emailAddress}
                onChange={(e) => updateField('emailAddress', e.target.value)}
                placeholder="Enter email address"
                className={cn(errors.emailAddress && 'border-red-400 focus-visible:ring-red-400')}
              />
            </InputBlock>
          </div>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Residential Address
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <InputBlock label="Map Location Picker">
              <AddressPickerMap
                lat={Number.parseFloat(form.latitude) || 12.1792}
                lng={Number.parseFloat(form.longitude) || 125.5072}
                onSelect={(address) => {
                  updateField('latitude', address.latitude)
                  updateField('longitude', address.longitude)

                  if (address.houseNumber) updateField('houseNumber', address.houseNumber)
                  if (address.street) updateField('street', address.street)
                  if (address.barangay) updateField('barangay', address.barangay)
                  if (address.municipality) updateField('municipality', address.municipality)
                  if (address.province) updateField('province', address.province)
                }}
              />
              <p className="mt-2 text-xs text-slate-500">
                Click the map or drag the marker to verify the location. Only points identified as San Policarpo will update the form. House, street/sitio, and barangay may still be corrected manually.
                Coordinates are saved internally for the vulnerable map but are hidden from the form.
              </p>
            </InputBlock>
          </div>

          <InputBlock label="House Number">
            <Input
              value={form.houseNumber}
              onChange={(e) => updateField('houseNumber', e.target.value)}
              placeholder="Enter house number"
            />
          </InputBlock>

          <InputBlock label="Street / Sitio / Purok">
            <Input
              value={form.street}
              onChange={(e) => updateField('street', e.target.value)}
              placeholder="Enter street, sitio, or purok"
            />
          </InputBlock>

          <InputBlock label="Barangay" field="barangay" required error={errors.barangay}>
            <Select
              value={form.barangay}
              onValueChange={(value) =>
                updateField('barangay', value)
              }
            >
              <SelectTrigger
                className={cn(
                  errors.barangay &&
                    'border-red-400 focus:ring-red-400',
                )}
              >
                <SelectValue placeholder="Select barangay" />
              </SelectTrigger>
              <SelectContent>
                {BARANGAYS.map((barangay) => (
                  <SelectItem
                    key={barangay}
                    value={barangay}
                  >
                    {barangay}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputBlock>

          <InputBlock label="Municipality / City">
            <Input
              value="San Policarpo"
              readOnly
              aria-readonly="true"
              className="bg-slate-50 text-slate-700"
            />
          </InputBlock>

          <InputBlock label="Province">
            <Input
              value="Eastern Samar"
              readOnly
              aria-readonly="true"
              className="bg-slate-50 text-slate-700"
            />
          </InputBlock>
        </div>
      </>
    )
  }

  function renderMedicalStep() {
    return (
      <>
        <SectionTitle
          title="Medical & Assistance"
          subtitle="Capture vulnerability, health, and support requirements."
        />

        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-emerald-950">Government registry basis</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                Classify the person using the appropriate Philippine government registry path: DSWD/NAPC welfare and poverty support, NCSC/OSCA senior citizen support, NCDA/DOH PWD support, or PSA civil registry reference.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InputBlock label="Registry Category" field="registryCategory" required error={errors.registryCategory}>
                <Select
                  value={form.registryCategory}
                  onValueChange={(value) => {
                    updateField('registryCategory', value)
                    if (value === 'GENERAL_WELFARE') updateField('governmentAgency', 'DSWD / NAPC')
                    if (value === 'SENIOR_CITIZEN') updateField('governmentAgency', 'NCSC / OSCA')
                    if (value === 'PWD') updateField('governmentAgency', 'NCDA / DOH')
                    if (value === 'CIVIL_REGISTRY') updateField('governmentAgency', 'PSA')
                  }}
                >
                  <SelectTrigger className={cn(errors.registryCategory && 'border-red-400 focus:ring-red-400')}>
                    <SelectValue placeholder="Select government basis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL_WELFARE">General Welfare & Poverty — DSWD / NAPC</SelectItem>
                    <SelectItem value="SENIOR_CITIZEN">Senior Citizen — NCSC / OSCA</SelectItem>
                    <SelectItem value="PWD">Person with Disability — NCDA / DOH</SelectItem>
                    <SelectItem value="CIVIL_REGISTRY">Civil Registry Reference — PSA</SelectItem>
                  </SelectContent>
                </Select>
              </InputBlock>

                  <InputBlock label="Primary Agency">
                <Input
                  value={form.governmentAgency}
                  readOnly
                  aria-readonly="true"
                  placeholder="Select a registry category first"
                  className="bg-slate-50 text-slate-700"
                />
              </InputBlock>

              <InputBlock label="Program / Registry Name">
                <Input
                  value={form.governmentProgram}
                  onChange={(e) => updateField('governmentProgram', e.target.value)}
                  placeholder="e.g. Listahanan, OSCA, PWD Registry, PSA"
                />
              </InputBlock>

                  <InputBlock label="Poverty / Welfare Status" field="povertyStatus" required={form.registryCategory === 'GENERAL_WELFARE'} error={errors.povertyStatus}>
                <Select
                  value={form.povertyStatus}
                  onValueChange={(value) =>
                    updateField('povertyStatus', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select welfare status" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.povertyStatus &&
                    !POVERTY_STATUS_OPTIONS.includes(
                      form.povertyStatus,
                    ) ? (
                      <SelectItem value={form.povertyStatus}>
                        {form.povertyStatus} (saved value)
                      </SelectItem>
                    ) : null}
                    {POVERTY_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InputBlock>

              <InputBlock label="Senior Citizen ID / NCSC Ref.">
                <Input
                  value={form.seniorCitizenId}
                  onChange={(e) => updateField('seniorCitizenId', e.target.value)}
                  placeholder="Optional"
                />
              </InputBlock>

              <InputBlock label="OSCA ID">
                <Input
                  value={form.oscaId}
                  onChange={(e) => updateField('oscaId', e.target.value)}
                  placeholder="Optional"
                />
              </InputBlock>

              <InputBlock label="PWD ID / Registry Number">
                <Input
                  value={form.pwdIdNumber}
                  onChange={(e) => updateField('pwdIdNumber', e.target.value)}
                  placeholder="Optional"
                />
              </InputBlock>

              <InputBlock label="PSA Birth / Civil Registry Reference">
                <Input
                  value={form.psaReferenceNumber}
                  onChange={(e) => updateField('psaReferenceNumber', e.target.value)}
                  placeholder="Optional"
                />
              </InputBlock>

                  <InputBlock label="Civil Registry Status" field="civilRegistryStatus" required={form.registryCategory === 'CIVIL_REGISTRY'} error={errors.civilRegistryStatus}>
                <Select
                  value={form.civilRegistryStatus}
                  onValueChange={(value) =>
                    updateField('civilRegistryStatus', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select registry status" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.civilRegistryStatus &&
                    !CIVIL_REGISTRY_STATUS_OPTIONS.includes(
                      form.civilRegistryStatus,
                    ) ? (
                      <SelectItem value={form.civilRegistryStatus}>
                        {form.civilRegistryStatus} (saved value)
                      </SelectItem>
                    ) : null}
                    {CIVIL_REGISTRY_STATUS_OPTIONS.map(
                      (option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </InputBlock>

              <div
                data-registration-field="consentToValidateInfo"
                className={cn(
                  'flex items-start gap-3 rounded-xl border bg-white p-3 md:col-span-2',
                  errors.consentToValidateInfo
                    ? 'border-red-300 bg-red-50 ring-1 ring-red-200'
                    : 'border-emerald-100',
                )}
              >
                <input
                  type="checkbox"
                  checked={form.consentToValidateInfo}
                  onChange={(e) => updateField('consentToValidateInfo', e.target.checked)}
                  className="mt-1 h-4 w-4 accent-emerald-600"
                />
                <div>
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      errors.consentToValidateInfo
                        ? 'text-red-800'
                        : 'text-slate-900',
                    )}
                  >
                    Consent to validate information
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Required before final submission. This confirms the information may be checked against LGU and relevant government registry records.
                  </p>
                  {errors.consentToValidateInfo ? <p className="mt-1 text-xs text-red-500">{errors.consentToValidateInfo}</p> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Has Disability</p>
                <p className="text-xs text-slate-500">Enable if the citizen has a registered or known disability.</p>
              </div>
              <input
                type="checkbox"
                checked={form.hasDisability}
                onChange={(e) => updateField('hasDisability', e.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
            </div>

            {form.hasDisability ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <InputBlock label="Disability Type" field="disabilityType" required={form.registryCategory === 'PWD' || form.hasDisability} error={errors.disabilityType}>
                  <Select
                    value={form.disabilityType}
                    onValueChange={(value) =>
                      updateField('disabilityType', value)
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        errors.disabilityType &&
                          'border-red-400 focus:ring-red-400',
                      )}
                    >
                      <SelectValue placeholder="Select primary disability type" />
                    </SelectTrigger>
                    <SelectContent>
                      {form.disabilityType &&
                      !DISABILITY_TYPE_OPTIONS.includes(
                        form.disabilityType,
                      ) ? (
                        <SelectItem value={form.disabilityType}>
                          {form.disabilityType} (saved value)
                        </SelectItem>
                      ) : null}
                      {DISABILITY_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </InputBlock>

                      <InputBlock label="Disability Severity" field="disabilitySeverity" required={form.hasDisability} error={errors.disabilitySeverity}>
                  <Select
                    value={form.disabilitySeverity}
                    onValueChange={(value) =>
                      updateField('disabilitySeverity', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {form.disabilitySeverity &&
                      !DISABILITY_SEVERITY_OPTIONS.includes(
                        form.disabilitySeverity,
                      ) ? (
                        <SelectItem value={form.disabilitySeverity}>
                          {form.disabilitySeverity} (saved value)
                        </SelectItem>
                      ) : null}
                      {DISABILITY_SEVERITY_OPTIONS.map(
                        (option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </InputBlock>

                      <InputBlock label="Disability Cause">
                  <Select
                    value={form.disabilityCause}
                    onValueChange={(value) =>
                      updateField('disabilityCause', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cause" />
                    </SelectTrigger>
                    <SelectContent>
                      {form.disabilityCause &&
                      !DISABILITY_CAUSE_OPTIONS.includes(
                        form.disabilityCause,
                      ) ? (
                        <SelectItem value={form.disabilityCause}>
                          {form.disabilityCause} (saved value)
                        </SelectItem>
                      ) : null}
                      {DISABILITY_CAUSE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </InputBlock>

                <InputBlock label="Medical Certificate Number">
                  <Input
                    value={form.medicalCertificateNumber}
                    onChange={(e) => updateField('medicalCertificateNumber', e.target.value)}
                    placeholder="Certificate number"
                  />
                </InputBlock>

                <InputBlock label="Medical Certificate Date">
                  <Input
                    type="date"
                    value={form.medicalCertificateDate}
                    onChange={(e) => updateField('medicalCertificateDate', e.target.value)}
                  />
                </InputBlock>

                <div className="flex items-center gap-3 pt-7">
                  <input
                    type="checkbox"
                    checked={form.hasPhysicalEvidence}
                    onChange={(e) => updateField('hasPhysicalEvidence', e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="text-sm text-slate-700">Has physical evidence / supporting proof</span>
                </div>

                <div className="md:col-span-2">
                  <InputBlock label="Disability Details">
                    <Textarea
                      value={form.disabilityDetails}
                      onChange={(e) => updateField('disabilityDetails', e.target.value)}
                      placeholder="Additional details about the disability"
                      rows={4}
                    />
                  </InputBlock>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Has Medical Condition</p>
                <p className="text-xs text-slate-500">Enable if the citizen has medical conditions requiring attention.</p>
              </div>
              <input
                type="checkbox"
                checked={form.hasMedicalCondition}
                onChange={(e) => updateField('hasMedicalCondition', e.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
            </div>

            {form.hasMedicalCondition ? (
              <div className="mt-4">
                <InputBlock label="Medical Conditions" field="medicalConditions" required={form.hasMedicalCondition} error={errors.medicalConditions}>
                  <Textarea
                    value={form.medicalConditions}
                    onChange={(e) => updateField('medicalConditions', e.target.value)}
                    placeholder="List medical conditions"
                    rows={4}
                  />
                </InputBlock>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Needs Assistance</p>
                <p className="text-xs text-slate-500">Enable if the citizen currently needs relief or direct support.</p>
              </div>
              <input
                type="checkbox"
                checked={form.needsAssistance}
                onChange={(e) => updateField('needsAssistance', e.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
            </div>

            {form.needsAssistance ? (
              <div className="mt-4">
                <InputBlock label="Assistance Type" field="assistanceType" required={form.needsAssistance} error={errors.assistanceType}>
                  <Textarea
                    value={form.assistanceType}
                    onChange={(e) => updateField('assistanceType', e.target.value)}
                    placeholder="e.g. Food packs, medicine, wheelchair, financial support"
                    rows={3}
                    className={cn(errors.assistanceType && 'border-red-400 focus-visible:ring-red-400')}
                  />
                </InputBlock>
              </div>
            ) : null}
          </div>
        </div>
      </>
    )
  }

  function renderAdministrativeStep() {
    return (
      <>
        <SectionTitle
          title="Administrative Details"
          subtitle="Additional family, emergency, and administrative information."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <InputBlock label="Blood Type">
            <Select
              value={form.bloodType}
              onValueChange={(value) =>
                updateField('bloodType', value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select blood type" />
              </SelectTrigger>
              <SelectContent>
                {form.bloodType &&
                !BLOOD_TYPE_OPTIONS.includes(form.bloodType) ? (
                  <SelectItem value={form.bloodType}>
                    {form.bloodType} (saved value)
                  </SelectItem>
                ) : null}
                {BLOOD_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputBlock>

          <InputBlock label="Educational Attainment">
            <Select
              value={form.educationalAttainment}
              onValueChange={(value) =>
                updateField('educationalAttainment', value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select highest completed level" />
              </SelectTrigger>
              <SelectContent>
                {form.educationalAttainment &&
                !EDUCATIONAL_ATTAINMENT_OPTIONS.includes(
                  form.educationalAttainment,
                ) ? (
                  <SelectItem value={form.educationalAttainment}>
                    {form.educationalAttainment} (saved value)
                  </SelectItem>
                ) : null}
                {EDUCATIONAL_ATTAINMENT_OPTIONS.map(
                  (option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </InputBlock>

          <InputBlock label="School Name">
            <Input
              value={form.schoolName}
              onChange={(e) => updateField('schoolName', e.target.value)}
              placeholder="If applicable"
            />
          </InputBlock>

          <InputBlock label="Employment Status">
            <Select
              value={form.employmentStatus}
              onValueChange={(value) =>
                updateField('employmentStatus', value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employment status" />
              </SelectTrigger>
              <SelectContent>
                {form.employmentStatus &&
                !EMPLOYMENT_STATUS_OPTIONS.includes(
                  form.employmentStatus,
                ) ? (
                  <SelectItem value={form.employmentStatus}>
                    {form.employmentStatus} (saved value)
                  </SelectItem>
                ) : null}
                {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputBlock>

          <InputBlock label="Employment Details">
            <Input
              value={form.employmentDetails}
              onChange={(e) => updateField('employmentDetails', e.target.value)}
              placeholder="Employment details"
            />
          </InputBlock>

          <InputBlock label="Employer Name">
            <Input
              value={form.employerName}
              onChange={(e) => updateField('employerName', e.target.value)}
              placeholder="Employer name"
            />
          </InputBlock>

          <InputBlock label="Guardian Name">
            <Input
              value={form.guardianName}
              onChange={(e) => updateField('guardianName', e.target.value)}
              placeholder="Guardian or representative"
            />
          </InputBlock>

          <InputBlock label="Guardian Relationship">
            <Select
              value={form.guardianRelationship}
              onValueChange={(value) =>
                updateField('guardianRelationship', value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {form.guardianRelationship &&
                !GUARDIAN_RELATIONSHIP_OPTIONS.includes(
                  form.guardianRelationship,
                ) ? (
                  <SelectItem value={form.guardianRelationship}>
                    {form.guardianRelationship} (saved value)
                  </SelectItem>
                ) : null}
                {GUARDIAN_RELATIONSHIP_OPTIONS.map(
                  (option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </InputBlock>

          <InputBlock label="Guardian Contact">
            <Input
              value={form.guardianContact}
              onChange={(e) => updateField('guardianContact', e.target.value)}
              placeholder="Guardian contact number"
            />
          </InputBlock>

          <InputBlock label="Guardian Address">
            <Input
              value={form.guardianAddress}
              onChange={(e) => updateField('guardianAddress', e.target.value)}
              placeholder="Guardian address or email"
            />
          </InputBlock>

          <InputBlock label="PhilHealth Number">
            <Input
              value={form.philHealthNumber}
              onChange={(e) => updateField('philHealthNumber', e.target.value)}
              placeholder="PhilHealth number"
            />
          </InputBlock>

          <InputBlock label="SSS Number">
            <Input
              value={form.sssNumber}
              onChange={(e) => updateField('sssNumber', e.target.value)}
              placeholder="SSS number"
            />
          </InputBlock>

          <InputBlock label="GSIS Number">
            <Input
              value={form.gsisNumber}
              onChange={(e) => updateField('gsisNumber', e.target.value)}
              placeholder="GSIS number"
            />
          </InputBlock>

          <InputBlock label="Other ID Numbers">
            <Input
              value={form.otherIdNumbers}
              onChange={(e) => updateField('otherIdNumbers', e.target.value)}
              placeholder="Other government IDs"
            />
          </InputBlock>

          <InputBlock label="Emergency Contact" field="emergencyContact" required error={errors.emergencyContact}>
            <Input
              value={form.emergencyContact}
              onChange={(e) => updateField('emergencyContact', e.target.value)}
              placeholder="Emergency contact person"
              className={cn(errors.emergencyContact && 'border-red-400 focus-visible:ring-red-400')}
            />
          </InputBlock>

          <InputBlock label="Emergency Phone" field="emergencyPhone" required error={errors.emergencyPhone}>
            <Input
              value={form.emergencyPhone}
              onChange={(e) => updateField('emergencyPhone', e.target.value)}
              placeholder="Emergency contact number"
              className={cn(errors.emergencyPhone && 'border-red-400 focus-visible:ring-red-400')}
            />
          </InputBlock>
        </div>
      </>
    )
  }

  function renderDocumentsStep() {
    return (
      <>
        <SectionTitle
          title="Documents"
          subtitle="Attach available supporting documents. These are optional in the current API flow."
        />

        <div className="space-y-4">
          <UploadCard
            title="PWD Registration Form"
            checked={form.hasPWDRegistrationForm}
            onCheck={(value) => updateField('hasPWDRegistrationForm', value)}
            fileLabel={fileNameOf(form.pwdRegistrationForm)}
            onFile={(file) => updateField('pwdRegistrationForm', file)}
          />

          <UploadCard
            title="Medical Certificate"
            checked={form.hasMedicalCertificate}
            onCheck={(value) => updateField('hasMedicalCertificate', value)}
            fileLabel={fileNameOf(form.medicalCertificate)}
            onFile={(file) => updateField('medicalCertificate', file)}
          />

          <UploadCard
            title="Proof of Identity"
            checked={form.hasProofOfIdentity}
            onCheck={(value) => updateField('hasProofOfIdentity', value)}
            fileLabel={fileNameOf(form.proofOfIdentity)}
            onFile={(file) => updateField('proofOfIdentity', file)}
          />

          <UploadCard
            title="Proof of Residence"
            checked={form.hasProofOfResidence}
            onCheck={(value) => updateField('hasProofOfResidence', value)}
            fileLabel={fileNameOf(form.proofOfResidence)}
            onFile={(file) => updateField('proofOfResidence', file)}
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">ID Photos</p>
                <p className="text-xs text-slate-500">Attach one or more ID photos if available.</p>
              </div>
              <input
                type="checkbox"
                checked={form.hasIDPhotos}
                onChange={(e) => updateField('hasIDPhotos', e.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
            </div>

            {form.hasIDPhotos ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4">
                <div className="flex items-center gap-3" data-no-drag="true">
                  <UploadCloud className="h-5 w-5 text-slate-500" />
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => updateField('idPhotos', e.target.files)}
                    className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {fileListNameOf(form.idPhotos)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </>
    )
  }

  function renderReviewStep() {
    return (
      <>
        <SectionTitle
          title="Review & Submit"
          subtitle="Review the details before creating the vulnerable citizen profile."
        />

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Ready for registration
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                The system will create the user account, auto-approve the vulnerable profile,
                and send the generated credentials to the citizen&apos;s email address.
              </p>
            </div>
          </div>
        </div>

        <div className={cn(
          'mt-5 rounded-2xl border p-4',
          canSubmit ? 'border-emerald-100 bg-emerald-50' : 'border-amber-200 bg-amber-50'
        )}>
          <div className="flex items-start gap-3">
            {canSubmit ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
            )}
            <div>
              <p className={cn('text-sm font-semibold', canSubmit ? 'text-emerald-900' : 'text-amber-900')}>
                {canSubmit ? 'Required details complete' : 'Submit is locked until important details are complete'}
              </p>
              {canSubmit ? (
                <p className="mt-1 text-sm text-emerald-800">
                  The confirm button is enabled. Review the profile card below before submitting.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {requiredFieldIssues.map((issue) => (
                    <button
                      key={String(issue.key)}
                      type="button"
                      onClick={() =>
                        goToRequiredField(issue)
                      }
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100 hover:ring-amber-300"
                      title={`Go to ${issue.label}`}
                    >
                      {issue.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5">
          <ReviewSection title="Personal">
            <div className="grid gap-3 md:grid-cols-2">
              <ReviewItem label="Full Name" value={`${form.firstName} ${form.middleName} ${form.lastName} ${form.suffix}`.replace(/\s+/g, ' ').trim()} />
              <ReviewItem label="Email Address" value={form.emailAddress} />
              <ReviewItem label="Mobile Number" value={form.mobileNumber} />
              <ReviewItem label="Date of Birth" value={form.dateOfBirth} />
              <ReviewItem label="Gender" value={form.gender} />
              <ReviewItem label="Civil Status" value={form.civilStatus} />
              <ReviewItem
                label="Address"
                value={`${form.houseNumber} ${form.street}, ${form.barangay}, ${form.municipality}, ${form.province}`.replace(/\s+/g, ' ').trim()}
              />
              <ReviewItem label="Mapped Location" value={form.latitude && form.longitude ? 'Selected on map' : 'Not selected'} />
            </div>
          </ReviewSection>

          <ReviewSection title="Government Registry Basis">
            <div className="grid gap-3 md:grid-cols-2">
              <ReviewItem label="Registry Category" value={form.registryCategory} />
              <ReviewItem label="Primary Agency" value={form.governmentAgency} />
              <ReviewItem label="Program / Registry" value={form.governmentProgram} />
              <ReviewItem label="Poverty / Welfare Status" value={form.povertyStatus} />
              <ReviewItem label="Senior Citizen ID" value={form.seniorCitizenId} />
              <ReviewItem label="OSCA ID" value={form.oscaId} />
              <ReviewItem label="PWD ID / Registry Number" value={form.pwdIdNumber} />
              <ReviewItem label="PSA Reference" value={form.psaReferenceNumber} />
              <ReviewItem label="Civil Registry Status" value={form.civilRegistryStatus} />
              <ReviewItem label="Consent to Validate" value={formatBoolean(form.consentToValidateInfo)} />
            </div>
          </ReviewSection>

          <ReviewSection title="Medical & Assistance">
            <div className="grid gap-3 md:grid-cols-2">
              <ReviewItem label="Has Disability" value={formatBoolean(form.hasDisability)} />
              <ReviewItem label="Disability Type" value={form.disabilityType} />
              <ReviewItem label="Has Medical Condition" value={formatBoolean(form.hasMedicalCondition)} />
              <ReviewItem label="Medical Conditions" value={form.medicalConditions} />
              <ReviewItem label="Needs Assistance" value={formatBoolean(form.needsAssistance)} />
              <ReviewItem label="Assistance Type" value={form.assistanceType} />
            </div>
          </ReviewSection>

          <ReviewSection title="Administrative">
            <div className="grid gap-3 md:grid-cols-2">
              <ReviewItem label="Guardian Name" value={form.guardianName} />
              <ReviewItem label="Guardian Contact" value={form.guardianContact} />
              <ReviewItem label="Emergency Contact" value={form.emergencyContact} />
              <ReviewItem label="Emergency Phone" value={form.emergencyPhone} />
              <ReviewItem label="Employment Status" value={form.employmentStatus} />
              <ReviewItem label="Educational Attainment" value={form.educationalAttainment} />
            </div>
          </ReviewSection>

          <ReviewSection title="Documents">
            <div className="grid gap-3 md:grid-cols-2">
              <ReviewItem label="PWD Registration Form" value={form.hasPWDRegistrationForm ? fileNameOf(form.pwdRegistrationForm) : 'Not attached'} />
              <ReviewItem label="Medical Certificate" value={form.hasMedicalCertificate ? fileNameOf(form.medicalCertificate) : 'Not attached'} />
              <ReviewItem label="Proof of Identity" value={form.hasProofOfIdentity ? fileNameOf(form.proofOfIdentity) : 'Not attached'} />
              <ReviewItem label="Proof of Residence" value={form.hasProofOfResidence ? fileNameOf(form.proofOfResidence) : 'Not attached'} />
              <ReviewItem label="ID Photos" value={form.hasIDPhotos ? fileListNameOf(form.idPhotos) : 'Not attached'} />
            </div>
          </ReviewSection>
        </div>
      </>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && clearAndClose()}>
      <DialogContent
        data-registration-modal
        className="!fixed !translate-x-0 !translate-y-0 !max-w-none overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-[0.9375rem] text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.22)] [color-scheme:light] [&>button]:hidden [&_input]:text-sm [&_textarea]:text-sm [&_[role=combobox]]:text-sm md:rounded-[28px]"
        style={modalFrameStyle}
      >
        <DialogTitle className="sr-only">
          Register Vulnerable Person
        </DialogTitle>

        {/* Window-style resize handles */}
        <div className="hidden md:block absolute left-8 right-8 top-0 z-[70] h-2 cursor-ns-resize" onMouseDown={(event) => startModalResize(event, 'top')} />
        <div className="hidden md:block absolute bottom-0 left-8 right-8 z-[70] h-2 cursor-ns-resize" onMouseDown={(event) => startModalResize(event, 'bottom')} />
        <div className="hidden md:block absolute bottom-8 left-0 top-8 z-[70] w-2 cursor-ew-resize" onMouseDown={(event) => startModalResize(event, 'left')} />
        <div className="hidden md:block absolute bottom-8 right-0 top-8 z-[70] w-2 cursor-ew-resize" onMouseDown={(event) => startModalResize(event, 'right')} />
        <div className="hidden md:block absolute left-0 top-0 z-[70] h-5 w-5 cursor-nwse-resize" onMouseDown={(event) => startModalResize(event, 'top-left')} />
        <div className="hidden md:block absolute right-0 top-0 z-[70] h-5 w-5 cursor-nesw-resize" onMouseDown={(event) => startModalResize(event, 'top-right')} />
        <div className="hidden md:block absolute bottom-0 left-0 z-[70] h-5 w-5 cursor-nesw-resize" onMouseDown={(event) => startModalResize(event, 'bottom-left')} />
        <div className="hidden md:block absolute bottom-0 right-0 z-[70] h-5 w-5 cursor-nwse-resize" onMouseDown={(event) => startModalResize(event, 'bottom-right')} />

        <div className="flex h-full min-h-0 flex-col">
          {/* Header */}
          <div className="shrink-0 cursor-default border-b border-slate-200 bg-white px-4 py-3 md:cursor-move md:px-6 md:py-5" onMouseDown={startModalDrag}>
            <div className="grid items-start gap-3 md:gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,320px)_auto]">
              <div className="flex min-w-0 items-start gap-3 md:gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600 md:h-16 md:w-16">
                  <ShieldPlus className="h-6 w-6 md:h-8 md:w-8" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-bold leading-tight tracking-tight text-slate-950 sm:text-2xl xl:text-[2rem]">
                    Register Vulnerable Person
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Create a verified citizen profile for relief and assistance tracking.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm sm:px-4 sm:py-3" data-no-drag="true">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Progress
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Required completion status
                    </p>
                  </div>
                  <p className="text-xl font-bold text-slate-950 sm:text-2xl">
                    {Math.min(completedSteps, 5)}/5
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(Math.min(completedSteps, 5) / 5) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3" data-no-drag="true">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:px-3 sm:text-sm">
                  Step {step + 1} of {STEPS.length}
                </span>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 sm:px-3 sm:text-sm">
                  Drafts {drafts.length}
                </span>

                <button
                  type="button"
                  onClick={clearAndClose}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 md:mt-5 md:h-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                style={{ width: progressWidth }}
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Left rail */}
            <aside className="hidden w-[380px] shrink-0 border-r border-slate-200 bg-slate-50/80 lg:block">
              <div className="flex h-full min-h-0 flex-col px-5 py-5">
                <div className="shrink-0 space-y-2">
                  {STEPS.map((item, index) => {
                    const Icon = item.icon
                    const isActive = index === step
                    const isDone = index < step

                    return (
                      <div key={item.key} className="relative">
                        {index < STEPS.length - 1 ? (
                          <div className="absolute left-[18px] top-10 h-[36px] w-px bg-slate-200" />
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setStep(index)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition',
                            isActive
                              ? 'border-emerald-100 bg-emerald-50'
                              : isDone
                                ? 'border-slate-200 bg-white hover:bg-slate-50'
                                : 'border-transparent bg-transparent hover:bg-white/70'
                          )}
                        >
                          <div
                            className={cn(
                              'grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-semibold',
                              isActive
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : isDone
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-300 bg-white text-slate-500'
                            )}
                          >
                            {isDone ? <Check className="h-4 w-4" /> : index + 1}
                          </div>

                          <div className="min-w-0">
                            <p className={cn('text-sm font-medium', isActive ? 'text-emerald-800' : 'text-slate-700')}>
                              {item.short}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">{item.title}</p>
                          </div>

                          <Icon className="ml-auto h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-hidden pr-1">
                  <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Saved Drafts
                          </p>
                          <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-bold text-emerald-700">
                            {drafts.length} total
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {drafts.length === 1 ? '1 draft saved by this admin.' : `${drafts.length} drafts saved by this admin.`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={loadDrafts}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Refresh drafts"
                      >
                        <RefreshCcw className={cn('h-4 w-4', loadingDrafts && 'animate-spin')} />
                      </button>
                    </div>

                    {drafts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                        No saved drafts yet.
                      </div>
                    ) : (
                      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                        {drafts.map((draft, index) => (
                          <div
                            key={draft.id}
                            className={cn(
                              'rounded-xl border p-3 transition',
                              currentDraftId === draft.id
                                ? 'border-emerald-200 bg-emerald-50'
                                : 'border-slate-200 bg-slate-50 hover:bg-white'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => resumeDraft(draft)}
                              className="block w-full text-left"
                            >
                              <div className="flex items-start gap-2">
                                <FileClock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-slate-900">
                                    #{index + 1} · {draft.title}
                                  </p>
                                  <p className="mt-0.5 text-[0.6875rem] text-slate-500">
                                    Saved {formatDraftTimestamp(draft.updatedAt)}
                                  </p>
                                </div>
                              </div>
                            </button>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => resumeDraft(draft)}
                                className="text-[0.6875rem] font-semibold text-emerald-700 hover:text-emerald-800"
                              >
                                Resume
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteDraft(draft.id)}
                                className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* Main form */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-white">
              <div className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                {step === 0 && renderPersonalStep()}
                {step === 1 && renderMedicalStep()}
                {step === 2 && renderAdministrativeStep()}
                {step === 3 && renderDocumentsStep()}
                {step === 4 && renderReviewStep()}

                {Object.keys(errors).length > 0 ? (
                  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">
                          Missing required fields
                        </p>
                        <p className="mt-1 text-sm text-red-700">
                          Please complete the highlighted fields before continuing.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 min-w-10 px-3 sm:min-w-[124px]"
                onClick={step === 0 ? clearAndClose : goPrevious}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">
                  {step === 0 ? 'Cancel' : 'Previous'}
                </span>
              </Button>

              <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 min-w-10 px-3 sm:min-w-[150px]"
                  onClick={saveDraft}
                  disabled={savingDraft}
                >
                  <Save className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">
                    {savingDraft
                      ? 'Saving...'
                      : currentDraftId
                        ? 'Update Draft'
                        : 'Save Draft'}
                  </span>
                </Button>

                {step < STEPS.length - 1 ? (
                  <Button
                    type="button"
                    className="h-10 min-w-[128px] bg-emerald-600 px-4 hover:bg-emerald-700 sm:min-w-[156px]"
                    onClick={goNext}
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className={cn(
                      'h-10 min-w-[152px] px-3 sm:min-w-[176px]',
                      canSubmit
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    )}
                    onClick={canSubmit ? handleSubmit : goToFirstMissingRequiredField}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : canSubmit ? 'Confirm Registration' : 'Complete Required Fields'}
                    {!submitting ? <CheckCircle2 className="ml-2 h-4 w-4" /> : null}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function UploadCard({
  title,
  checked,
  onCheck,
  fileLabel,
  onFile,
}: {
  title: string
  checked: boolean
  onCheck: (value: boolean) => void
  fileLabel: string
  onFile: (file: File | null) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">Attach the file if available.</p>
        </div>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
          className="mt-1 h-4 w-4 accent-emerald-600"
        />
      </div>

      {checked ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4">
          <div className="flex items-center gap-3">
            <UploadCloud className="h-5 w-5 text-slate-500" />
            <input
              type="file"
              onChange={(e) => onFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{fileLabel}</p>
        </div>
      ) : null}
    </div>
  )
}

function ReviewSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-6 w-1.5 rounded-full bg-emerald-500" />
        <h4 className="text-base font-semibold text-slate-950">{title}</h4>
      </div>
      {children}
    </section>
  )
}