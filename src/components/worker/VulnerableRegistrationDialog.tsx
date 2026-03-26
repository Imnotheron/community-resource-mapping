'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  User,
  MessageSquare,
  MapPin,
  FileText,
  Check,
  CheckCircle,
  UserPlus,
  Phone,
  ArrowLeft,
  ArrowRight,
  Clock,
  XCircle,
  Map as MapIcon,
  Crosshair
} from 'lucide-react'

// Dynamically import map component to avoid SSR issues
const LocationPicker = dynamic(() => import('@/components/map/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
      <div className="text-slate-600 dark:text-slate-400">Loading map...</div>
    </div>
  )
})

interface VulnerableRegistrationDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  formData: any
  setFormData: (data: any) => void
  currentStep: number
  setCurrentStep: (step: number) => void
  isRegistering: boolean
  barangays: string[]
  handleVulnerabilityToggle: (typeId: string) => void
}

export default function VulnerableRegistrationDialog({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  currentStep,
  setCurrentStep,
  isRegistering,
  barangays,
  handleVulnerabilityToggle
}: VulnerableRegistrationDialogProps) {
  const [showMap, setShowMap] = useState(false)

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData({ ...formData, latitude: lat, longitude: lng })
  }

  const handleClose = () => {
    setFormData({
      lastName: '',
      firstName: '',
      middleName: '',
      suffix: '',
      dateOfBirth: '',
      gender: '',
      civilStatus: '',
      mobileNumber: '',
      emailAddress: '',
      landlineNumber: '',
      houseNumber: '',
      street: '',
      barangay: 'Barangay No. 1 (Poblacion)',
      municipality: 'San Policarpo',
      province: 'Eastern Samar',
      latitude: 12.1792,
      longitude: 125.5072,
      educationalAttainment: '',
      employmentStatus: '',
      employmentDetails: '',
      selectedVulnerabilities: [],
      disabilityType: '',
      disabilityCause: '',
      pwdIdNumber: '',
      otherVulnerabilityDescription: '',
      hasMedicalCondition: false,
      medicalConditions: '',
      needsAssistance: false,
      assistanceType: '',
      emergencyContact: '',
      emergencyPhone: '',
      hasRepresentative: false,
      representativeName: '',
      representativeRelationship: '',
      representativePhone: '',
      representativeEmail: '',
      hasAuthorizationLetter: false
    })
    setCurrentStep(1)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-white">
                  Register Vulnerable Person
                </DialogTitle>
                <DialogDescription className="text-emerald-100">
                  Create a new account for a vulnerable individual
                </DialogDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white hover:bg-white/20"
            >
              <XCircle className="w-5 h-5" />
            </Button>
          </div>

          {/* Modern Step Indicator */}
          <div className="mt-6">
            <div className="flex items-center justify-between relative">
              {/* Progress bar background */}
              <div className="absolute top-4 left-0 right-0 h-1 bg-white/20 rounded-full"></div>
              {/* Progress bar fill */}
              <div
                className="absolute top-4 left-0 h-1 bg-white rounded-full transition-all duration-500"
                style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
              ></div>

              {[
                { step: 1, label: 'Personal', icon: User },
                { step: 2, label: 'Contact', icon: MessageSquare },
                { step: 3, label: 'Address', icon: MapPin },
                { step: 4, label: 'Details', icon: FileText },
                { step: 5, label: 'Login', icon: UserPlus }
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex flex-col items-center relative z-10 cursor-pointer"
                  onClick={() => currentStep > item.step && setCurrentStep(item.step)}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                      currentStep >= item.step
                        ? 'bg-white text-emerald-600 shadow-lg'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {currentStep > item.step ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <item.icon className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium transition-all ${
                      currentStep >= item.step ? 'text-white' : 'text-white/60'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      Personal Information
                    </CardTitle>
                    <CardDescription>
                      Provide the personal details of the vulnerable individual
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="DELA CRUZ"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="JUAN"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="middleName">Middle Name</Label>
                        <Input
                          id="middleName"
                          value={formData.middleName}
                          onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                          placeholder="SANTOS"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="suffix">Suffix</Label>
                        <Select value={formData.suffix || "NONE"} onValueChange={(value) => setFormData({ ...formData, suffix: value === "NONE" ? "" : value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select suffix" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">No Suffix</SelectItem>
                            <SelectItem value="JR">Jr.</SelectItem>
                            <SelectItem value="SR">Sr.</SelectItem>
                            <SelectItem value="II">II</SelectItem>
                            <SelectItem value="III">III</SelectItem>
                            <SelectItem value="IV">IV</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender *</Label>
                        <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="civilStatus">Civil Status *</Label>
                      <Select value={formData.civilStatus} onValueChange={(value) => setFormData({ ...formData, civilStatus: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select civil status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Widow">Widow</SelectItem>
                          <SelectItem value="Widower">Widower</SelectItem>
                          <SelectItem value="Separated">Separated</SelectItem>
                          <SelectItem value="Cohabiting">Cohabiting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Contact Information */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      Contact Information
                    </CardTitle>
                    <CardDescription>
                      Provide contact details for communication
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mobileNumber">Mobile Number *</Label>
                        <Input
                          id="mobileNumber"
                          type="tel"
                          value={formData.mobileNumber}
                          onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                          placeholder="09123456789"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="landlineNumber">Landline Number</Label>
                        <Input
                          id="landlineNumber"
                          type="tel"
                          value={formData.landlineNumber}
                          onChange={(e) => setFormData({ ...formData, landlineNumber: e.target.value })}
                          placeholder="(088) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emailAddress">Email Address *</Label>
                      <Input
                        id="emailAddress"
                        type="email"
                        value={formData.emailAddress}
                        onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                        placeholder="juan@example.com"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Address */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      Address Information
                    </CardTitle>
                    <CardDescription>
                      Provide the complete address
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="houseNumber">House Number *</Label>
                      <Input
                        id="houseNumber"
                        value={formData.houseNumber}
                        onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                        placeholder="123"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="street">Street Name *</Label>
                      <Input
                        id="street"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        placeholder="Rizal Street"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="barangay">Barangay *</Label>
                      <Select
                        value={formData.barangay}
                        onValueChange={(value) => setFormData({ ...formData, barangay: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Barangay" />
                        </SelectTrigger>
                        <SelectContent>
                          {barangays.map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="municipality">Municipality *</Label>
                      <Input
                        id="municipality"
                        value={formData.municipality}
                        onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                        placeholder="San Policarpo"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="province">Province *</Label>
                      <Input
                        id="province"
                        value={formData.province}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                        placeholder="Eastern Samar"
                        required
                      />
                    </div>

                    {/* Map Location Picker */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <MapIcon className="w-4 h-4 text-purple-600" />
                        <Label className="text-base font-semibold">House Location on Map</Label>
                        <span className="text-xs text-slate-500 dark:text-slate-400">(Optional but recommended)</span>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                        <LocationPicker
                          center={[12.1792, 125.5072]}
                          onLocationSelect={handleLocationSelect}
                          initialPosition={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : undefined}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Education & Vulnerability */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      Additional Information
                    </CardTitle>
                    <CardDescription>
                      Educational background and vulnerability details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="educationalAttainment">Educational Attainment</Label>
                        <Select
                          value={formData.educationalAttainment}
                          onValueChange={(value) => setFormData({ ...formData, educationalAttainment: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Educational Attainment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="No Formal Education">No Formal Education</SelectItem>
                            <SelectItem value="Elementary School">Elementary School</SelectItem>
                            <SelectItem value="High School">High School</SelectItem>
                            <SelectItem value="College Undergraduate">College Undergraduate</SelectItem>
                            <SelectItem value="College Graduate">College Graduate</SelectItem>
                            <SelectItem value="Vocational/Technical">Vocational/Technical</SelectItem>
                            <SelectItem value="Postgraduate/Masteral">Postgraduate/Masteral</SelectItem>
                            <SelectItem value="Doctorate">Doctorate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="employmentStatus">Employment Status</Label>
                        <Select
                          value={formData.employmentStatus}
                          onValueChange={(value) => setFormData({ ...formData, employmentStatus: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Employment Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Employed">Employed</SelectItem>
                            <SelectItem value="Unemployed">Unemployed</SelectItem>
                            <SelectItem value="Self-employed">Self-employed</SelectItem>
                            <SelectItem value="Retired">Retired</SelectItem>
                            <SelectItem value="Student">Student</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="employmentDetails">Employment Details (if employed)</Label>
                        <Textarea
                          id="employmentDetails"
                          value={formData.employmentDetails}
                          onChange={(e) => setFormData({ ...formData, employmentDetails: e.target.value })}
                          placeholder="Job title, company, etc."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Vulnerability Type *</Label>
                        <Select
                          value={formData.selectedVulnerabilities[0] || ''}
                          onValueChange={(value) => setFormData({ ...formData, selectedVulnerabilities: [value] })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Vulnerability Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SENIOR_CITIZEN">Senior Citizen (60+ years old)</SelectItem>
                            <SelectItem value="PWD">Person with Disability</SelectItem>
                            <SelectItem value="PREGNANT">Pregnant</SelectItem>
                            <SelectItem value="CHRONIC_ILLNESS">Chronic Illness</SelectItem>
                            <SelectItem value="OTHER">Other Vulnerable Situation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.selectedVulnerabilities.includes('PWD') && (
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="disabilityType">Disability Type *</Label>
                            <Select
                              value={formData.disabilityType}
                              onValueChange={(value) => setFormData({ ...formData, disabilityType: value })}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Disability Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Psychosocial / Mental Disability">Psychosocial / Mental Disability</SelectItem>
                                <SelectItem value="Orthopedic / Musculoskeletal Disability">Orthopedic / Musculoskeletal Disability</SelectItem>
                                <SelectItem value="Visual Impairment">Visual Impairment</SelectItem>
                                <SelectItem value="Hearing Impairment">Hearing Impairment</SelectItem>
                                <SelectItem value="Speech Impairment">Speech Impairment</SelectItem>
                                <SelectItem value="Intellectual Disability">Intellectual Disability</SelectItem>
                                <SelectItem value="Learning Disability">Learning Disability</SelectItem>
                                <SelectItem value="Chronic Illness">Chronic Illness</SelectItem>
                                <SelectItem value="Other Disability">Other Disability</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="disabilityCause">Cause of Disability *</Label>
                            <Select
                              value={formData.disabilityCause}
                              onValueChange={(value) => setFormData({ ...formData, disabilityCause: value })}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Cause" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Congenital / Inborn">Congenital / Inborn</SelectItem>
                                <SelectItem value="Acquired due to illness">Acquired due to illness</SelectItem>
                                <SelectItem value="Result of injury">Result of injury</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="pwdIdNumber">PWD ID Number (if available)</Label>
                            <Input
                              id="pwdIdNumber"
                              value={formData.pwdIdNumber}
                              onChange={(e) => setFormData({ ...formData, pwdIdNumber: e.target.value })}
                              placeholder="PWD-XXXXX"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 5: Login Credentials & Emergency Contact */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Login Credentials Card */}
                <Card className="border-2 border-emerald-200 dark:border-emerald-800 shadow-md bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-emerald-700 dark:text-emerald-400">
                      <div className="w-8 h-8 bg-emerald-600 dark:bg-emerald-600 rounded-lg flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-white" />
                      </div>
                      Login Credentials
                    </CardTitle>
                    <CardDescription className="text-emerald-700 dark:text-emerald-400">
                      Account login information that will be created
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="loginEmail" className="text-base font-semibold">Email Address *</Label>
                      <Input
                        id="loginEmail"
                        type="email"
                        value={formData.emailAddress}
                        onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                        placeholder="juan@example.com"
                        className="bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700"
                        required
                      />
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        This email will be used as the login username for the account
                      </p>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                            Password Information
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            A secure 8-character password will be automatically generated and sent to the email address above upon successful registration. The vulnerable person can use these credentials to log in and view their profile, relief distributions, and provide feedback.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Emergency Contact Card */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <Phone className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                      Emergency Contact
                    </CardTitle>
                    <CardDescription>
                      Provide emergency contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">Emergency Contact Name *</Label>
                      <Input
                        id="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                        placeholder="Maria Santos"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Emergency Phone *</Label>
                      <Input
                        id="emergencyPhone"
                        type="tel"
                        value={formData.emergencyPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                        placeholder="09123456789"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Registration Summary Card */}
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5 text-purple-600" />
                      Registration Summary
                    </CardTitle>
                    <CardDescription>
                      Review all information before submitting
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Full Name</p>
                          <p className="font-medium">{formData.firstName} {formData.middleName} {formData.lastName} {formData.suffix}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Date of Birth</p>
                          <p className="font-medium">{formData.dateOfBirth}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Gender</p>
                          <p className="font-medium">{formData.gender}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Civil Status</p>
                          <p className="font-medium">{formData.civilStatus}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Mobile Number</p>
                          <p className="font-medium">{formData.mobileNumber}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Email</p>
                          <p className="font-medium">{formData.emailAddress}</p>
                        </div>
                      </div>

                      <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400">Address</p>
                        <p className="font-medium">{formData.houseNumber} {formData.street}, {formData.barangay}, {formData.municipality}, {formData.province}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Vulnerability Type</p>
                          <p className="font-medium">{formData.selectedVulnerabilities[0] || 'Not specified'}</p>
                        </div>
                        {formData.selectedVulnerabilities.includes('PWD') && formData.disabilityType && (
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Disability Type</p>
                            <p className="font-medium">{formData.disabilityType}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Emergency Contact</p>
                          <p className="font-medium">{formData.emergencyContact}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Emergency Phone</p>
                          <p className="font-medium">{formData.emergencyPhone}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 flex items-center justify-between flex-shrink-0 shadow-lg">
            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Step {currentStep} of 5
            </div>
            <div className="flex items-center gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  className="gap-2 font-medium px-6"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>
              )}
              {currentStep < 5 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 gap-2 font-medium px-6"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isRegistering}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 gap-2 min-w-[200px] font-medium px-6"
                >
                  {isRegistering ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Register Vulnerable Person
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
