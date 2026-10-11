'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { SmartEditableSelect } from '@/components/ui/smart-editable-select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useIsMobile } from '@/hooks/use-mobile'
import { useLookupOptions } from '@/hooks/use-lookup-options'
import { SAN_POLICARPO_BARANGAYS } from '@/lib/san-policarpo-geography'
import { apiFetch } from '@/lib/api-client'

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

type RegistrationConfirmAction =
  | { kind: 'close' }
  | { kind: 'save-draft' }
  | { kind: 'resume-draft'; draft: SavedDraft }
  | { kind: 'delete-draft'; draft: SavedDraft }
  | { kind: 'submit' }
  | null

type DuplicateConflict = {
  type: 'EMAIL' | 'MOBILE' | 'IDENTITY' | 'PWD_ID'
  field: 'emailAddress' | 'mobileNumber' | 'identity' | 'pwdIdNumber'
  label: string
  value?: string | null
  message: string
  existingUserId?: string | null
  existingProfileId?: string | null
  existingRegistrationStatus?: string | null
}

type DuplicateCheckResponse = {
  success: boolean
  hasDuplicate: boolean
  conflicts: DuplicateConflict[]
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

const ASSISTANCE_TYPE_OPTIONS: string[] = [
  'Food assistance',
  'Medical assistance',
  'Financial assistance',
  'Shelter assistance',
  'Mobility / assistive device',
  'Transportation assistance',
  'Educational assistance',
  'Livelihood assistance',
  'Other assistance',
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

  if (!form.civilStatus.trim()) {
    addIssue(
      'civilStatus',
      'Civil status',
      0,
      'Civil status is required.',
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
  userRole = 'admin',
}: VulnerableRegistrationModalProps) {
  const isMobile = useIsMobile()
  const normalizedRole = String(userRole || 'admin').trim().toLowerCase()
  const isWorker = normalizedRole === 'worker'
  const draftBasePath = isWorker
    ? '/api/worker/vulnerable-drafts'
    : '/api/admin/vulnerable-drafts'
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(getEmptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [duplicateNotice, setDuplicateNotice] =
    useState<DuplicateCheckResponse | null>(null)
  const submitLockRef = useRef(false)
  const [drafts, setDrafts] = useState<SavedDraft[]>([])
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [confirmAction, setConfirmAction] = useState<RegistrationConfirmAction>(null)
  const [successfulRegistration, setSuccessfulRegistration] = useState<{
    name: string
    status: 'APPROVED' | 'PENDING'
  } | null>(null)
  const [modalFrame, setModalFrame] = useState<ModalFrame | null>(null)
  const bloodTypeOptions = useLookupOptions('BLOOD_TYPE', BLOOD_TYPE_OPTIONS)
  const educationalAttainmentOptions = useLookupOptions(
    'EDUCATIONAL_ATTAINMENT',
    EDUCATIONAL_ATTAINMENT_OPTIONS,
  )
  const employmentStatusOptions = useLookupOptions(
    'EMPLOYMENT_STATUS',
    EMPLOYMENT_STATUS_OPTIONS,
  )
  const guardianRelationshipOptions = useLookupOptions(
    'GUARDIAN_RELATIONSHIP',
    GUARDIAN_RELATIONSHIP_OPTIONS,
  )
  const povertyStatusOptions = useLookupOptions(
    'POVERTY_STATUS',
    POVERTY_STATUS_OPTIONS,
  )
  const civilRegistryStatusOptions = useLookupOptions(
    'CIVIL_REGISTRY_STATUS',
    CIVIL_REGISTRY_STATUS_OPTIONS,
  )
  const disabilityTypeOptions = useLookupOptions(
    'DISABILITY_TYPE',
    DISABILITY_TYPE_OPTIONS,
  )
  const disabilitySeverityOptions = useLookupOptions(
    'DISABILITY_SEVERITY',
    DISABILITY_SEVERITY_OPTIONS,
  )
  const disabilityCauseOptions = useLookupOptions(
    'DISABILITY_CAUSE',
    DISABILITY_CAUSE_OPTIONS,
  )
  const assistanceTypeOptions = useLookupOptions(
    'ASSISTANCE_TYPE',
    ASSISTANCE_TYPE_OPTIONS,
  )

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
    const currentUserId = getCurrentAdminId()

    if (!currentUserId) {
      setDrafts([])
      return
    }

    setLoadingDrafts(true)

    try {
      const queryKey = isWorker ? 'workerId' : 'adminId'
      const data = await apiFetch<any>(
        `${draftBasePath}?${queryKey}=${encodeURIComponent(currentUserId)}`,
        { cache: 'no-store' },
      )

      if (!data?.success) {
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
  }, [draftBasePath, isWorker])

  useEffect(() => {
    if (!open) return

    setModalFrame(
      isMobile
        ? null
        : getCenteredModalFrame(),
    )
    submitLockRef.current = false
    setSubmitting(false)
    setCheckingDuplicates(false)
    setDuplicateNotice(null)
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

  async function performSaveDraft() {
    const currentUserId = getCurrentAdminId()

    if (!currentUserId) {
      toast.error('User session missing', {
        description: 'Please sign in again before saving a draft.',
      })
      return
    }

    setSavingDraft(true)

    try {
      const ownerField = isWorker
        ? { workerId: currentUserId }
        : { adminId: currentUserId }

      const data = await apiFetch<any>(draftBasePath, {
        method: 'POST',
        body: JSON.stringify({
          ...ownerField,
          draftId: currentDraftId,
          title: createDraftTitle(form),
          currentStep: step,
          formData: getSerializableForm(form),
        }),
      })

      if (!data?.success) {
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

  function performResumeDraft(draft: SavedDraft) {
    setForm(normalizeDraftForm(draft.formData || {}))
    setCurrentDraftId(draft.id)
    setStep(Math.min(Math.max(draft.currentStep || 0, 0), STEPS.length - 1))
    setErrors({})

    toast.success('Draft loaded', {
      description: draft.title,
    })
  }

  async function performDeleteDraft(draftId: string) {
    const currentUserId = getCurrentAdminId()

    if (!currentUserId) {
      toast.error('User session missing', {
        description: 'Please sign in again before deleting a draft.',
      })
      return
    }

    try {
      const ownerField = isWorker
        ? { workerId: currentUserId }
        : { adminId: currentUserId }

      const data = await apiFetch<any>(`${draftBasePath}/${draftId}`, {
        method: 'DELETE',
        body: JSON.stringify(ownerField),
      })

      if (!data?.success) {
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

  function closeImmediately() {
    setStep(0)
    setErrors({})
    onClose()
  }

  function requestClose() {
    setConfirmAction({ kind: 'close' })
  }

  function requestSaveDraft() {
    setConfirmAction({ kind: 'save-draft' })
  }

  function requestResumeDraft(draft: SavedDraft) {
    setConfirmAction({
      kind: 'resume-draft',
      draft,
    })
  }

  function requestDeleteDraft(draft: SavedDraft) {
    setConfirmAction({
      kind: 'delete-draft',
      draft,
    })
  }

  function showDuplicateResult(
    duplicateResult: DuplicateCheckResponse,
  ) {
    const duplicateErrors: Record<string, string> = {}
    let targetStep = 0

    for (const conflict of duplicateResult.conflicts) {
      if (conflict.field === 'emailAddress') {
        duplicateErrors.emailAddress =
          'This email is already registered.'
        targetStep = 0
      }

      if (conflict.field === 'mobileNumber') {
        duplicateErrors.mobileNumber =
          'This mobile number is already registered.'
        targetStep = 0
      }

      if (conflict.field === 'identity') {
        duplicateErrors.firstName =
          'A matching vulnerable profile already exists.'
        duplicateErrors.lastName =
          'A matching vulnerable profile already exists.'
        duplicateErrors.dateOfBirth =
          'A matching vulnerable profile already exists.'
        targetStep = 0
      }

      if (conflict.field === 'pwdIdNumber') {
        duplicateErrors.pwdIdNumber =
          'This PWD / disability ID is already registered.'

        if (
          !duplicateErrors.emailAddress &&
          !duplicateErrors.mobileNumber &&
          !duplicateErrors.firstName
        ) {
          targetStep = 1
        }
      }
    }

    setErrors((previous) => ({
      ...previous,
      ...duplicateErrors,
    }))
    setStep(targetStep)
    setConfirmAction(null)
    setDuplicateNotice(duplicateResult)
  }

  async function requestSubmit() {
    if (
      submitting ||
      checkingDuplicates ||
      submitLockRef.current
    ) {
      return
    }

    if (!goToFirstMissingRequiredField()) {
      return
    }

    setCheckingDuplicates(true)
    setDuplicateNotice(null)

    try {
      const duplicateResult =
        await apiFetch<DuplicateCheckResponse>(
          '/api/registration/duplicate-check',
          {
            method: 'POST',
            body: JSON.stringify({
              emailAddress: form.emailAddress,
              firstName: form.firstName,
              middleName: form.middleName,
              lastName: form.lastName,
              dateOfBirth: form.dateOfBirth,
              mobileNumber: form.mobileNumber,
              pwdIdNumber: form.pwdIdNumber,
            }),
          },
        )

      if (duplicateResult.hasDuplicate) {
        showDuplicateResult(duplicateResult)
        return
      }

      setConfirmAction({ kind: 'submit' })
    } catch (error: any) {
      toast.error(
        'Duplicate check could not be completed',
        {
          description:
            error?.message ||
            'Registration confirmation was blocked. Please try again.',
        },
      )
    } finally {
      setCheckingDuplicates(false)
    }
  }

  function confirmActionCopy() {
    if (!confirmAction) {
      return {
        title: 'Confirm action',
        description: 'Continue with this action?',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        variant: 'default' as const,
      }
    }

    if (confirmAction.kind === 'close') {
      return {
        title: 'Cancel vulnerable registration?',
        description:
          'Are you sure you want to close this registration form? Any changes that have not been saved as a draft will be discarded.',
        confirmLabel: 'Yes, cancel',
        cancelLabel: 'Keep editing',
        variant: 'destructive' as const,
      }
    }

    if (confirmAction.kind === 'save-draft') {
      return {
        title: currentDraftId ? 'Update this draft?' : 'Save this registration as a draft?',
        description: currentDraftId
          ? 'This will update the currently loaded draft with the information now in the form, then clear the form.'
          : 'This will save the current registration information as a draft, then clear the form so you can continue later.',
        confirmLabel: currentDraftId ? 'Update draft' : 'Save draft',
        cancelLabel: 'Continue editing',
        variant: 'default' as const,
      }
    }

    if (confirmAction.kind === 'resume-draft') {
      return {
        title: 'Load this saved draft?',
        description:
          `Are you sure you want to load “${confirmAction.draft.title}”? The information currently shown in the form will be replaced unless you save it first.`,
        confirmLabel: 'Load draft',
        cancelLabel: 'Keep current form',
        variant: 'default' as const,
      }
    }

    if (confirmAction.kind === 'delete-draft') {
      return {
        title: 'Delete this draft?',
        description:
          `Are you sure you want to permanently delete “${confirmAction.draft.title}”? This action cannot be undone.`,
        confirmLabel: 'Delete draft',
        cancelLabel: 'Keep draft',
        variant: 'destructive' as const,
      }
    }

    return {
      title: 'Register this vulnerable person?',
      description:
        'Please confirm that you reviewed the information and want to create this vulnerable citizen record. The registration will be submitted to the system.',
      confirmLabel: 'Yes, register person',
      cancelLabel: 'Review again',
      variant: 'default' as const,
    }
  }

  function runConfirmedAction() {
    const action = confirmAction
    if (!action) return

    if (action.kind === 'close') {
      closeImmediately()
      return
    }

    if (action.kind === 'save-draft') {
      void performSaveDraft()
      return
    }

    if (action.kind === 'resume-draft') {
      performResumeDraft(action.draft)
      return
    }

    if (action.kind === 'delete-draft') {
      void performDeleteDraft(action.draft.id)
      return
    }

    if (action.kind === 'submit') {
      if (submitting || submitLockRef.current) {
        return
      }

      void performSubmit()
    }
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

  async function performSubmit() {
    if (submitLockRef.current) {
      return
    }

    // A ref is used instead of state alone because it updates synchronously.
    // This prevents a rapid double-click on the confirmation dialog from
    // sending two registration POST requests before React can re-render.
    submitLockRef.current = true
    setSubmitting(true)

    try {
      await onSubmit(form)

      if (currentDraftId) {
        const currentUserId = getCurrentAdminId()
        const ownerField = isWorker
          ? { workerId: currentUserId }
          : { adminId: currentUserId }

        await apiFetch(`${draftBasePath}/${currentDraftId}`, {
          method: 'DELETE',
          body: JSON.stringify(ownerField),
        }).catch(() => null)
      }

      // Success is shown only after the registration API has completed.
      // Admin registrations are approved immediately; Worker submissions
      // remain pending Administrator review.
      const fullName = [
        form.firstName,
        form.middleName,
        form.lastName,
        form.suffix,
      ].map((part) => String(part || '').trim()).filter(Boolean).join(' ')

      setForm(getEmptyForm())
      setErrors({})
      setStep(0)
      setCurrentDraftId(null)
      setSuccessfulRegistration({
        name: fullName,
        status: isWorker ? 'PENDING' : 'APPROVED',
      })
      await loadDrafts()
      onClose()
    } catch (error: any) {
      if (
        error?.code === 'DUPLICATE_REGISTRATION' &&
        Array.isArray(error?.data?.conflicts)
      ) {
        showDuplicateResult({
          success: false,
          hasDuplicate: true,
          conflicts: error.data.conflicts,
        })
      }

    } finally {
      // Allow another registration after the success dialog is dismissed,
      // and allow retry when a save or duplicate check fails.
      submitLockRef.current = false
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
            <SmartEditableSelect
              value={form.suffix}
              onValueChange={(value) => updateField('suffix', value)}
              options={['Jr.', 'Sr.', 'II', 'III', 'IV']}
              storageKey="registration.suffix"
              placeholder="Select or type suffix"
            />
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
            <SmartEditableSelect
              value={form.gender}
              onValueChange={(value) => updateField('gender', value)}
              options={['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']}
              storageKey="registration.gender"
              placeholder="Select or type gender"
              className={cn(errors.gender && 'border-red-400')}
            />
          </InputBlock>

          <InputBlock label="Civil Status" field="civilStatus" required error={errors.civilStatus}>
            <SmartEditableSelect
              value={form.civilStatus}
              onValueChange={(value) => updateField('civilStatus', value)}
              options={['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED']}
              storageKey="registration.civil-status"
              placeholder="Select or type civil status"
              className={cn(errors.civilStatus && 'border-red-400')}
            />
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
            <SearchableSelect
              value={form.barangay}
              onValueChange={(value) =>
                updateField(
                  'barangay',
                  value,
                )
              }
              placeholder="Select barangay"
              searchPlaceholder="Type a barangay..."
              className={cn(
                errors.barangay &&
                  'border-red-400 focus:ring-red-400',
              )}
              options={BARANGAYS.map(
                (barangay) => ({
                  value: barangay,
                  label: barangay,
                }),
              )}
            />
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
                <SmartEditableSelect
                  value={form.povertyStatus}
                  onValueChange={(value) => updateField('povertyStatus', value)}
                  options={povertyStatusOptions}
                  storageKey="registration.poverty-status"
                  placeholder="Select or type welfare status"
                  className={cn(errors.povertyStatus && 'border-red-400')}
                />
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
                <SmartEditableSelect
                  value={form.civilRegistryStatus}
                  onValueChange={(value) => updateField('civilRegistryStatus', value)}
                  options={civilRegistryStatusOptions}
                  storageKey="registration.civil-registry-status"
                  placeholder="Select or type registry status"
                  className={cn(errors.civilRegistryStatus && 'border-red-400')}
                />
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
                  <SmartEditableSelect
                    value={form.disabilityType}
                    onValueChange={(value) => updateField('disabilityType', value)}
                    options={disabilityTypeOptions}
                    storageKey="registration.disability-type"
                    placeholder="Select or type disability type"
                    className={cn(errors.disabilityType && 'border-red-400')}
                  />
                </InputBlock>

                      <InputBlock label="Disability Severity" field="disabilitySeverity" required={form.hasDisability} error={errors.disabilitySeverity}>
                  <SmartEditableSelect
                    value={form.disabilitySeverity}
                    onValueChange={(value) => updateField('disabilitySeverity', value)}
                    options={disabilitySeverityOptions}
                    storageKey="registration.disability-severity"
                    placeholder="Select or type severity"
                    className={cn(errors.disabilitySeverity && 'border-red-400')}
                  />
                </InputBlock>

                      <InputBlock label="Disability Cause">
                  <SmartEditableSelect
                    value={form.disabilityCause}
                    onValueChange={(value) => updateField('disabilityCause', value)}
                    options={disabilityCauseOptions}
                    storageKey="registration.disability-cause"
                    placeholder="Select or type cause"
                  />
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
                  <SmartEditableSelect
                    value={form.assistanceType}
                    onValueChange={(value) => updateField('assistanceType', value)}
                    options={assistanceTypeOptions}
                    storageKey="registration.assistance-type"
                    placeholder="Select or type assistance needed"
                    className={cn(errors.assistanceType && 'border-red-400')}
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
            <SmartEditableSelect
              value={form.bloodType}
              onValueChange={(value) => updateField('bloodType', value)}
              options={bloodTypeOptions}
              storageKey="registration.blood-type"
              placeholder="Select or type blood type"
            />
          </InputBlock>

          <InputBlock label="Educational Attainment">
            <SmartEditableSelect
              value={form.educationalAttainment}
              onValueChange={(value) => updateField('educationalAttainment', value)}
              options={educationalAttainmentOptions}
              storageKey="registration.educational-attainment"
              placeholder="Select or type educational attainment"
            />
          </InputBlock>

          <InputBlock label="School Name">
            <Input
              value={form.schoolName}
              onChange={(e) => updateField('schoolName', e.target.value)}
              placeholder="If applicable"
            />
          </InputBlock>

          <InputBlock label="Employment Status">
            <SmartEditableSelect
              value={form.employmentStatus}
              onValueChange={(value) => updateField('employmentStatus', value)}
              options={employmentStatusOptions}
              storageKey="registration.employment-status"
              placeholder="Select or type employment status"
            />
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
            <SmartEditableSelect
              value={form.guardianRelationship}
              onValueChange={(value) => updateField('guardianRelationship', value)}
              options={guardianRelationshipOptions}
              storageKey="registration.guardian-relationship"
              placeholder="Select or type relationship"
            />
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
          subtitle="Attach available supporting documents. Selected JPG, PNG, WebP, and PDF files are stored with the registration; keep the combined upload at 2.75 MB or less."
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
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
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
                {isWorker
                  ? 'The system will create the citizen account and submit the vulnerable profile as PENDING for Administrator approval.'
                  : 'The system will create the user account, auto-approve the vulnerable profile, and send the generated credentials to the citizen\'s email address.'}
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

  const confirmation = confirmActionCopy()

  return (
    <>
    <Dialog open={open} onOpenChange={(value) => !value && requestClose()}>
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
                  onClick={requestClose}
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
                              onClick={() => requestResumeDraft(draft)}
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
                                onClick={() => requestResumeDraft(draft)}
                                className="text-[0.6875rem] font-semibold text-emerald-700 hover:text-emerald-800"
                              >
                                Resume
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDeleteDraft(draft)}
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
                onClick={step === 0 ? requestClose : goPrevious}
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
                  onClick={requestSaveDraft}
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
                    onClick={canSubmit ? requestSubmit : goToFirstMissingRequiredField}
                    disabled={submitting || checkingDuplicates}
                  >
                    {submitting
                      ? 'Submitting...'
                      : checkingDuplicates
                        ? 'Checking duplicates...'
                        : canSubmit
                          ? 'Confirm Registration'
                          : 'Complete Required Fields'}
                    {!submitting && !checkingDuplicates ? (
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    ) : null}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={Boolean(confirmAction)}
      onClose={() => setConfirmAction(null)}
      onConfirm={runConfirmedAction}
      title={confirmation.title}
      description={confirmation.description}
      confirmLabel={confirmation.confirmLabel}
      cancelLabel={confirmation.cancelLabel}
      variant={confirmation.variant}
      confirmDisabled={submitting || checkingDuplicates}
    />

    <ConfirmDialog
      open={Boolean(duplicateNotice)}
      onClose={() => setDuplicateNotice(null)}
      onConfirm={() => setDuplicateNotice(null)}
      title="Duplicate data detected"
      description={
        duplicateNotice ? (
          <div className="space-y-3 text-left">
            <p>
              CRMS found information that is already used by an existing
              record. Registration confirmation is blocked until the
              conflicting data is reviewed.
            </p>

            <div className="space-y-2">
              {duplicateNotice.conflicts.map((conflict, index) => (
                <div
                  key={`${conflict.type}-${conflict.existingProfileId || conflict.existingUserId || index}`}
                  className="rounded-lg border border-red-200 bg-red-50 p-3"
                >
                  <p className="font-semibold text-red-900">
                    {conflict.label}
                  </p>
                  {conflict.value ? (
                    <p className="mt-1 break-words text-sm text-red-800">
                      {conflict.value}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-red-700">
                    {conflict.message}
                  </p>
                  {conflict.existingRegistrationStatus ? (
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-red-600">
                      Existing status: {conflict.existingRegistrationStatus}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <p className="text-sm">
              Review the highlighted fields in the form or open the existing
              record instead of creating another copy.
            </p>
          </div>
        ) : (
          'A matching registration already exists.'
        )
      }
      confirmLabel="Review registration"
      variant="destructive"
      showCancel={false}
    />

    <AlertDialog
      open={Boolean(successfulRegistration)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setSuccessfulRegistration(null)
      }}
    >
      <AlertDialogContent
        data-testid="registration-success-dialog"
        className="w-[calc(100vw-2rem)] max-w-md overflow-hidden border-emerald-200 bg-white p-0 shadow-xl"
      >
        <div className="px-6 pb-6 pt-7">
          <AlertDialogHeader className="items-center space-y-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold text-slate-900">
              {successfulRegistration?.status === 'PENDING'
                ? 'Registration Submitted Successfully'
                : 'Registration Successful'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm leading-6 text-slate-600">
              {successfulRegistration?.status === 'PENDING'
                ? 'The vulnerable citizen record was saved and is awaiting Administrator approval.'
                : 'The vulnerable citizen was successfully registered and the profile is approved.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-center">
            <p className="break-words font-semibold text-slate-900">
              {successfulRegistration?.name}
            </p>
            <p
              data-testid="registration-success-status"
              className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-700"
            >
              {successfulRegistration?.status === 'PENDING'
                ? 'Pending Administrator Approval'
                : 'Approved Registration'}
            </p>
          </div>

          <p className="mt-4 text-center text-sm leading-6 text-slate-600">
            {successfulRegistration?.status === 'PENDING'
              ? 'The Administrator must review and approve this registration before the citizen appears as an approved beneficiary.'
              : 'You can now find the registered citizen in Vulnerable Registrations and Users List.'}
          </p>

          <AlertDialogFooter className="mt-6">
            <AlertDialogAction
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setSuccessfulRegistration(null)}
            >
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
    </>
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
              accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
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