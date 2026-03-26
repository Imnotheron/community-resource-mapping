'use client'
// Refactored Vulnerable Dashboard with CollapsibleSidebar, ConfirmDialog, SuccessModal, and organized tabs

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AnnouncementList from '@/components/announcements/AnnouncementList'
import { useUserSync } from '@/hooks/useUserSync'
import { safeParseVulnerabilityTypes } from '@/lib/json-utils'
import { CollapsibleSidebar, type SidebarItem } from '@/components/dashboard/CollapsibleSidebar'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SuccessModal } from '@/components/ui/success-modal'
import UserProfileModal from '@/components/modals/UserProfileModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  User,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  FileText,
  Calendar,
  Phone,
  Mail,
  GraduationCap,
  Shield,
  Briefcase,
  UserPlus,
  MessageSquare,
  Send,
  Loader2,
  Info,
  Lightbulb,
  AlertCircle,
  MoreHorizontal,
  Tag,
  X,
} from 'lucide-react'

interface ReliefDistribution {
  id: string
  distributionDate: string
  distributionType: string
  itemsProvided: string
  quantity: number
  notes: string
  worker: {
    id: string
    name: string
    email: string
  }
  feedback?: Array<{
    id: string
    feedbackType: string
    status: string
    createdAt: string
  }>
}

interface VulnerableProfile {
  id: string
  userId: string
  user: {
    name: string
    email: string
    phone: string
    profilePicture?: string | null
  }
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
  latitude: number
  longitude: number
  educationalAttainment: string
  employmentStatus: string
  employmentDetails: string
  vulnerabilityTypes: string
  disabilityType: string
  disabilityCause: string
  disabilityIdNumber: string
  emergencyContact: string
  emergencyPhone: string
  hasMedicalCondition: boolean
  medicalConditions: string
  needsAssistance: boolean
  assistanceType: string
  hasRepresentative: boolean
  representativeName: string
  representativeRelationship: string
  representativePhone: string
  representativeEmail: string
  hasAuthorizationLetter: boolean
  registrationStatus: string
  rejectionReason: string
  createdAt: string
  reliefDistributions: ReliefDistribution[]
}

// Info Row Component
function InfoRow({ label, value, icon, mono = false }: { label: string; value: string; icon?: any; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <div className="text-blue-600 mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`font-medium text-slate-900 dark:text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
      </div>
    </div>
  )
}

export default function VulnerableDashboard() {
  const router = useRouter()
  const { user: currentUser, isLoading: isUserSyncing } = useUserSync()
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState<VulnerableProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize sidebar collapsed state - start with false to avoid hydration mismatch
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load sidebar state from localStorage after mount (client-side only)
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('sidebarCollapsed')
      if (savedState !== null) {
        setSidebarCollapsed(JSON.parse(savedState))
      }
    } catch (error) {
      console.error('Error loading sidebar state:', error)
    }
  }, [])

  // Distribution feedback state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [selectedDistribution, setSelectedDistribution] = useState<ReliefDistribution | null>(null)
  const [feedbackType, setFeedbackType] = useState<'MESSAGE' | 'FEEDBACK' | 'REPORT'>('MESSAGE')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  
  // General feedback state
  const [generalFeedbackModalOpen, setGeneralFeedbackModalOpen] = useState(false)
  const [generalFeedbackType, setGeneralFeedbackType] = useState<'MESSAGE' | 'FEEDBACK' | 'REPORT' | 'COMPLIMENT' | 'SUGGESTION' | 'SERVICE_COMPLAINT' | 'OTHER'>('FEEDBACK')
  const [generalFeedbackSubject, setGeneralFeedbackSubject] = useState('')
  const [generalFeedbackMessage, setGeneralFeedbackMessage] = useState('')
  const [isSubmittingGeneralFeedback, setIsSubmittingGeneralFeedback] = useState(false)
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)


  useEffect(() => {
    if (isUserSyncing) return

    if (!currentUser) {
      router.push('/')
      return
    }

    if (currentUser.role.toLowerCase() !== 'vulnerable') {
      router.push('/')
      return
    }

    fetchProfile(currentUser.id)
  }, [currentUser, isUserSyncing])

  const fetchProfile = async (userId: string) => {
    try {
      const res = await fetch(`/api/vulnerable/profile?userId=${userId}`)
      const data = await res.json()
      if (data.success) {
        setProfile(data.profile)
      } else {
        if (data.message === 'Profile not found') {
          router.push('/vulnerable/registration')
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setShowLogoutDialog(true)
  }

  const confirmLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    router.push('/')
  }

  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    // Save to localStorage for persistence
    try {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(newState))
    } catch (error) {
      console.error('Error saving sidebar state:', error)
    }
  }

  const handleProfileClick = () => {
    setShowUserProfileModal(true)
  }

  const handleProfileModalClose = () => {
    setShowUserProfileModal(false)
    // Refresh profile to get updated profile picture
    if (currentUser) {
      fetchProfile(currentUser.id)
    }
  }

  const handleOpenFeedbackModal = (distribution: ReliefDistribution) => {
    setSelectedDistribution(distribution)
    setFeedbackModalOpen(true)
    setFeedbackType('MESSAGE')
    setFeedbackMessage('')
  }

  const handleCloseFeedbackModal = () => {
    setFeedbackModalOpen(false)
    setSelectedDistribution(null)
    setFeedbackMessage('')
  }

  const handleSubmitFeedback = async () => {
    if (!selectedDistribution || !profile) return

    setIsSubmittingFeedback(true)
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return

      const user = JSON.parse(userStr)

      const res = await fetch('/api/vulnerable/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reliefDistributionId: selectedDistribution.id,
          userId: user.id,
          feedbackType,
          message: feedbackMessage
        })
      })

      const data = await res.json()

      if (data.success) {
        setSuccessMessage('Thank you for your feedback! Your response has been submitted successfully.')
        setShowSuccessModal(true)
        await fetchProfile(user.id)
        handleCloseFeedbackModal()
      } else {
        setSuccessMessage('Failed to submit feedback. Please try again.')
        setShowSuccessModal(true)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      setSuccessMessage('Failed to submit feedback. Please try again.')
      setShowSuccessModal(true)
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const handleOpenGeneralFeedbackModal = () => {
    setGeneralFeedbackModalOpen(true)
    setGeneralFeedbackType('FEEDBACK')
    setGeneralFeedbackSubject('')
    setGeneralFeedbackMessage('')
  }

  const handleCloseGeneralFeedbackModal = () => {
    setGeneralFeedbackModalOpen(false)
    setGeneralFeedbackSubject('')
    setGeneralFeedbackMessage('')
  }

  const handleSubmitGeneralFeedback = async () => {
    if (!profile) return

    setIsSubmittingGeneralFeedback(true)
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return

      const user = JSON.parse(userStr)

      const res = await fetch('/api/general-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          type: generalFeedbackType,
          subject: generalFeedbackSubject,
          message: generalFeedbackMessage
        })
      })

      const data = await res.json()

      if (data.success) {
        setSuccessMessage('Thank you for your feedback! Your response has been submitted successfully.')
        setShowSuccessModal(true)
        handleCloseGeneralFeedbackModal()
      } else {
        setSuccessMessage(data.error || 'Failed to submit feedback. Please try again.')
        setShowSuccessModal(true)
      }
    } catch (error) {
      console.error('Error submitting general feedback:', error)
      setSuccessMessage('Failed to submit feedback. Please try again.')
      setShowSuccessModal(true)
    } finally {
      setIsSubmittingGeneralFeedback(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return (
          <Badge className="bg-yellow-500 gap-2">
            <Clock className="w-3 h-3" />
            Pending Review
          </Badge>
        )
      case 'approved':
        return (
          <Badge className="bg-blue-500 gap-2">
            <CheckCircle className="w-3 h-3" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-500 gap-2">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not specified'
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getFeedbackPlaceholder = (type: 'MESSAGE' | 'FEEDBACK' | 'REPORT') => {
    switch (type) {
      case 'MESSAGE':
        return 'Share a message or thank you note...'
      case 'FEEDBACK':
        return 'Share your experience or feedback...'
      case 'REPORT':
        return 'Report any issues or concerns about the relief distribution...'
      default:
        return 'Enter your message...'
    }
  }

  const getGeneralFeedbackPlaceholder = (type: 'MESSAGE' | 'FEEDBACK' | 'REPORT' | 'COMPLIMENT' | 'SUGGESTION' | 'SERVICE_COMPLAINT' | 'OTHER') => {
    switch (type) {
      case 'MESSAGE':
        return 'Share a message or thank you note to our team...'
      case 'FEEDBACK':
        return 'Share your experience or feedback about our services...'
      case 'REPORT':
        return 'Report any issues or concerns...'
      case 'COMPLIMENT':
        return 'Share what you liked about our service...'
      case 'SUGGESTION':
        return 'Suggest improvements or new features...'
      case 'SERVICE_COMPLAINT':
        return 'Describe any service issues you experienced...'
      case 'OTHER':
        return 'Share any other thoughts or concerns...'
      default:
        return 'Enter your message...'
    }
  }

  const hasReceivedRelief = profile?.reliefDistributions && profile.reliefDistributions.length > 0

  // Sidebar items for vulnerable users
  const sidebarItems: SidebarItem[] = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'distributions', label: 'Distributions', icon: Package, badge: hasReceivedRelief ? profile?.reliefDistributions.length : 0 },
    { id: 'announcements', label: 'Announcements', icon: FileText },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center">
        <div className="text-blue-600 dark:text-blue-400 flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center">
        <Card className="max-w-md shadow-xl">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>
              Please complete your registration to access your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/vulnerable/registration')} className="w-full bg-blue-600 hover:bg-blue-700">
              Complete Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sidebarMargin = 80 // Default collapsed width

  if (isUserSyncing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Collapsible Sidebar */}
      <CollapsibleSidebar
        user={currentUser!}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onProfileClick={handleProfileClick}
        items={sidebarItems}
        role="vulnerable"
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-40 shadow-sm">
          {/* Logos Row - Left, Center, Right */}
          <div className="grid grid-cols-3 items-center mb-2">
            {/* Top Left - San Policarpo Logo */}
            <div className="flex justify-start">
              <img
                src="/logo-sampolicarpo.jpg"
                alt="San Policarpo Logo"
                className="h-12 md:h-14 w-auto object-contain"
              />
            </div>

            {/* Middle - ESSU Logo */}
            <div className="flex justify-center">
              <img
                src="/logo-essu.jpg"
                alt="ESSU Logo"
                className="h-12 md:h-14 w-auto object-contain"
              />
            </div>

            {/* Top Right - DSWD Logo */}
            <div className="flex justify-end">
              <img
                src="/logo-dswd.png"
                alt="DSWD Logo"
                className="h-12 md:h-14 w-auto object-contain"
              />
            </div>
          </div>

          {/* Dashboard Title and Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-sm text-gray-500">Welcome back, {profile?.firstName || 'User'}!</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleOpenGeneralFeedbackModal}
                className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-lg"
              >
                <Send className="w-4 h-4" />
                Give Feedback
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {/* Profile Tab - ONLY profile information */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Status Card */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold">
                        {profile.firstName} {profile.lastName}
                      </CardTitle>
                      <CardDescription className="text-blue-50 text-base mt-1">
                        Vulnerable / PWD Profile
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-50 text-sm">Status:</span>
                      <Badge className={profile.registrationStatus === 'APPROVED' ? 'bg-white text-blue-600' : 'bg-yellow-400 text-yellow-900'}>
                        {profile.registrationStatus}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-white">
                  {profile.registrationStatus === 'PENDING' && (
                    <div className="flex gap-3 items-start">
                      <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">
                        Your registration is under review. Our administrators are reviewing your application. You will be notified once your registration is approved.
                      </p>
                    </div>
                  )}
                  {profile.registrationStatus === 'REJECTED' && profile.rejectionReason && (
                    <div className="flex gap-3 items-start">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold mb-1">Registration Rejected</p>
                        <p><strong>Reason:</strong> {profile.rejectionReason}</p>
                        <p className="mt-1">Please contact your local barangay office for assistance or submit a new registration.</p>
                      </div>
                    </div>
                  )}
                  {profile.registrationStatus === 'APPROVED' && (
                    <div className="flex gap-3 items-start">
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">
                        Your profile is active and you are eligible to receive assistance.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Personal Information Card */}
              <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <InfoRow label="Full Name" value={`${profile.lastName}, ${profile.firstName} ${profile.middleName} ${profile.suffix}`} />
                    <InfoRow label="Date of Birth" value={formatDate(profile.dateOfBirth)} icon={<Calendar className="w-4 h-4" />} />
                    <InfoRow label="Gender" value={profile.gender || 'Not specified'} />
                    <InfoRow label="Civil Status" value={profile.civilStatus} icon={<Shield className="w-4 h-4" />} />
                    <InfoRow label="Email Address" value={profile.emailAddress} icon={<Mail className="w-4 h-4" />} />
                    <InfoRow label="Mobile Number" value={profile.mobileNumber} icon={<Phone className="w-4 h-4" />} />
                    {profile.landlineNumber && <InfoRow label="Landline" value={profile.landlineNumber} icon={<Phone className="w-4 h-4" />} />}
                    <InfoRow label="Educational Attainment" value={profile.educationalAttainment || 'Not specified'} icon={<GraduationCap className="w-4 h-4" />} />
                    <InfoRow label="Employment Status" value={profile.employmentStatus || 'Not specified'} icon={<Briefcase className="w-4 h-4" />} />
                    {profile.employmentDetails && <InfoRow label="Employment Details" value={profile.employmentDetails} />}
                  </div>
                </CardContent>
              </Card>

              {/* Address & Location Card */}
              <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Address & Location
                  </CardTitle>
                  <CardDescription>Your residential information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <InfoRow label="Complete Address" value={`${profile.houseNumber} ${profile.street}, ${profile.barangay}`} />
                    <InfoRow label="Barangay" value={profile.barangay} />
                    <InfoRow label="Municipality" value={profile.municipality} />
                    <InfoRow label="Province" value={profile.province} />
                    {profile.latitude && profile.longitude && (
                      <InfoRow label="GPS Coordinates" value={`${profile.latitude.toFixed(6)}, ${profile.longitude.toFixed(6)}`} />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact Card */}
              <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-blue-600" />
                    Emergency Contact
                  </CardTitle>
                  <CardDescription>Your emergency contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <InfoRow label="Emergency Contact Name" value={profile.emergencyContact || 'Not provided'} />
                    <InfoRow label="Emergency Phone" value={profile.emergencyPhone || 'Not provided'} />
                  </div>
                </CardContent>
              </Card>

              {/* Vulnerability Assessment Card */}
              <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Vulnerability Assessment
                  </CardTitle>
                  <CardDescription>Your disability details and assistance needs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Vulnerability Types:</p>
                    <div className="flex flex-wrap gap-2">
                      {safeParseVulnerabilityTypes(profile.vulnerabilityTypes).map((type: string, i: number) => (
                        <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{type.replace(/_/g, ' ')}</Badge>
                      ))}
                    </div>
                  </div>

                  {profile.disabilityType && (
                    <div className="grid gap-4 pt-4 border-t">
                      <InfoRow label="Type of Disability" value={profile.disabilityType} />
                      <InfoRow label="Cause of Disability" value={profile.disabilityCause || 'Not specified'} />
                      {profile.disabilityIdNumber && <InfoRow label="PWD ID Number" value={profile.disabilityIdNumber} />}
                    </div>
                  )}

                  {(profile.hasMedicalCondition || profile.needsAssistance) && (
                    <div className="pt-4 border-t">
                      {profile.hasMedicalCondition && profile.medicalConditions && (
                        <InfoRow label="Medical Conditions" value={profile.medicalConditions} />
                      )}
                      {profile.needsAssistance && profile.assistanceType && (
                        <InfoRow label="Assistance Required" value={profile.assistanceType} />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Representative Card */}
              {profile.hasRepresentative && (
                <Card className="shadow-sm border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-blue-600" />
                      Representative & Guardian
                    </CardTitle>
                    <CardDescription>Caregiver/Guardian acting on your behalf</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <InfoRow label="Representative Name" value={profile.representativeName} />
                      <InfoRow label="Relationship" value={profile.representativeRelationship || 'Not specified'} />
                      <InfoRow label="Representative Phone" value={profile.representativePhone || 'Not specified'} icon={<Phone className="w-4 h-4" />} />
                      <InfoRow label="Representative Email" value={profile.representativeEmail || 'Not provided'} icon={<Mail className="w-4 h-4" />} />
                      <InfoRow label="Authorization Letter" value={profile.hasAuthorizationLetter ? '✓ Letter provided' : 'Not provided'} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Account Information Card */}
              <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Account Information
                  </CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="Registration Date" value={new Date(profile.createdAt).toLocaleDateString()} />
                  <InfoRow label="Profile ID" value={profile.id} mono />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Distributions Tab - ONLY relief distribution history */}
          {activeTab === 'distributions' && (
            <div className="max-w-4xl mx-auto">
              <Card className="shadow-sm">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Relief Distributions
                  </CardTitle>
                  <CardDescription>Your complete relief distribution history</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {!hasReceivedRelief ? (
                    <div className="text-center py-12 text-slate-500">
                      <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <p className="text-lg font-medium">No relief distributions yet</p>
                      <p className="text-sm mt-2">You will see your relief history here once you receive assistance</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {profile.reliefDistributions
                        .sort((a, b) => new Date(b.distributionDate).getTime() - new Date(a.distributionDate).getTime())
                        .map((dist) => (
                          <div key={dist.id} className="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <p className="font-semibold text-blue-900 dark:text-blue-100 text-lg">{dist.distributionType}</p>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                  <Calendar className="w-4 h-4 inline mr-1" />
                                  {new Date(dist.distributionDate).toLocaleString()}
                                </p>
                              </div>
                              <Badge className="bg-blue-600">
                                ✓ Received
                              </Badge>
                            </div>
                            <p className="text-blue-800 dark:text-blue-200 mb-4">
                              <strong>Items:</strong> {dist.itemsProvided || 'No items provided'}
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                              Distributed by: {dist.worker?.name || 'Unknown'}
                            </p>
                            {!dist.feedback || dist.feedback.length === 0 ? (
                              <Button
                                onClick={() => handleOpenFeedbackModal(dist)}
                                className="bg-blue-600 hover:bg-blue-700 gap-2"
                              >
                                <MessageSquare className="w-4 h-4" />
                                Give Feedback
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                <CheckCircle className="w-5 h-5" />
                                <span>Feedback submitted</span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Announcements Tab - ONLY announcements */}
          {activeTab === 'announcements' && (
            <div className="max-w-4xl mx-auto">
              <AnnouncementList userRole="VULNERABLE" />
            </div>
          )}

          {/* Feedback Tab - ONLY feedback submission */}
          {activeTab === 'feedback' && (
            <div className="max-w-4xl mx-auto">
              <Card className="shadow-sm">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    Send Feedback
                  </CardTitle>
                  <CardDescription>Share your thoughts, suggestions, or concerns with us</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageSquare className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">We Value Your Feedback</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                      Have suggestions, compliments, or concerns about our services? Let us know! Your feedback helps us improve.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button
                        onClick={handleOpenGeneralFeedbackModal}
                        className="bg-blue-600 hover:bg-blue-700 gap-2 text-base px-8 py-6"
                      >
                        <Send className="w-5 h-5" />
                        Submit General Feedback
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Feedback Modal for Distribution */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-2 shadow-2xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent font-bold">
                Share Your Feedback
              </span>
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 dark:text-slate-400 mt-2">
              {selectedDistribution && (
                <span className="block mt-1">
                  For: <strong>{selectedDistribution.distributionType}</strong> received on{' '}
                  {new Date(selectedDistribution.distributionDate).toLocaleDateString('en-PH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Feedback Type Selection with Cards */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                What would you like to share? <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-1 gap-3">
                {/* MESSAGE */}
                <button
                  type="button"
                  onClick={() => setFeedbackType('MESSAGE')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    feedbackType === 'MESSAGE'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${feedbackType === 'MESSAGE' ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <Send className={`w-5 h-5 ${feedbackType === 'MESSAGE' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${feedbackType === 'MESSAGE' ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}>Thank You Message</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Say thank you or share a note with our team
                      </p>
                    </div>
                  </div>
                </button>

                {/* FEEDBACK */}
                <button
                  type="button"
                  onClick={() => setFeedbackType('FEEDBACK')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    feedbackType === 'FEEDBACK'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${feedbackType === 'FEEDBACK' ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <MessageSquare className={`w-5 h-5 ${feedbackType === 'FEEDBACK' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${feedbackType === 'FEEDBACK' ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}>Your Experience</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Share how the distribution went for you
                      </p>
                    </div>
                  </div>
                </button>

                {/* REPORT */}
                <button
                  type="button"
                  onClick={() => setFeedbackType('REPORT')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    feedbackType === 'REPORT'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${feedbackType === 'REPORT' ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <AlertTriangle className={`w-5 h-5 ${feedbackType === 'REPORT' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${feedbackType === 'REPORT' ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>Report an Issue</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Report any problems or concerns
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Message Field */}
            <div className="space-y-2">
              <Label htmlFor="feedback-message" className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Your Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="feedback-message"
                placeholder={getFeedbackPlaceholder(feedbackType)}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                rows={6}
                className="text-base border-2 focus:border-blue-500 focus:ring-blue-500 transition-all resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-slate-500 text-right font-medium">
                {feedbackMessage.length}/1000 characters
              </p>
            </div>

            {/* Helpful Tip */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl border-2 border-blue-200 dark:border-blue-700">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Helpful Tip
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                    Your feedback helps us improve our relief distribution services. Be honest and specific about your experience.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCloseFeedbackModal}
              disabled={isSubmittingFeedback}
              className="h-11 px-6 gap-2 border-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={isSubmittingFeedback || !feedbackMessage.trim()}
              className="h-11 px-6 gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md transition-all font-semibold"
            >
              {isSubmittingFeedback ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Feedback
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* General Feedback Modal */}
      <Dialog open={generalFeedbackModalOpen} onOpenChange={setGeneralFeedbackModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-2 shadow-2xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent font-bold">
                Share Your Feedback
              </span>
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 dark:text-slate-400 mt-2">
              Help us improve our services by sharing your thoughts, suggestions, or concerns
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Feedback Type Selection with Cards */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                What would you like to share? <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* MESSAGE */}
                <button
                  type="button"
                  onClick={() => setGeneralFeedbackType('MESSAGE')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    generalFeedbackType === 'MESSAGE'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${generalFeedbackType === 'MESSAGE' ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <Send className={`w-5 h-5 ${generalFeedbackType === 'MESSAGE' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${generalFeedbackType === 'MESSAGE' ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}>Message</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Say thank you or share a note with our team
                      </p>
                    </div>
                  </div>
                </button>

                {/* COMPLIMENT */}
                <button
                  type="button"
                  onClick={() => setGeneralFeedbackType('COMPLIMENT')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    generalFeedbackType === 'COMPLIMENT'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${generalFeedbackType === 'COMPLIMENT' ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <CheckCircle className={`w-5 h-5 ${generalFeedbackType === 'COMPLIMENT' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${generalFeedbackType === 'COMPLIMENT' ? 'text-green-600' : 'text-slate-700 dark:text-slate-300'}`}>Compliment</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Tell us what you liked about our service
                      </p>
                    </div>
                  </div>
                </button>

                {/* SUGGESTION */}
                <button
                  type="button"
                  onClick={() => setGeneralFeedbackType('SUGGESTION')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    generalFeedbackType === 'SUGGESTION'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${generalFeedbackType === 'SUGGESTION' ? 'bg-purple-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <Lightbulb className={`w-5 h-5 ${generalFeedbackType === 'SUGGESTION' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${generalFeedbackType === 'SUGGESTION' ? 'text-purple-600' : 'text-slate-700 dark:text-slate-300'}`}>Suggestion</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Ideas to help us improve our services
                      </p>
                    </div>
                  </div>
                </button>

                {/* FEEDBACK */}
                <button
                  type="button"
                  onClick={() => setGeneralFeedbackType('FEEDBACK')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    generalFeedbackType === 'FEEDBACK'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${generalFeedbackType === 'FEEDBACK' ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <MessageSquare className={`w-5 h-5 ${generalFeedbackType === 'FEEDBACK' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${generalFeedbackType === 'FEEDBACK' ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}>Feedback</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Share your experience with our services
                      </p>
                    </div>
                  </div>
                </button>

                {/* SERVICE COMPLAINT */}
                <button
                  type="button"
                  onClick={() => setGeneralFeedbackType('SERVICE_COMPLAINT')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    generalFeedbackType === 'SERVICE_COMPLAINT'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${generalFeedbackType === 'SERVICE_COMPLAINT' ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <AlertCircle className={`w-5 h-5 ${generalFeedbackType === 'SERVICE_COMPLAINT' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${generalFeedbackType === 'SERVICE_COMPLAINT' ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}>Issue/Problem</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Report a problem with our service
                      </p>
                    </div>
                  </div>
                </button>

                {/* REPORT */}
                <button
                  type="button"
                  onClick={() => setGeneralFeedbackType('REPORT')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    generalFeedbackType === 'REPORT'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${generalFeedbackType === 'REPORT' ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <AlertTriangle className={`w-5 h-5 ${generalFeedbackType === 'REPORT' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${generalFeedbackType === 'REPORT' ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>Report</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Serious concern or urgent matter
                      </p>
                    </div>
                  </div>
                </button>

                {/* OTHER */}
                <button
                  type="button"
                  onClick={() => setGeneralFeedbackType('OTHER')}
                  className={`p-4 rounded-xl border-2 text-left transition-all col-span-1 sm:col-span-2 ${
                    generalFeedbackType === 'OTHER'
                      ? 'border-slate-500 bg-slate-50 dark:bg-slate-900/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${generalFeedbackType === 'OTHER' ? 'bg-slate-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <MoreHorizontal className={`w-5 h-5 ${generalFeedbackType === 'OTHER' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${generalFeedbackType === 'OTHER' ? 'text-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>Other</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Anything else you'd like to share
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Subject Field */}
            <div className="space-y-2">
              <Label htmlFor="general-feedback-subject" className="text-base font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                Subject
              </Label>
              <Input
                id="general-feedback-subject"
                placeholder="What is this about? (e.g., 'Registration process was easy')"
                value={generalFeedbackSubject}
                onChange={(e) => setGeneralFeedbackSubject(e.target.value)}
                className="h-11 text-base border-2 focus:border-blue-500 focus:ring-blue-500 transition-all"
                maxLength={100}
              />
              <p className="text-xs text-slate-500 text-right font-medium">
                {generalFeedbackSubject.length}/100 characters
              </p>
            </div>

            {/* Message Field */}
            <div className="space-y-2">
              <Label htmlFor="general-feedback-message" className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Your Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="general-feedback-message"
                placeholder={getGeneralFeedbackPlaceholder(generalFeedbackType)}
                value={generalFeedbackMessage}
                onChange={(e) => setGeneralFeedbackMessage(e.target.value)}
                rows={6}
                className="text-base border-2 focus:border-blue-500 focus:ring-blue-500 transition-all resize-none"
                maxLength={2000}
              />
              <p className="text-xs text-slate-500 text-right font-medium">
                {generalFeedbackMessage.length}/2000 characters
              </p>
            </div>

            {/* Helpful Tip */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl border-2 border-blue-200 dark:border-blue-700">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Helpful Tip
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                    Be specific about your experience. Include details like dates, locations, or names (if comfortable) so we can help you better.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCloseGeneralFeedbackModal}
              disabled={isSubmittingGeneralFeedback}
              className="h-11 px-6 gap-2 border-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitGeneralFeedback}
              disabled={isSubmittingGeneralFeedback || !generalFeedbackSubject.trim() || !generalFeedbackMessage.trim()}
              className="h-11 px-6 gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md transition-all font-semibold"
            >
              {isSubmittingGeneralFeedback ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Feedback
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        description="Are you sure you want to logout? You will need to sign in again to access your dashboard."
        confirmLabel="Yes, Logout"
        cancelLabel="Cancel"
        variant="destructive"
      />

      {/* Success Modal */}
      <SuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success"
        message={successMessage}
      />

      {/* User Profile Modal */}
      {currentUser && (
        <UserProfileModal
          open={showUserProfileModal}
          onClose={handleProfileModalClose}
          user={{
            id: currentUser.id,
            name: `${profile.firstName} ${profile.lastName}`,
            email: profile.emailAddress,
            phone: profile.mobileNumber,
            role: 'vulnerable',
            profilePicture: profile.user?.profilePicture || null,
            createdAt: profile.createdAt
          }}
        />
      )}
    </div>
  )
}
