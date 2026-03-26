'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SuccessModal } from '@/components/ui/success-modal'
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
  Image as ImageIcon,
  FileCheck
} from 'lucide-react'

// Import map component
import dynamic from 'next/dynamic'

const LocationPickerMap = dynamic(() => import('@/components/map/LocationPickerMap').then(mod => ({ default: mod.default })), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] flex items-center justify-center bg-white rounded-lg border-2 border-slate-200">
      <div className="text-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
        <p className="text-sm text-slate-600">Loading map...</p>
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
  'Other'
]

const severityLevels = ['Mild', 'Moderate', 'Severe']

const disabilityCauses = ['Congenital (from birth)', 'Acquired (due to accident)', 'Acquired (due to illness)', 'Other']

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']

const educationalStatus = ['Elementary School', 'High School', 'College Undergraduate', 'College Graduate', 'Vocational/Technical', 'Postgraduate/Masteral', 'Doctorate', 'No Formal Education']

const employmentStatus = ['Employed', 'Unemployed', 'Self-employed', 'Retired', 'Student']

export default function VulnerableRegistration() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('personal')
  const [isLoading, setIsLoading] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showValidationError, setShowValidationError] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [formData, setFormData] = useState({
    // Personal Identification Data
    lastName: '',
    firstName: '',
    middleName: '',
    dateOfBirth: '',
    gender: '',
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
    longitude: 125.5072
  })

  const steps: Step[] = ['personal', 'medical', 'administrative', 'documents', 'review']
  const currentStepIndex = steps.indexOf(currentStep)

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
        if (!formData.educationalAttainment) missing.push('Educational Status')
        if (!formData.employmentStatus) missing.push('Employment Status')
        break
        
      case 'documents':
        if (!formData.hasPWDRegistrationForm || !formData.pwdRegistrationForm) {
          missing.push('PWD Registration Form')
        }
        if (!formData.hasMedicalCertificate || !formData.medicalCertificate) {
          missing.push('Medical Certificate')
        }
        if (!formData.hasProofOfIdentity || !formData.proofOfIdentity) {
          missing.push('Proof of Identity')
        }
        if (!formData.hasProofOfResidence || !formData.proofOfResidence) {
          missing.push('Proof of Residence')
        }
        if (!formData.hasIDPhotos || formData.idPhotos.length === 0) {
          missing.push('ID Photos')
        }
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
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.push('/login')
        return
      }

      const user = JSON.parse(userStr)

      // Submit registration
      const res = await fetch('/api/vulnerable/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...formData,
          // Map client fields to database schema fields
          selectedVulnerabilities: formData.hasDisability ? ['PWD'] : ['OTHER'],
          otherVulnerabilityDescription: formData.disabilityDetails,
          representativeName: formData.guardianName,
          representativeRelationship: formData.guardianRelationship,
          representativePhone: formData.guardianContact,
          hasRepresentative: !!formData.guardianName, // If name is provided, assume representative exists
          // Map coordinates explicitly to ensure they are sent
          latitude: formData.latitude,
          longitude: formData.longitude
        })
      })

      const data = await res.json()
      if (data.success) {
        setShowSuccessModal(true)
        setTimeout(() => {
          router.push('/vulnerable/dashboard')
        }, 3000)
      } else {
        alert(data.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert('Registration failed. Please try again.')
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

  const renderPersonalStep = () => (
    <div className="space-y-6">
      {showValidationError && validationErrors.length > 0 && (
        <Alert className="bg-red-50 border-red-200 text-red-900">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <div className="font-semibold mb-1">Please complete the following required fields:</div>
            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Alert className="bg-blue-50 border-blue-200 text-blue-900">
        <FileCheck className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Please provide accurate information. All fields marked with * are required.
        </AlertDescription>
      </Alert>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Personal Identification Data
          </h3>
          <p className="text-sm text-slate-600 mt-1">Your complete legal name and contact information</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lastName" className="text-slate-700">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div>
              <Label htmlFor="firstName" className="text-slate-700">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div>
              <Label htmlFor="middleName" className="text-slate-700">Middle Name</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateOfBirth" className="text-slate-700">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                max={new Date().toISOString().split('T')[0]}
              />
              {formData.dateOfBirth && (
                <p className="text-xs text-slate-500 mt-1">Age: {calculateAge(formData.dateOfBirth)} years old</p>
              )}
            </div>
            <div>
              <Label htmlFor="gender" className="text-slate-700">Gender *</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  <SelectItem value="Male" className="text-slate-900">Male</SelectItem>
                  <SelectItem value="Female" className="text-slate-900">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mobileNumber" className="text-slate-700">Mobile Number *</Label>
              <Input
                id="mobileNumber"
                type="tel"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                placeholder="09XXXXXXXXX"
              />
            </div>
            <div>
              <Label htmlFor="landlineNumber" className="text-slate-700">Landline Number</Label>
              <Input
                id="landlineNumber"
                type="tel"
                value={formData.landlineNumber}
                onChange={(e) => setFormData({ ...formData, landlineNumber: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="emailAddress" className="text-slate-700">Email Address *</Label>
            <Input
              id="emailAddress"
              type="email"
              value={formData.emailAddress}
              onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
              className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 space-y-4">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600" />
              Residential Address
            </h3>
            <p className="text-sm text-slate-600 mt-1">Full address to establish jurisdiction for LGU benefits</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="houseNumber" className="text-slate-700">House Number *</Label>
              <Input
                id="houseNumber"
                value={formData.houseNumber}
                onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div>
              <Label htmlFor="street" className="text-slate-700">Street/Purok/Sitio *</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div>
              <Label htmlFor="barangay" className="text-slate-700">Barangay *</Label>
              <Select value={formData.barangay} onValueChange={(value) => setFormData({ ...formData, barangay: value })}>
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900">
                  <SelectValue placeholder="Select barangay" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  {barangays.map((barangay) => (
                    <SelectItem key={barangay} value={barangay} className="text-slate-900">{barangay}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="municipality" className="text-slate-700">Municipality</Label>
                <Input
                  id="municipality"
                  value={formData.municipality}
                  disabled
                  className="mt-1 bg-slate-50 border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <Label htmlFor="province" className="text-slate-700">Province</Label>
                <Input
                  id="province"
                  value={formData.province}
                  disabled
                  className="mt-1 bg-slate-50 border-slate-300 text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                onClick={() => setShowMap(!showMap)}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
              >
                <MapPin className="w-4 h-4 mr-2" />
                {showMap ? 'Hide Map' : 'Pinpoint Your Location on Map'}
              </Button>
            </div>

            {showMap && (
              <div className="pt-4">
                <Label className="text-slate-700">Pinpoint Your Exact Location</Label>
                <p className="text-xs text-slate-500 mb-2">
                  Click on the map to set your precise location for easy tracking
                </p>
                <LocationPickerMap
                  initialLat={formData.latitude}
                  initialLng={formData.longitude}
                  onLocationSelect={(lat, lng, address) => {
                    setFormData({ ...formData, latitude: lat, longitude: lng })
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderMedicalStep = () => (
    <div className="space-y-6">
      {showValidationError && validationErrors.length > 0 && (
        <Alert className="bg-red-50 border-red-200 text-red-900">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <div className="font-semibold mb-1">Please complete the following required fields:</div>
            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Medical and Disability Information
          </h3>
          <p className="text-sm text-slate-600 mt-1">Disability classification and medical details</p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasDisability"
              checked={formData.hasDisability}
              onCheckedChange={(checked) => setFormData({ ...formData, hasDisability: !!checked })}
              className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <Label htmlFor="hasDisability" className="cursor-pointer text-slate-700">
              I have a disability or medical condition
            </Label>
          </div>

          {formData.hasDisability && (
            <div className="space-y-4 pl-4 border-l-4 border-blue-500 bg-blue-50/30 -ml-6 pl-8 py-4 rounded-r">
              <div>
                <Label htmlFor="disabilityType" className="text-slate-700">Type of Disability *</Label>
                <Select value={formData.disabilityType} onValueChange={(value) => setFormData({ ...formData, disabilityType: value })}>
                  <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-300">
                    {disabilityTypes.map((type) => (
                      <SelectItem key={type} value={type} className="text-slate-900">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="disabilitySeverity" className="text-slate-700">Severity Level *</Label>
                  <Select value={formData.disabilitySeverity} onValueChange={(value) => setFormData({ ...formData, disabilitySeverity: value })}>
                    <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      {severityLevels.map((level) => (
                        <SelectItem key={level} value={level} className="text-slate-900">{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="disabilityCause" className="text-slate-700">Cause *</Label>
                  <Select value={formData.disabilityCause} onValueChange={(value) => setFormData({ ...formData, disabilityCause: value })}>
                    <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Select cause" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      {disabilityCauses.map((cause) => (
                        <SelectItem key={cause} value={cause} className="text-slate-900">{cause}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="disabilityDetails" className="text-slate-700">Disability Details *</Label>
                <Textarea
                  id="disabilityDetails"
                  value={formData.disabilityDetails}
                  onChange={(e) => setFormData({ ...formData, disabilityDetails: e.target.value })}
                  rows={3}
                  placeholder="Please provide detailed information about your disability"
                  className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="medicalCertificateNumber" className="text-slate-700">Medical Certificate Number</Label>
                  <Input
                    id="medicalCertificateNumber"
                    value={formData.medicalCertificateNumber}
                    onChange={(e) => setFormData({ ...formData, medicalCertificateNumber: e.target.value })}
                    className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <Label htmlFor="medicalCertificateDate" className="text-slate-700">Certificate Date</Label>
                  <Input
                    id="medicalCertificateDate"
                    type="date"
                    value={formData.medicalCertificateDate}
                    onChange={(e) => setFormData({ ...formData, medicalCertificateDate: e.target.value })}
                    className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasPhysicalEvidence"
                  checked={formData.hasPhysicalEvidence}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasPhysicalEvidence: !!checked })}
                  className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label htmlFor="hasPhysicalEvidence" className="cursor-pointer text-slate-700">
                  Physical evidence available (whole-body photograph for apparent disabilities)
                </Label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderAdministrativeStep = () => (
    <div className="space-y-6">
      {showValidationError && validationErrors.length > 0 && (
        <Alert className="bg-red-50 border-red-200 text-red-900">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <div className="font-semibold mb-1">Please complete the following required fields:</div>
            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Administrative and Support Data
          </h3>
          <p className="text-sm text-slate-600 mt-1">Additional information for better service delivery</p>
        </div>

        <div className="space-y-6">
          <div>
            <Label htmlFor="bloodType" className="text-slate-700">Blood Type *</Label>
            <Select value={formData.bloodType} onValueChange={(value) => setFormData({ ...formData, bloodType: value })}>
              <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900">
                <SelectValue placeholder="Select blood type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-300">
                {bloodTypes.map((type) => (
                  <SelectItem key={type} value={type} className="text-slate-900">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">Recorded for emergency use</p>
          </div>

          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                Guardian/Caregiver Details
              </h4>
              <p className="text-sm text-slate-600 mt-1">
                For minors or non-ambulatory individuals
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guardianName" className="text-slate-700">Guardian/Caregiver Name</Label>
                  <Input
                    id="guardianName"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <Label htmlFor="guardianRelationship" className="text-slate-700">Relationship</Label>
                  <Input
                    id="guardianRelationship"
                    value={formData.guardianRelationship}
                    onChange={(e) => setFormData({ ...formData, guardianRelationship: e.target.value })}
                    className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                    placeholder="e.g., Mother, Father, Spouse"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guardianContact" className="text-slate-700">Contact Number</Label>
                  <Input
                    id="guardianContact"
                    type="tel"
                    value={formData.guardianContact}
                    onChange={(e) => setFormData({ ...formData, guardianContact: e.target.value })}
                    className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <Label htmlFor="guardianAddress" className="text-slate-700">Complete Address</Label>
                  <Input
                    id="guardianAddress"
                    value={formData.guardianAddress}
                    onChange={(e) => setFormData({ ...formData, guardianAddress: e.target.value })}
                    className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-green-600" />
                Government ID Numbers
              </h4>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="philHealthNumber" className="text-slate-700">PhilHealth Number</Label>
                <Input
                  id="philHealthNumber"
                  value={formData.philHealthNumber}
                  onChange={(e) => setFormData({ ...formData, philHealthNumber: e.target.value })}
                  className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  placeholder="XX-XXXXXXXXX-X"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sssNumber" className="text-slate-700">SSS Number</Label>
                  <Input
                    id="sssNumber"
                    value={formData.sssNumber}
                    onChange={(e) => setFormData({ ...formData, sssNumber: e.target.value })}
                    className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                    placeholder="XX-XXXXXXX-X"
                  />
                </div>
                <div>
                  <Label htmlFor="gsisNumber" className="text-slate-700">GSIS Number</Label>
                  <Input
                    id="gsisNumber"
                    value={formData.gsisNumber}
                    onChange={(e) => setFormData({ ...formData, gsisNumber: e.target.value })}
                    className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                    placeholder="XXXXXXXXXXX"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="otherIdNumbers" className="text-slate-700">Other ID Numbers</Label>
                <Textarea
                  id="otherIdNumbers"
                  value={formData.otherIdNumbers}
                  onChange={(e) => setFormData({ ...formData, otherIdNumbers: e.target.value })}
                  rows={2}
                  placeholder="List any other government ID numbers"
                  className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h4 className="font-semibold text-slate-900">Educational & Employment Status</h4>
              <p className="text-sm text-slate-600 mt-1">
                Helps in vocational training referrals
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="educationalAttainment" className="text-slate-700">Educational Status *</Label>
                  <Select value={formData.educationalAttainment} onValueChange={(value) => setFormData({ ...formData, educationalAttainment: value })}>
                    <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      {educationalStatus.map((status) => (
                        <SelectItem key={status} value={status} className="text-slate-900">{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="employmentStatus" className="text-slate-700">Employment Status *</Label>
                  <Select value={formData.employmentStatus} onValueChange={(value) => setFormData({ ...formData, employmentStatus: value })}>
                    <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      {employmentStatus.map((status) => (
                        <SelectItem key={status} value={status} className="text-slate-900">{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schoolName" className="text-slate-700">School/University Name</Label>
                  <Input
                    id="schoolName"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <Label htmlFor="employmentDetails" className="text-slate-700">Occupation/Job Title</Label>
                  <Input
                    id="employmentDetails"
                    value={formData.employmentDetails}
                    onChange={(e) => setFormData({ ...formData, employmentDetails: e.target.value })}
                    className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="employerName" className="text-slate-700">Employer Name (if employed)</Label>
                <Input
                  id="employerName"
                  value={formData.employerName}
                  onChange={(e) => setFormData({ ...formData, employerName: e.target.value })}
                  className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      {showValidationError && validationErrors.length > 0 && (
        <Alert className="bg-red-50 border-red-200 text-red-900">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <div className="font-semibold mb-1">Please complete the following required fields:</div>
            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Alert className="bg-blue-50 border-blue-200 text-blue-900">
        <FileText className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Please upload the following required documents to submit your application.
        </AlertDescription>
      </Alert>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Required Documents
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            To submit this information, you need to present the following documents:
          </p>
        </div>

        <div className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 mb-6 text-sm text-slate-700 pl-4">
            <li>Duly Accomplished PWD Registration Form</li>
            <li>Clinical Abstract or Medical Certificate signed by a licensed physician</li>
            <li>Proof of Identity (Birth Certificate, Passport, or valid government ID)</li>
            <li>Proof of Residence (Barangay Certificate or utility bills)</li>
            <li>Recent ID Photos (1x1 or 2x2)</li>
          </ol>

          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.hasPWDRegistrationForm}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasPWDRegistrationForm: !!checked })}
                    className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label className="cursor-pointer text-slate-900 font-medium">1. PWD Registration Form *</Label>
                </div>
              </div>
              <Input
                type="file"
                onChange={(e) => handleFileChange('pwdRegistrationForm', e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.jpg,.png"
                className="mt-2 bg-white border-slate-300 text-slate-900"
              />
              {formData.pwdRegistrationForm && (
                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {formData.pwdRegistrationForm.name}
                </p>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.hasMedicalCertificate}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasMedicalCertificate: !!checked })}
                    className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label className="cursor-pointer text-slate-900 font-medium">2. Medical Certificate *</Label>
                </div>
              </div>
              <Input
                type="file"
                onChange={(e) => handleFileChange('medicalCertificate', e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.jpg,.png"
                className="mt-2 bg-white border-slate-300 text-slate-900"
              />
              {formData.medicalCertificate && (
                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {formData.medicalCertificate.name}
                </p>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.hasProofOfIdentity}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasProofOfIdentity: !!checked })}
                    className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label className="cursor-pointer text-slate-900 font-medium">3. Proof of Identity *</Label>
                </div>
              </div>
              <Input
                type="file"
                onChange={(e) => handleFileChange('proofOfIdentity', e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.png"
                className="mt-2 bg-white border-slate-300 text-slate-900"
              />
              {formData.proofOfIdentity && (
                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {formData.proofOfIdentity.name}
                </p>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.hasProofOfResidence}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasProofOfResidence: !!checked })}
                    className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label className="cursor-pointer text-slate-900 font-medium">4. Proof of Residence *</Label>
                </div>
              </div>
              <Input
                type="file"
                onChange={(e) => handleFileChange('proofOfResidence', e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.png"
                className="mt-2 bg-white border-slate-300 text-slate-900"
              />
              {formData.proofOfResidence && (
                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {formData.proofOfResidence.name}
                </p>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.hasIDPhotos}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasIDPhotos: !!checked })}
                    className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label className="cursor-pointer text-slate-900 font-medium">5. Recent ID Photos *</Label>
                </div>
              </div>
              <Input
                type="file"
                onChange={(e) => handleMultipleFilesChange('idPhotos', e.target.files)}
                accept=".jpg,.jpeg,.png"
                multiple
                className="mt-2 bg-white border-slate-300 text-slate-900"
              />
              {formData.idPhotos.length > 0 && (
                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {formData.idPhotos.length} photo(s) selected
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Review Your Application
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Please review all information before submitting. You can go back to make changes.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">Personal Identification Data</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-slate-50 p-4 rounded-lg">
              <div><span className="font-medium text-slate-700">Name:</span> <span className="text-slate-900">{formData.lastName}, {formData.firstName} {formData.middleName}</span></div>
              <div><span className="font-medium text-slate-700">Date of Birth:</span> <span className="text-slate-900">{formData.dateOfBirth} ({formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : 0} years)</span></div>
              <div><span className="font-medium text-slate-700">Gender:</span> <span className="text-slate-900">{formData.gender}</span></div>
              <div><span className="font-medium text-slate-700">Mobile:</span> <span className="text-slate-900">{formData.mobileNumber}</span></div>
              <div><span className="font-medium text-slate-700">Email:</span> <span className="text-slate-900">{formData.emailAddress}</span></div>
              <div><span className="font-medium text-slate-700">Address:</span> <span className="text-slate-900">{formData.houseNumber} {formData.street}, {formData.barangay}</span></div>
            </div>
          </div>

          {formData.hasDisability && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Medical and Disability Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-slate-50 p-4 rounded-lg">
                <div><span className="font-medium text-slate-700">Type:</span> <span className="text-slate-900">{formData.disabilityType}</span></div>
                <div><span className="font-medium text-slate-700">Severity:</span> <span className="text-slate-900">{formData.disabilitySeverity}</span></div>
                <div><span className="font-medium text-slate-700">Cause:</span> <span className="text-slate-900">{formData.disabilityCause}</span></div>
                <div className="md:col-span-2"><span className="font-medium text-slate-700">Details:</span> <span className="text-slate-900">{formData.disabilityDetails}</span></div>
              </div>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-slate-900 mb-3">Administrative and Support Data</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-slate-50 p-4 rounded-lg">
              <div><span className="font-medium text-slate-700">Blood Type:</span> <span className="text-slate-900">{formData.bloodType}</span></div>
              <div><span className="font-medium text-slate-700">Educational Status:</span> <span className="text-slate-900">{formData.educationalAttainment}</span></div>
              <div><span className="font-medium text-slate-700">Employment Status:</span> <span className="text-slate-900">{formData.employmentStatus}</span></div>
              {formData.guardianName && (
                <div><span className="font-medium text-slate-700">Guardian:</span> <span className="text-slate-900">{formData.guardianName} ({formData.guardianRelationship})</span></div>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-3">Required Documents</h4>
            <div className="bg-slate-50 p-4 rounded-lg">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-slate-900">
                  {formData.hasPWDRegistrationForm ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  PWD Registration Form {formData.pwdRegistrationForm && `(${formData.pwdRegistrationForm.name})`}
                </li>
                <li className="flex items-center gap-2 text-slate-900">
                  {formData.hasMedicalCertificate ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  Medical Certificate {formData.medicalCertificate && `(${formData.medicalCertificate.name})`}
                </li>
                <li className="flex items-center gap-2 text-slate-900">
                  {formData.hasProofOfIdentity ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  Proof of Identity {formData.proofOfIdentity && `(${formData.proofOfIdentity.name})`}
                </li>
                <li className="flex items-center gap-2 text-slate-900">
                  {formData.hasProofOfResidence ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  Proof of Residence {formData.proofOfResidence && `(${formData.proofOfResidence.name})`}
                </li>
                <li className="flex items-center gap-2 text-slate-900">
                  {formData.hasIDPhotos ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  ID Photos ({formData.idPhotos.length} files)
                </li>
              </ul>
            </div>
          </div>

          <Alert className="bg-yellow-50 border-yellow-200 text-yellow-900">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>Declaration:</strong> I certify that the information provided above is true and correct. I understand that any false statement may result in the disapproval of my application.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )

  const getStepTitle = () => {
    switch (currentStep) {
      case 'personal': return 'Personal Identification Data'
      case 'medical': return 'Medical and Disability Information'
      case 'administrative': return 'Administrative and Support Data'
      case 'documents': return 'Required Documents'
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

  const StepIcon = getStepIcon()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setShowExitDialog(true)}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-slate-900">Vulnerable Person Registration</h1>
            <div className="text-sm text-slate-600 font-medium">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-teal-600 transition-all duration-500"
                style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <StepIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{getStepTitle()}</h2>
                  <p className="text-sm text-slate-600">
                    {currentStep === 'personal' && 'Provide your personal information and address'}
                    {currentStep === 'medical' && 'Share medical and disability details (if applicable)'}
                    {currentStep === 'administrative' && 'Add additional information for better service'}
                    {currentStep === 'documents' && 'Upload required supporting documents'}
                    {currentStep === 'review' && 'Review all information before submitting'}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              {currentStep === 'personal' && renderPersonalStep()}
              {currentStep === 'medical' && renderMedicalStep()}
              {currentStep === 'administrative' && renderAdministrativeStep()}
              {currentStep === 'documents' && renderDocumentsStep()}
              {currentStep === 'review' && renderReviewStep()}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>

            {currentStep === 'review' ? (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Submit Application
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-600">
          © 2026 Community Resource Mapping System. San Policarpo, Eastern Samar.
        </div>
      </footer>

      {/* Exit Confirmation Dialog */}
      <ConfirmDialog
        open={showExitDialog}
        onClose={() => setShowExitDialog(false)}
        onConfirm={() => router.push('/')}
        title="Exit Registration"
        description="Are you sure you want to exit? Your progress will not be saved."
        confirmLabel="Yes, Exit"
        cancelLabel="Continue Registration"
      />

      {/* Success Modal */}
      <SuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Registration Submitted Successfully!"
        message="Your application has been submitted and is now under review. You will be notified once approved."
      />
    </div>
  )
}
