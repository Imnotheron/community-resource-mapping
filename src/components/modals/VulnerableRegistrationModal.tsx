'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  Upload, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Shield,
  Heart,
  Home,
  Activity,
  FileCheck,
  X,
  Building2,
  GraduationCap,
  Briefcase,
  AlertTriangle
} from 'lucide-react'

import dynamic from 'next/dynamic'

const LocationPickerMap = dynamic(() => import('@/components/map/LocationPickerMap').then(mod => ({ default: mod.default })), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 shadow-inner">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700">Loading map...</p>
        <p className="text-xs text-slate-500 mt-1">Please wait while we load the location picker</p>
      </div>
    </div>
  )
})

type Step = 'personal' | 'medical' | 'administrative' | 'documents' | 'review'

const barangays = [
  'Alugan',
  'Bahay',
  'Bangon',
  'Baras (Lipata)',
  'Binogawan',
  'Cajagwayan',
  'Japunan',
  'Natividad',
  'Pangpang',
  'Barangay No. 1 (Poblacion)',
  'Barangay No. 2 (Poblacion)',
  'Barangay No. 3 (Poblacion)',
  'Barangay No. 4 (Poblacion)',
  'Barangay No. 5 (Poblacion)',
  'Santa Cruz',
  'Tabo',
  'Tan-awan'
]

const disabilityTypes = [
  'Psychosocial / Mental Disability',
  'Chronic Illness',
  'Learning Disability',
  'Visual Impairment',
  'Orthopedic / Musculoskeletal Disability',
  'Hearing Impairment',
  'Speech Impairment',
  'Intellectual Disability',
  'Senior Citizen',
  'Pregnant Women',
  'Single Parent',
  'Other'
]

const severityLevels = ['Mild', 'Moderate', 'Severe']

const disabilityCauses = ['Congenital (from birth)', 'Acquired (due to accident)', 'Acquired (due to illness)', 'Age-related', 'Other']

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']

const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced']

const educationalStatus = ['Elementary School', 'High School', 'College Undergraduate', 'College Graduate', 'Vocational/Technical', 'Postgraduate/Masteral', 'Doctorate', 'No Formal Education']

const employmentStatus = ['Employed', 'Unemployed', 'Self-employed', 'Retired', 'Student']

interface VulnerableRegistrationModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (formData: any) => Promise<void>
  userRole?: 'worker' | 'admin'
}

export default function VulnerableRegistrationModal({ 
  open, 
  onClose, 
  onSubmit,
  userRole = 'worker'
}: VulnerableRegistrationModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('personal')
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showValidationError, setShowValidationError] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const [formData, setFormData] = useState({
    // Personal Identification Data
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

    // Medical and Disability Information
    hasDisability: false,
    disabilityType: '',
    disabilitySeverity: '',
    disabilityCause: '',
    disabilityDetails: '',
    medicalCertificateNumber: '',
    medicalCertificateDate: '',
    hasPhysicalEvidence: false,

    // Administrative and Support Data
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

    // Required Documents
    hasPWDRegistrationForm: false,
    pwdRegistrationForm: null as File | null,
    hasMedicalCertificate: false,
    medicalCertificate: null as File | null,
    hasProofOfIdentity: false,
    proofOfIdentity: null as File | null,
    hasProofOfResidence: false,
    proofOfResidence: null as File | null,
    hasIDPhotos: false,
    idPhotos: [] as File[],

    // Location
    latitude: 12.1792,
    longitude: 125.5072,

    // Additional fields
    emergencyContact: '',
    emergencyPhone: '',
    hasMedicalCondition: false,
    medicalConditions: '',
    needsAssistance: false,
    assistanceType: ''
  })

  const steps: Step[] = ['personal', 'medical', 'administrative', 'documents', 'review']
  const currentStepIndex = steps.indexOf(currentStep)

  useEffect(() => {
    if (open) {
      setCurrentStep('personal')
      setFormData({
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
        hasDisability: false,
        disabilityType: '',
        disabilitySeverity: '',
        disabilityCause: '',
        disabilityDetails: '',
        medicalCertificateNumber: '',
        medicalCertificateDate: '',
        hasPhysicalEvidence: false,
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
        hasPWDRegistrationForm: false,
        pwdRegistrationForm: null,
        hasMedicalCertificate: false,
        medicalCertificate: null,
        hasProofOfIdentity: false,
        proofOfIdentity: null,
        hasProofOfResidence: false,
        proofOfResidence: null,
        hasIDPhotos: false,
        idPhotos: [],
        latitude: 12.1792,
        longitude: 125.5072,
        emergencyContact: '',
        emergencyPhone: '',
        hasMedicalCondition: false,
        medicalConditions: '',
        needsAssistance: false,
        assistanceType: ''
      })
      setShowValidationError(false)
      setValidationErrors([])
    }
  }, [open])

  useEffect(() => {
    setShowValidationError(false)
    setValidationErrors([])
  }, [currentStep])

  const handleNext = () => {
    const missing = validateCurrentStep()
    if (missing.length > 0) {
      setValidationErrors(missing)
      setShowValidationError(true)
      return
    }
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1])
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1])
    }
  }

  const validateCurrentStep = (): string[] => {
    const missing: string[] = []
    
    switch (currentStep) {
      case 'personal':
        if (!formData.lastName?.trim()) missing.push('Last Name')
        if (!formData.firstName?.trim()) missing.push('First Name')
        if (!formData.dateOfBirth) missing.push('Date of Birth')
        if (!formData.gender) missing.push('Gender')
        if (!formData.civilStatus) missing.push('Civil Status')
        if (!formData.mobileNumber?.trim()) missing.push('Mobile Number')
        if (!formData.emailAddress?.trim()) missing.push('Email Address')
        if (!formData.houseNumber?.trim()) missing.push('House Number')
        if (!formData.street?.trim()) missing.push('Street/Purok/Sitio')
        if (!formData.barangay) missing.push('Barangay')
        break
        
      case 'medical':
        if (formData.hasDisability) {
          if (!formData.disabilityType) missing.push('Type of Disability')
          if (!formData.disabilitySeverity) missing.push('Severity Level')
          if (!formData.disabilityCause) missing.push('Cause of Disability')
          if (!formData.disabilityDetails?.trim()) missing.push('Disability Details')
        }
        break
        
      case 'administrative':
        if (!formData.bloodType) missing.push('Blood Type')
        if (!formData.employmentStatus) missing.push('Employment Status')
        break
        
      case 'documents':
        // Documents are optional for worker/admin registration
        break
        
      case 'review':
        break
    }
    
    return missing
  }

  const handleFileChange = (field: string, file: File | null) => {
    setFormData({ ...formData, [field]: file })
  }

  const handleMultipleFilesChange = (field: string, files: FileList | null) => {
    if (files) {
      setFormData({ ...formData, [field]: Array.from(files) })
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateAge = (dateOfBirth: string): number => {
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const getCurrentStepErrors = (): string[] => {
    return validateCurrentStep()
  }

  const renderPersonalStep = () => (
    <div className="space-y-8">
      <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-sm">
        <FileCheck className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <div className="font-semibold text-sm">Information Required</div>
          <p className="text-sm text-blue-800 mt-1">Please provide accurate and complete information. All fields marked with <span className="font-bold text-red-600">*</span> are required.</p>
        </AlertDescription>
      </Alert>

      {/* Personal Identification Section */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <User className="w-5 h-5 text-white" />
            </div>
            Personal Identification Data
          </h3>
          <p className="text-sm text-blue-100 mt-1 ml-10">Complete legal name and contact information for identification purposes</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Name Fields */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-1 bg-blue-600 rounded-full"></div>
              <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Legal Name</h4>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-slate-700 font-medium text-sm">Last Name <span className="text-red-600">*</span></Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500 font-medium"
                  placeholder="Enter last name"
                />
                {showValidationError && validationErrors.includes('Last Name') && (
                  <p className="text-xs text-red-600 font-medium">Missing required fields</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-slate-700 font-medium text-sm">First Name <span className="text-red-600">*</span></Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500 font-medium"
                  placeholder="Enter first name"
                />
                {showValidationError && validationErrors.includes('First Name') && (
                  <p className="text-xs text-red-600 font-medium">Missing required fields</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName" className="text-slate-700 font-medium text-sm">Middle Name</Label>
                <Input
                  id="middleName"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter middle name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suffix" className="text-slate-700 font-medium text-sm">Suffix</Label>
                <Input
                  id="suffix"
                  value={formData.suffix}
                  onChange={(e) => setFormData({ ...formData, suffix: e.target.value.toUpperCase() })}
                  className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., JR, SR, III"
                />
              </div>
            </div>
          </div>

          {/* Personal Details */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-1 bg-blue-600 rounded-full"></div>
              <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Personal Details</h4>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-slate-700 font-medium text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Date of Birth <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  max={new Date().toISOString().split('T')[0]}
                />
                {showValidationError && validationErrors.includes('Date of Birth') && (
                  <p className="text-xs text-red-600 font-medium">Missing required fields</p>
                )}
                {formData.dateOfBirth && (
                  <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                    <Activity className="w-4 h-4" />
                    <span className="font-medium">Age: {calculateAge(formData.dateOfBirth)} years</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-slate-700 font-medium text-sm">Gender <span className="text-red-600">*</span></Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-300">
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
                {showValidationError && validationErrors.includes('Gender') && (
                  <p className="text-xs text-red-600 font-medium">Missing required fields</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="civilStatus" className="text-slate-700 font-medium text-sm">Civil Status <span className="text-red-600">*</span></Label>
                <Select value={formData.civilStatus} onValueChange={(value) => setFormData({ ...formData, civilStatus: value })}>
                  <SelectTrigger className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select civil status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-300">
                    {civilStatusOptions.map((status) => (
                      <SelectItem key={status} value={status.toUpperCase()}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showValidationError && validationErrors.includes('Civil Status') && (
                  <p className="text-xs text-red-600 font-medium">Missing required fields</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-1 bg-blue-600 rounded-full"></div>
              <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Contact Information</h4>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobileNumber" className="text-slate-700 font-medium text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  Mobile Number <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="mobileNumber"
                  type="tel"
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="09XXXXXXXXX"
                />
                {showValidationError && validationErrors.includes('Mobile Number') && (
                  <p className="text-xs text-red-600 font-medium">Missing required fields</p>
                )}
                <p className="text-xs text-slate-500">Format: 09 followed by 9 digits</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="landlineNumber" className="text-slate-700 font-medium text-sm">Landline Number</Label>
                <Input
                  id="landlineNumber"
                  type="tel"
                  value={formData.landlineNumber}
                  onChange={(e) => setFormData({ ...formData, landlineNumber: e.target.value })}
                  className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="(08X) XXX-XXXX"
                />
                <p className="text-xs text-slate-500">Optional secondary contact</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailAddress" className="text-slate-700 font-medium text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Email Address <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="emailAddress"
                  type="email"
                  value={formData.emailAddress}
                  onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                  className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="example@email.com"
                />
                {showValidationError && validationErrors.includes('Email Address') && (
                  <p className="text-xs text-red-600 font-medium">Missing required fields</p>
                )}
                <p className="text-xs text-slate-500">For official communications</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Residential Address Section */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Home className="w-5 h-5 text-white" />
            </div>
            Residential Address
          </h3>
          <p className="text-sm text-emerald-100 mt-1 ml-10">Complete address for jurisdiction determination and service delivery</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="houseNumber" className="text-slate-700 font-medium text-sm">House Number <span className="text-red-600">*</span></Label>
              <Input
                id="houseNumber"
                value={formData.houseNumber}
                onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                className="bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 font-medium"
                placeholder="e.g., 123"
              />
              {showValidationError && validationErrors.includes('House Number') && (
                <p className="text-xs text-red-600 font-medium">Missing required fields</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="street" className="text-slate-700 font-medium text-sm">Street / Purok / Sitio <span className="text-red-600">*</span></Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 font-medium"
                placeholder="e.g., Rizal Street, Purok 3"
              />
              {showValidationError && validationErrors.includes('Street/Purok/Sitio') && (
                <p className="text-xs text-red-600 font-medium">Missing required fields</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barangay" className="text-slate-700 font-medium text-sm">Barangay <span className="text-red-600">*</span></Label>
              <Select value={formData.barangay} onValueChange={(value) => setFormData({ ...formData, barangay: value })}>
                <SelectTrigger className="bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500">
                  <SelectValue placeholder="Select barangay" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300 max-h-60">
                  {barangays.map((barangay) => (
                    <SelectItem key={barangay} value={barangay}>{barangay}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showValidationError && validationErrors.includes('Barangay') && (
                <p className="text-xs text-red-600 font-medium">Missing required fields</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium text-sm">Municipality & Province</Label>
              <div className="space-y-2">
                <Input
                  value={formData.municipality}
                  disabled
                  className="bg-slate-100 border-slate-300 text-slate-600 font-medium"
                />
                <Input
                  value={formData.province}
                  disabled
                  className="bg-slate-100 border-slate-300 text-slate-600 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <Label className="text-slate-700 font-medium text-sm mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Precise Location
            </Label>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowMap(!showMap)}
                variant="outline"
                className={`flex-1 gap-2 font-medium transition-all duration-200 ${
                  showMap 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                    : 'border-slate-300 text-slate-700 hover:border-emerald-500 hover:bg-emerald-50'
                }`}
              >
                {showMap ? <CheckCircle className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                {showMap ? 'Location Pinned' : 'Pinpoint Location on Map'}
              </Button>
              {formData.latitude !== 12.1792 && formData.longitude !== 125.5072 && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Coordinates Set</span>
                </div>
              )}
            </div>

            {showMap && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Click on the map to set precise location for accurate tracking and service delivery
                </p>
                <div className="rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner">
                  <LocationPickerMap
                    initialLat={formData.latitude}
                    initialLng={formData.longitude}
                    onLocationSelect={(lat, lng, address) => {
                      setFormData({ ...formData, latitude: lat, longitude: lng })
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span>Current coordinates: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderMedicalStep = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            Medical and Disability Information
          </h3>
          <p className="text-sm text-rose-100 mt-1 ml-10">Health status, disability classification, and medical conditions</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Disability Status */}
          <div className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-5 border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <Checkbox
                  id="hasDisability"
                  checked={formData.hasDisability}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasDisability: !!checked })}
                  className="border-slate-300 w-5 h-5"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="hasDisability" className="cursor-pointer font-semibold text-slate-800 text-base">
                  This person has a disability or medical condition
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  Check this box if the individual requires special accommodations or has a recognized disability
                </p>
              </div>
            </div>
          </div>

          {formData.hasDisability && (
            <div className="space-y-5 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6 border-2 border-rose-200">
              <div className="flex items-center gap-2 pb-3 border-b border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h4 className="font-bold text-rose-800 text-sm uppercase tracking-wide">Disability Details</h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="disabilityType" className="text-slate-700 font-medium text-sm">
                    Type of Disability / Condition <span className="text-red-600">*</span>
                  </Label>
                  <Select value={formData.disabilityType} onValueChange={(value) => setFormData({ ...formData, disabilityType: value })}>
                    <SelectTrigger className="bg-white border-slate-300 focus:border-rose-500 focus:ring-rose-500">
                      <SelectValue placeholder="Select type of disability or condition" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300 max-h-60">
                      {disabilityTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showValidationError && validationErrors.includes('Type of Disability') && (
                    <p className="text-xs text-red-600 font-medium">Missing required fields</p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="disabilitySeverity" className="text-slate-700 font-medium text-sm">
                      Severity Level <span className="text-red-600">*</span>
                    </Label>
                    <Select value={formData.disabilitySeverity} onValueChange={(value) => setFormData({ ...formData, disabilitySeverity: value })}>
                      <SelectTrigger className="bg-white border-slate-300 focus:border-rose-500 focus:ring-rose-500">
                        <SelectValue placeholder="Select severity level" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-300">
                        {severityLevels.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showValidationError && validationErrors.includes('Severity Level') && (
                      <p className="text-xs text-red-600 font-medium">Missing required fields</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disabilityCause" className="text-slate-700 font-medium text-sm">
                      Cause <span className="text-red-600">*</span>
                    </Label>
                    <Select value={formData.disabilityCause} onValueChange={(value) => setFormData({ ...formData, disabilityCause: value })}>
                      <SelectTrigger className="bg-white border-slate-300 focus:border-rose-500 focus:ring-rose-500">
                        <SelectValue placeholder="Select cause" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-300">
                        {disabilityCauses.map((cause) => (
                          <SelectItem key={cause} value={cause}>{cause}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showValidationError && validationErrors.includes('Cause of Disability') && (
                      <p className="text-xs text-red-600 font-medium">Missing required fields</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="disabilityDetails" className="text-slate-700 font-medium text-sm">
                    Detailed Description <span className="text-red-600">*</span>
                  </Label>
                  <Textarea
                    id="disabilityDetails"
                    value={formData.disabilityDetails}
                    onChange={(e) => setFormData({ ...formData, disabilityDetails: e.target.value })}
                    rows={4}
                    placeholder="Provide comprehensive details about the disability, including specific limitations, accommodation needs, and any relevant medical information..."
                    className="bg-white border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                  />
                  {showValidationError && validationErrors.includes('Disability Details') && (
                    <p className="text-xs text-red-600 font-medium">Missing required fields</p>
                  )}
                  <p className="text-xs text-slate-500">Please be as detailed as possible to ensure proper assistance and accommodation</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="medicalCertificateNumber" className="text-slate-700 font-medium text-sm">
                      Medical Certificate Number
                    </Label>
                    <Input
                      id="medicalCertificateNumber"
                      value={formData.medicalCertificateNumber}
                      onChange={(e) => setFormData({ ...formData, medicalCertificateNumber: e.target.value })}
                      className="bg-white border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                      placeholder="MC-XXXX-XXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medicalCertificateDate" className="text-slate-700 font-medium text-sm">
                      Certificate Issue Date
                    </Label>
                    <Input
                      id="medicalCertificateDate"
                      type="date"
                      value={formData.medicalCertificateDate}
                      onChange={(e) => setFormData({ ...formData, medicalCertificateDate: e.target.value })}
                      className="bg-white border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <div className="mt-1">
                    <Checkbox
                      id="hasPhysicalEvidence"
                      checked={formData.hasPhysicalEvidence}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasPhysicalEvidence: !!checked })}
                      className="border-slate-300 w-5 h-5"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="hasPhysicalEvidence" className="cursor-pointer font-medium text-slate-700">
                      Physical evidence available
                    </Label>
                    <p className="text-sm text-slate-600 mt-1">
                      Medical records, diagnostic reports, or other documentation supporting the disability claim
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other Medical Conditions */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-start gap-4 bg-gradient-to-r from-slate-50 to-white rounded-xl p-5 border border-slate-200">
              <div className="mt-1">
                <Checkbox
                  id="hasMedicalCondition"
                  checked={formData.hasMedicalCondition}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasMedicalCondition: !!checked })}
                  className="border-slate-300 w-5 h-5"
                />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <Label htmlFor="hasMedicalCondition" className="cursor-pointer font-semibold text-slate-800 text-base">
                    Has other medical conditions
                  </Label>
                  <p className="text-sm text-slate-600 mt-1">
                    Chronic illnesses, allergies, or other health conditions that may affect care
                  </p>
                </div>
                {formData.hasMedicalCondition && (
                  <div className="space-y-2">
                    <Label htmlFor="medicalConditions" className="text-slate-700 font-medium text-sm">
                      Medical Conditions
                    </Label>
                    <Textarea
                      id="medicalConditions"
                      value={formData.medicalConditions}
                      onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                      rows={3}
                      placeholder="List other medical conditions, allergies, or health concerns..."
                      className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAdministrativeStep = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            Administrative and Support Data
          </h3>
          <p className="text-sm text-violet-100 mt-1 ml-10">Additional information for improved service delivery and emergency response</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Blood Type */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-5 border border-red-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-red-500 rounded-lg">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-bold text-red-800">Blood Type Information</h4>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bloodType" className="text-slate-700 font-medium text-sm">
                Blood Type <span className="text-red-600">*</span>
              </Label>
              <Select value={formData.bloodType} onValueChange={(value) => setFormData({ ...formData, bloodType: value })}>
                <SelectTrigger className="bg-white border-slate-300 focus:border-red-500 focus:ring-red-500">
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  {bloodTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showValidationError && validationErrors.includes('Blood Type') && (
                <p className="text-xs text-red-600 font-medium">Missing required fields</p>
              )}
              <p className="text-xs text-slate-600">Critical information for emergency medical situations</p>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-1 bg-violet-600 rounded-full"></div>
              <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Emergency Contact</h4>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact" className="text-slate-700 font-medium text-sm">Contact Name</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500"
                  placeholder="Full name of emergency contact"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone" className="text-slate-700 font-medium text-sm">Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500"
                  placeholder="09XXXXXXXXX"
                />
              </div>
            </div>
          </div>

          {/* Government IDs */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-1 bg-violet-600 rounded-full"></div>
              <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Government ID Numbers</h4>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="philHealthNumber" className="text-slate-700 font-medium text-sm">PhilHealth Number</Label>
                <Input
                  id="philHealthNumber"
                  value={formData.philHealthNumber}
                  onChange={(e) => setFormData({ ...formData, philHealthNumber: e.target.value })}
                  className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500"
                  placeholder="XX-XXXXXXXXX-X"
                />
                <p className="text-xs text-slate-500">For health insurance benefits</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sssNumber" className="text-slate-700 font-medium text-sm">SSS Number</Label>
                <Input
                  id="sssNumber"
                  value={formData.sssNumber}
                  onChange={(e) => setFormData({ ...formData, sssNumber: e.target.value })}
                  className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500"
                  placeholder="XX-XXXXXXX-X"
                />
                <p className="text-xs text-slate-500">For social security benefits</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gsisNumber" className="text-slate-700 font-medium text-sm">GSIS Number</Label>
                <Input
                  id="gsisNumber"
                  value={formData.gsisNumber}
                  onChange={(e) => setFormData({ ...formData, gsisNumber: e.target.value })}
                  className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500"
                  placeholder="GSIS ID Number"
                />
                <p className="text-xs text-slate-500">For government employee benefits</p>
              </div>
            </div>
          </div>

          {/* Educational & Employment */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-1 bg-violet-600 rounded-full"></div>
              <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Educational & Employment Status</h4>
            </div>
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="educationalAttainment" className="text-slate-700 font-medium text-sm flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-violet-600" />
                    Educational Status <span className="text-red-600">*</span>
                  </Label>
                  <Select value={formData.educationalAttainment} onValueChange={(value) => setFormData({ ...formData, educationalAttainment: value })}>
                    <SelectTrigger className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500">
                      <SelectValue placeholder="Select educational status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300 max-h-60">
                      {educationalStatus.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentStatus" className="text-slate-700 font-medium text-sm flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-violet-600" />
                    Employment Status <span className="text-red-600">*</span>
                  </Label>
                  <Select value={formData.employmentStatus} onValueChange={(value) => setFormData({ ...formData, employmentStatus: value })}>
                    <SelectTrigger className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500">
                      <SelectValue placeholder="Select employment status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      {employmentStatus.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showValidationError && validationErrors.includes('Employment Status') && (
                    <p className="text-xs text-red-600 font-medium">Missing required fields</p>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName" className="text-slate-700 font-medium text-sm">School Name (if student)</Label>
                  <Input
                    id="schoolName"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500"
                    placeholder="Name of educational institution"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentDetails" className="text-slate-700 font-medium text-sm">Occupation / Job Title</Label>
                  <Input
                    id="employmentDetails"
                    value={formData.employmentDetails}
                    onChange={(e) => setFormData({ ...formData, employmentDetails: e.target.value })}
                    className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500"
                    placeholder="Current occupation or profession"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Assistance Needed */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-start gap-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-200">
              <div className="mt-1">
                <Checkbox
                  id="needsAssistance"
                  checked={formData.needsAssistance}
                  onCheckedChange={(checked) => setFormData({ ...formData, needsAssistance: !!checked })}
                  className="border-slate-300 w-5 h-5"
                />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <Label htmlFor="needsAssistance" className="cursor-pointer font-semibold text-slate-800 text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    Needs immediate assistance
                  </Label>
                  <p className="text-sm text-slate-600 mt-1">
                    Check if this individual requires urgent or priority assistance
                  </p>
                </div>
                {formData.needsAssistance && (
                  <div className="space-y-2">
                    <Label htmlFor="assistanceType" className="text-slate-700 font-medium text-sm">
                      Type of Assistance Needed
                    </Label>
                    <Textarea
                      id="assistanceType"
                      value={formData.assistanceType}
                      onChange={(e) => setFormData({ ...formData, assistanceType: e.target.value })}
                      rows={3}
                      placeholder="Describe the type of assistance required and urgency level..."
                      className="bg-white border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderDocumentsStep = () => (
    <div className="space-y-8">
      <Alert className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 shadow-sm">
        <FileText className="h-5 w-5 text-amber-600" />
        <AlertDescription className="text-amber-900">
          <div className="font-semibold text-sm mb-1">Document Upload Information</div>
          <p className="text-sm text-amber-800">
            Document upload is optional for {userRole}-assisted registration. You may upload documents now or request them later during the review process.
          </p>
        </AlertDescription>
      </Alert>

      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Upload className="w-5 h-5 text-white" />
            </div>
            Supporting Documents
          </h3>
          <p className="text-sm text-amber-100 mt-1 ml-10">Upload available supporting documents to complete the registration</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-4">
            {/* PWD Registration Form */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <FileCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">PWD Registration Form</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.hasPWDRegistrationForm}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasPWDRegistrationForm: !!checked })}
                    className="border-slate-300"
                  />
                  <Label className="cursor-pointer text-sm text-slate-700">Document available</Label>
                </div>
                <Input
                  type="file"
                  onChange={(e) => handleFileChange('pwdRegistrationForm', e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  className="bg-slate-50 border-slate-300"
                />
                {formData.pwdRegistrationForm && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium truncate">{formData.pwdRegistrationForm.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Certificate */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-100 rounded-lg">
                    <Activity className="w-4 h-4 text-rose-600" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">Medical Certificate</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.hasMedicalCertificate}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasMedicalCertificate: !!checked })}
                    className="border-slate-300"
                  />
                  <Label className="cursor-pointer text-sm text-slate-700">Document available</Label>
                </div>
                <Input
                  type="file"
                  onChange={(e) => handleFileChange('medicalCertificate', e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  className="bg-slate-50 border-slate-300"
                />
                {formData.medicalCertificate && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium truncate">{formData.medicalCertificate.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Proof of Identity */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-violet-100 rounded-lg">
                    <Shield className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">Proof of Identity</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.hasProofOfIdentity}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasProofOfIdentity: !!checked })}
                    className="border-slate-300"
                  />
                  <Label className="cursor-pointer text-sm text-slate-700">Document available</Label>
                </div>
                <Input
                  type="file"
                  onChange={(e) => handleFileChange('proofOfIdentity', e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.png"
                  className="bg-slate-50 border-slate-300"
                />
                {formData.proofOfIdentity && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium truncate">{formData.proofOfIdentity.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Proof of Residence */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-lg">
                    <Home className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">Proof of Residence</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.hasProofOfResidence}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasProofOfResidence: !!checked })}
                    className="border-slate-300"
                  />
                  <Label className="cursor-pointer text-sm text-slate-700">Document available</Label>
                </div>
                <Input
                  type="file"
                  onChange={(e) => handleFileChange('proofOfResidence', e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.png"
                  className="bg-slate-50 border-slate-300"
                />
                {formData.proofOfResidence && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium truncate">{formData.proofOfResidence.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ID Photos - Full Width */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <User className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-semibold text-slate-800 text-sm">ID Photos</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.hasIDPhotos}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasIDPhotos: !!checked })}
                  className="border-slate-300"
                />
                <Label className="cursor-pointer text-sm text-slate-700">Photos available</Label>
              </div>
              <Input
                type="file"
                onChange={(e) => handleMultipleFilesChange('idPhotos', e.target.files)}
                accept=".jpg,.jpeg,.png"
                multiple
                className="bg-slate-50 border-slate-300"
              />
              {formData.idPhotos.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">{formData.idPhotos.length} photo(s) selected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            Review Registration
          </h3>
          <p className="text-sm text-teal-100 mt-1 ml-10">Carefully review all information before submitting</p>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {/* Personal Information Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-slate-200">
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Personal Information
              </h4>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-600 min-w-[100px]">Full Name:</span>
                <span className="text-slate-900 font-semibold">{formData.lastName}, {formData.firstName} {formData.middleName} {formData.suffix}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-600 min-w-[100px]">Date of Birth:</span>
                <span className="text-slate-900">{formData.dateOfBirth} <span className="text-blue-600">({formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : 0} yrs)</span></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-600 min-w-[100px]">Gender:</span>
                <span className="text-slate-900">{formData.gender}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-600 min-w-[100px]">Civil Status:</span>
                <span className="text-slate-900">{formData.civilStatus}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-600 min-w-[100px]">Mobile:</span>
                <span className="text-slate-900 font-mono">{formData.mobileNumber}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-600 min-w-[100px]">Email:</span>
                <span className="text-slate-900 font-mono">{formData.emailAddress}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-600 min-w-[100px]">Address:</span>
                <span className="text-slate-900">{formData.houseNumber} {formData.street}, {formData.barangay}, {formData.municipality}, {formData.province}</span>
              </div>
            </div>
          </div>

          {/* Disability Information Card */}
          {formData.hasDisability && (
            <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-rose-50 to-pink-50 px-4 py-3 border-b border-rose-200">
                <h4 className="font-bold text-rose-800 text-sm uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-600" />
                  Disability Information
                </h4>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-medium text-rose-700 min-w-[100px]">Type:</span>
                  <span className="text-slate-900 font-medium">{formData.disabilityType}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-rose-700 min-w-[100px]">Severity:</span>
                  <span className="text-slate-900 font-medium">{formData.disabilitySeverity}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-rose-700 min-w-[100px]">Cause:</span>
                  <span className="text-slate-900 font-medium">{formData.disabilityCause}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-rose-700 min-w-[100px]">Details:</span>
                  <span className="text-slate-900">{formData.disabilityDetails}</span>
                </div>
              </div>
            </div>
          )}

          {/* Administrative Data Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-3 border-b border-slate-200">
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-600" />
                Administrative Data
              </h4>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-600 min-w-[100px]">Blood Type:</span>
                <span className="text-slate-900 font-semibold text-red-600">{formData.bloodType}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-600 min-w-[100px]">Education:</span>
                <span className="text-slate-900">{formData.educationalStatus}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-600 min-w-[100px]">Employment:</span>
                <span className="text-slate-900">{formData.employmentStatus}</span>
              </div>
              {formData.emergencyContact && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-slate-600 min-w-[100px]">Emergency:</span>
                  <span className="text-slate-900">{formData.emergencyContact} ({formData.emergencyPhone})</span>
                </div>
              )}
              {(formData.philHealthNumber || formData.sssNumber) && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-slate-600 min-w-[100px]">Gov. IDs:</span>
                  <span className="text-slate-900 font-mono text-xs">
                    {formData.philHealthNumber && `PhilHealth: ${formData.philHealthNumber} `}
                    {formData.sssNumber && `| SSS: ${formData.sssNumber}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Assistance Alert */}
          {formData.needsAssistance && (
            <Alert className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-300">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <div className="font-bold text-base mb-1">⚠️ Requires Immediate Assistance</div>
                <p className="text-sm text-orange-800">{formData.assistanceType}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Documents Summary */}
          {(formData.hasPWDRegistrationForm || formData.hasMedicalCertificate || formData.hasProofOfIdentity || formData.hasProofOfResidence) && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3 border-b border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-600" />
                  Documents Uploaded
                </h4>
              </div>
              <div className="p-4 space-y-2 text-sm">
                {formData.hasPWDRegistrationForm && (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">PWD Registration Form</span>
                  </div>
                )}
                {formData.hasMedicalCertificate && (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Medical Certificate</span>
                  </div>
                )}
                {formData.hasProofOfIdentity && (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Proof of Identity</span>
                  </div>
                )}
                {formData.hasProofOfResidence && (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Proof of Residence</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const getStepTitle = () => {
    switch (currentStep) {
      case 'personal': return 'Personal Information'
      case 'medical': return 'Medical & Disability'
      case 'administrative': return 'Administrative Data'
      case 'documents': return 'Documents (Optional)'
      case 'review': return 'Review & Submit'
    }
  }

  const getStepIcon = () => {
    switch (currentStep) {
      case 'personal': return User
      case 'medical': return Activity
      case 'administrative': return Shield
      case 'documents': return Upload
      case 'review': return CheckCircle
    }
  }

  const getStepColor = () => {
    switch (currentStep) {
      case 'personal': return 'blue'
      case 'medical': return 'rose'
      case 'administrative': return 'violet'
      case 'documents': return 'amber'
      case 'review': return 'teal'
    }
  }

  const StepIcon = getStepIcon()
  const stepColor = getStepColor()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden flex flex-col bg-white max-w-[98vw] w-[98vw] h-[95vh] rounded-2xl border border-slate-200 shadow-2xl"
      >
        {/* Header */}
        <DialogHeader className="bg-white border-b border-slate-200 shadow-sm pb-4">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-${stepColor}-50 rounded-xl border-2 border-${stepColor}-200`}>
                <StepIcon className={`w-6 h-6 text-${stepColor}-600`} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900">Register Vulnerable Person</DialogTitle>
                <DialogDescription className="text-slate-600 mt-1 flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{getStepTitle()}</span>
                  <span className="text-slate-400">•</span>
                  <span>Step {currentStepIndex + 1} of {steps.length}</span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Progress Bar with Steps */}
          <div className="px-6 pb-4">
            <div className="relative pt-2">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r from-${stepColor}-500 to-${stepColor}-600 transition-all duration-500 ease-out shadow-lg`}
                  style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-3">
                {steps.map((step, index) => (
                  <div key={step} className="flex flex-col items-center gap-1">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-300 ${
                      index < currentStepIndex 
                        ? `bg-${stepColor}-600 text-white shadow-lg` 
                        : index === currentStepIndex 
                        ? `bg-${stepColor}-600 text-white shadow-lg scale-110 ring-4 ring-${stepColor}-200` 
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {index < currentStepIndex ? <CheckCircle className="w-5 h-5" /> : index + 1}
                    </div>
                    <span className={`text-xs font-medium transition-colors ${
                      index <= currentStepIndex ? `text-${stepColor}-700` : 'text-slate-400'
                    }`}>
                      {step.charAt(0).toUpperCase() + step.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          <div className="max-w-4xl mx-auto">
            {currentStep === 'personal' && renderPersonalStep()}
            {currentStep === 'medical' && renderMedicalStep()}
            {currentStep === 'administrative' && renderAdministrativeStep()}
            {currentStep === 'documents' && renderDocumentsStep()}
            {currentStep === 'review' && renderReviewStep()}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-medium px-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>

            {currentStep === 'review' ? (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className={`bg-gradient-to-r from-${stepColor}-600 to-${stepColor}-700 hover:from-${stepColor}-700 hover:to-${stepColor}-800 text-white gap-2 font-semibold px-8 shadow-lg hover:shadow-xl transition-all duration-200`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting Registration...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Registration
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className={`bg-gradient-to-r from-${stepColor}-600 to-${stepColor}-700 hover:from-${stepColor}-700 hover:to-${stepColor}-800 text-white gap-2 font-semibold px-8 shadow-lg hover:shadow-xl transition-all duration-200`}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
