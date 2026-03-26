'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useUserSync } from '@/hooks/useUserSync'
import { safeParseVulnerabilityTypes } from '@/lib/json-utils'
import { useActivity } from '@/hooks/use-activity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Users,
  Package,
  FileText,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Bell,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Activity,
  Map,
  Eye,
  Navigation,
  LayoutDashboard,
  Search,
  Filter,
  UserCircle,
  ExternalLink
} from 'lucide-react'

// Import new components
import { CollapsibleSidebar, SidebarItem } from '@/components/dashboard/CollapsibleSidebar'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SuccessModal } from '@/components/ui/success-modal'
import UserProfileModal from '@/components/modals/UserProfileModal'
import ViewUserProfileModal from '@/components/modals/ViewUserProfileModal'
import VulnerableRegistrationModal from '@/components/modals/VulnerableRegistrationModal'

// Dynamically import map component to avoid SSR issues
const VulnerableMap = dynamic(() => import('@/components/map/VulnerableMap'), {
  ssr: false,
  loading: () => <div className="h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
    <div className="text-gray-600">Loading map...</div>
  </div>
})

// Dynamically import single location map
const SingleLocationMap = dynamic(() => import('@/components/map/SingleLocationMap'), {
  ssr: false,
  loading: () => <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
    <div className="text-gray-600">Loading map...</div>
  </div>
})

interface VulnerableProfile {
  id: string
  userId: string
  user: {
    name: string
    email: string
  }
  lastName: string
  firstName: string
  middleName: string
  barangay: string
  address: string
  registrationStatus: string
  vulnerabilityTypes: string
  disabilityType?: string
  medicalConditions?: string
  needsAssistance: boolean
  assistanceType?: string
  emergencyContact?: string
  emergencyPhone?: string
  createdAt: string
  latitude?: number
  longitude?: number
  mobileNumber?: string
  emailAddress?: string
}

interface Distribution {
  id: string
  distributionDate: string
  distributionType: string
  itemsProvided: string
  quantity: number
  notes: string
  vulnerableProfile: {
    id: string
    user: {
      name: string
    }
    barangay: string
  }
}

interface Announcement {
  id: string
  title: string
  content: string
  createdAt: string
}

export default function WorkerDashboard() {
  const router = useRouter()
  const { user, setUser, isLoading: isUserSyncing } = useUserSync()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Initialize sidebar collapsed state - start with false to avoid hydration mismatch
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Track user activity for real-time online status
  useActivity(user?.id || null)

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

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successTitle, setSuccessTitle] = useState('Success')
  const [successMessage, setSuccessMessage] = useState('')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)

  // Registration modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  // Distribution modal states
  const [showDistributeModal, setShowDistributeModal] = useState(false)
  const [profiles, setProfiles] = useState<VulnerableProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<VulnerableProfile | null>(null)
  const [distribution, setDistribution] = useState({
    distributionType: '',
    itemsProvided: '',
    quantity: 1,
    notes: ''
  })
  const [isDistributing, setIsDistributing] = useState(false)

  // My distributions
  const [myDistributions, setMyDistributions] = useState<Distribution[]>([])

  // Field notes
  const [showFieldNotesModal, setShowFieldNotesModal] = useState(false)
  const [fieldNote, setFieldNote] = useState('')
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)

  // Location view modal
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [selectedLocationProfile, setSelectedLocationProfile] = useState<VulnerableProfile | null>(null)

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  // Map data
  const [mapPoints, setMapPoints] = useState<any[]>([])

  // Active users counter
  const [activeUsers, setActiveUsers] = useState(0)

  // Profile search and filter
  const [profileSearch, setProfileSearch] = useState('')
  const [profileFilter, setProfileFilter] = useState<'all' | 'approved' | 'pending'>('all')

  // View user profile modal
  const [showViewUserProfileModal, setShowViewUserProfileModal] = useState(false)
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null)


  useEffect(() => {
    if (isUserSyncing) return

    if (!user) {
      router.replace('/intro')
      return
    }

    if (user.role.toLowerCase() !== 'worker') {
      router.replace('/intro')
      return
    }

    fetchProfiles()
    fetchMyDistributions()
    fetchAnnouncements()
    fetchMapData()
    fetchActiveUsers()

    // Set up interval for active users
    const activeUsersInterval = setInterval(fetchActiveUsers, 30000) // Update every 30 seconds

    setIsLoading(false)

    return () => {
      clearInterval(activeUsersInterval)
    }
  }, [user])

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/worker/profiles')
      const data = await res.json()
      if (data.success) {
        setProfiles(data.profiles)
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
    }
  }

  const fetchMyDistributions = async () => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return

      const userData = JSON.parse(userStr)

      const res = await fetch(`/api/worker/my-distributions?workerId=${userData.id}`)
      const data = await res.json()
      if (data.success) {
        setMyDistributions(data.distributions)
      }
    } catch (error) {
      console.error('Error fetching distributions:', error)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements')
      const data = await res.json()
      if (data.success) {
        setAnnouncements(data.announcements || [])
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
    }
  }

  const fetchMapData = async () => {
    try {
      const res = await fetch('/api/map/data')
      const data = await res.json()
      if (data.success) {
        setMapPoints(data.points)
      }
    } catch (error) {
      console.error('Error fetching map data:', error)
    }
  }

  const fetchActiveUsers = async () => {
    try {
      const res = await fetch('/api/system/active-users')
      const data = await res.json()
      if (data.success) {
        setActiveUsers(data.activeUsers.total || 0)
      }
    } catch (error) {
      console.error('Error fetching active users:', error)
    }
  }

  const handleLogout = () => {
    setShowLogoutModal(true)
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

  const handleRegisterVulnerable = async (formData: any) => {
    setIsRegistering(true)

    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        console.error('No user found in localStorage')
        return
      }

      const workerUser = JSON.parse(userStr)

      // Build vulnerability types from disability info
      const vulnerabilityTypes: string[] = []
      if (formData.hasDisability && formData.disabilityType) {
        vulnerabilityTypes.push(formData.disabilityType.toUpperCase().replace(/ /g, '_'))
      }
      if (formData.needsAssistance) {
        vulnerabilityTypes.push('NEEDS_ASSISTANCE')
      }
      if (vulnerabilityTypes.length === 0) {
        vulnerabilityTypes.push('OTHER')
      }

      const payload = {
        // Personal
        lastName: formData.lastName,
        firstName: formData.firstName,
        middleName: formData.middleName || '',
        suffix: formData.suffix || '',
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        civilStatus: formData.civilStatus,
        mobileNumber: formData.mobileNumber,
        landlineNumber: formData.landlineNumber || '',
        emailAddress: formData.emailAddress,
        // Address
        houseNumber: formData.houseNumber,
        street: formData.street,
        barangay: formData.barangay,
        municipality: formData.municipality || 'San Policarpo',
        province: formData.province || 'Eastern Samar',
        latitude: formData.latitude,
        longitude: formData.longitude,
        // Medical
        hasDisability: formData.hasDisability,
        disabilityType: formData.disabilityType || '',
        disabilitySeverity: formData.disabilitySeverity || '',
        disabilityCause: formData.disabilityCause || '',
        disabilityDetails: formData.disabilityDetails || '',
        hasMedicalCondition: formData.hasMedicalCondition || false,
        medicalConditions: formData.medicalConditions || '',
        needsAssistance: formData.needsAssistance || false,
        assistanceType: formData.assistanceType || '',
        medicalCertificateNumber: formData.medicalCertificateNumber || '',
        // Administrative
        bloodType: formData.bloodType || '',
        educationalAttainment: formData.educationalAttainment || '',
        employmentStatus: formData.employmentStatus || '',
        employmentDetails: formData.employmentDetails || '',
        emergencyContact: formData.emergencyContact || '',
        emergencyPhone: formData.emergencyPhone || '',
        // Guardian/Representative
        hasRepresentative: !!formData.guardianName,
        representativeName: formData.guardianName || '',
        representativeRelationship: formData.guardianRelationship || '',
        representativePhone: formData.guardianContact || '',
        // Vulnerability
        vulnerabilityTypes,
        // Worker
        workerId: workerUser.id
      }

      const res = await fetch('/api/worker/register-vulnerable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        setSuccessTitle('Registration Successful')
        setSuccessMessage('Vulnerable person registered successfully!')
        setShowSuccessModal(true)
        fetchProfiles()
      } else {
        setSuccessTitle('Registration Failed')
        setSuccessMessage(data.error || data.message || 'Registration failed. Please try again.')
        setShowSuccessModal(true)
      }
    } catch (error) {
      console.error('Error registering vulnerable:', error)
      setSuccessTitle('Error')
      setSuccessMessage('An unexpected error occurred. Please try again.')
      setShowSuccessModal(true)
    } finally {
      setIsRegistering(false)
    }
  }

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProfile) return

    setIsDistributing(true)

    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return

      const workerUser = JSON.parse(userStr)

      const res = await fetch('/api/worker/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vulnerableProfileId: selectedProfile.id,
          workerId: workerUser.id,
          ...distribution
        })
      })

      const data = await res.json()
      if (data.success) {
        setSuccessTitle('Distribution Recorded')
        setSuccessMessage('Relief distributed successfully!')
        setShowSuccessModal(true)
        setShowDistributeModal(false)
        setDistribution({
          distributionType: '',
          itemsProvided: '',
          quantity: 1,
          notes: ''
        })
        setSelectedProfile(null)
        fetchMyDistributions()
      } else {
        setSuccessTitle('Distribution Failed')
        setSuccessMessage(data.error || 'Distribution failed')
        setShowSuccessModal(true)
      }
    } catch (error) {
      console.error('Error distributing relief:', error)
      setSuccessTitle('Error')
      setSuccessMessage('Distribution failed. Please try again.')
      setShowSuccessModal(true)
    } finally {
      setIsDistributing(false)
    }
  }

  const handleSubmitFieldNote = async () => {
    if (!fieldNote.trim()) {
      setSuccessTitle('Validation Error')
      setSuccessMessage('Please enter a field note')
      setShowSuccessModal(true)
      return
    }

    setIsSubmittingNote(true)

    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return

      const workerUser = JSON.parse(userStr)

      const res = await fetch('/api/worker/field-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: workerUser.id,
          note: fieldNote
        })
      })

      const data = await res.json()
      if (data.success) {
        setSuccessTitle('Success')
        setSuccessMessage('Field note submitted successfully!')
        setShowSuccessModal(true)
        setShowFieldNotesModal(false)
        setFieldNote('')
      } else {
        setSuccessTitle('Submission Failed')
        setSuccessMessage(data.error || 'Failed to submit field note')
        setShowSuccessModal(true)
      }
    } catch (error) {
      console.error('Error submitting field note:', error)
      setSuccessTitle('Error')
      setSuccessMessage('Failed to submit field note. Please try again.')
      setShowSuccessModal(true)
    } finally {
      setIsSubmittingNote(false)
    }
  }

  const handleViewLocation = (profile: VulnerableProfile) => {
    setSelectedLocationProfile(profile)
    setShowLocationModal(true)
  }

  const handleViewUserProfile = async (profile: VulnerableProfile) => {
    try {
      const res = await fetch(`/api/worker/users/${profile.userId}`)
      const data = await res.json()
      if (data.success) {
        setSelectedUserProfile(data.user)
        setShowViewUserProfileModal(true)
      } else {
        setSuccessTitle('Error')
        setSuccessMessage('Failed to load user profile')
        setShowSuccessModal(true)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setSuccessTitle('Error')
      setSuccessMessage('Failed to load user profile')
      setShowSuccessModal(true)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge className="bg-yellow-500 gap-2"><Clock className="w-3 h-3" /> Pending</Badge>
      case 'approved':
        return <Badge className="bg-emerald-600 gap-2"><CheckCircle className="w-3 h-3" /> Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-500 gap-2"><XCircle className="w-3 h-3" /> Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Filter profiles based on search and filter
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = 
      profile.firstName.toLowerCase().includes(profileSearch.toLowerCase()) ||
      profile.lastName.toLowerCase().includes(profileSearch.toLowerCase()) ||
      profile.barangay.toLowerCase().includes(profileSearch.toLowerCase())
    
    const matchesFilter = 
      profileFilter === 'all' ||
      (profileFilter === 'approved' && profile.registrationStatus === 'APPROVED') ||
      (profileFilter === 'pending' && profile.registrationStatus === 'PENDING')
    
    return matchesSearch && matchesFilter
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-emerald-600">Loading...</div>
      </div>
    )
  }

  // Sidebar items for worker
  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profiles', label: 'Profiles', icon: Users },
    { id: 'distributions', label: 'Distributions', icon: Package },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'notes', label: 'Field Notes', icon: FileText },
  ]

  const approvedProfiles = profiles.filter(p => p.registrationStatus === 'APPROVED')

  if (isUserSyncing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-teal-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <CollapsibleSidebar
        user={user!}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onProfileClick={handleProfileClick}
        items={sidebarItems}
        role="worker"
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
          {/* Logos Row */}
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
              <h1 className="text-2xl font-bold text-gray-900">Worker Dashboard</h1>
              <p className="text-sm text-gray-500">Welcome back, {user?.name || 'Worker'}!</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Active Users Counter */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {activeUsers} Active Users
                </span>
              </div>
              <Button
                onClick={() => setShowRegisterModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Register Vulnerable
              </Button>
              <Button
                onClick={() => setShowDistributeModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-lg"
              >
                <Package className="w-4 h-4" />
                Distribute Relief
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Main Content - Full Width */}
            <div className="col-span-12 space-y-6">
              {/* Dashboard Tab - Stats Only */}
              {activeTab === 'dashboard' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500 mb-1 font-medium">Total Profiles</p>
                            <p className="text-3xl font-bold text-gray-900">{profiles.length}</p>
                          </div>
                          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-emerald-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500 mb-1 font-medium">Approved</p>
                            <p className="text-3xl font-bold text-emerald-600">{approvedProfiles.length}</p>
                          </div>
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500 mb-1 font-medium">Pending</p>
                            <p className="text-3xl font-bold text-yellow-600">
                              {profiles.filter(p => p.registrationStatus === 'PENDING').length}
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-yellow-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500 mb-1 font-medium">Distributions</p>
                            <p className="text-3xl font-bold text-emerald-600">{myDistributions.length}</p>
                          </div>
                          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-emerald-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Overview Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border border-gray-200 shadow-md border-l-4 border-l-emerald-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-emerald-600" />
                          Recent Activity
                        </CardTitle>
                        <CardDescription>Overview of your recent activities</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm text-gray-700">Distributions this week</span>
                            </div>
                            <span className="font-semibold text-emerald-600">
                              {myDistributions.filter(d => {
                                const diff = Date.now() - new Date(d.distributionDate).getTime()
                                return diff < 7 * 24 * 60 * 60 * 1000
                              }).length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm text-gray-700">New registrations this week</span>
                            </div>
                            <span className="font-semibold text-emerald-600">
                              {profiles.filter(p => {
                                const diff = Date.now() - new Date(p.createdAt).getTime()
                                return diff < 7 * 24 * 60 * 60 * 1000
                              }).length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm text-gray-700">Profiles needing assistance</span>
                            </div>
                            <span className="font-semibold text-emerald-600">
                              {profiles.filter(p => p.needsAssistance).length}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-md border-l-4 border-l-orange-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Bell className="w-5 h-5 text-orange-500" />
                          Announcements
                        </CardTitle>
                        <CardDescription>Latest updates and announcements</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {announcements.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No announcements</p>
                        ) : (
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {announcements.slice(0, 3).map((ann) => (
                              <div key={ann.id} className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                                <p className="font-medium text-sm text-gray-900">{ann.title}</p>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ann.content}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {formatDate(ann.createdAt)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* Profiles Tab - Vulnerable Profiles List Only */}
              {activeTab === 'profiles' && (
                <Card className="border border-gray-200 shadow-md border-l-4 border-l-emerald-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-600" />
                      Vulnerable Profiles
                    </CardTitle>
                    <CardDescription>View and manage all registered vulnerable individuals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Search and Filter */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search by name or barangay..."
                          value={profileSearch}
                          onChange={(e) => setProfileSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <Select value={profileFilter} onValueChange={(value: any) => setProfileFilter(value)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Profiles</SelectItem>
                            <SelectItem value="approved">Approved Only</SelectItem>
                            <SelectItem value="pending">Pending Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {filteredProfiles.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No profiles found</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {filteredProfiles.map((profile) => (
                          <div key={profile.id} className="p-4 bg-white rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {profile.lastName}, {profile.firstName}
                                </p>
                                <p className="text-sm text-gray-600 flex items-start gap-1 mt-1">
                                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span className="flex-1">
                                    {profile.address && <span className="block">{profile.address}</span>}
                                    <span className="block font-medium">{profile.barangay}</span>
                                  </span>
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  <Phone className="w-3 h-3 inline mr-1" />
                                  {profile.mobileNumber || 'No phone'}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  <Mail className="w-3 h-3 inline mr-1" />
                                  {profile.emailAddress || 'No email'}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {getStatusBadge(profile.registrationStatus)}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewUserProfile(profile)}
                                  className="gap-1 text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:border-emerald-300"
                                >
                                  <UserCircle className="w-3 h-3" />
                                  View Profile
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewLocation(profile)}
                                  className="gap-1 text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:border-emerald-300"
                                >
                                  <Eye className="w-3 h-3" />
                                  View Location
                                </Button>
                              </div>
                            </div>
                            {profile.vulnerabilityTypes && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {JSON.parse(profile.vulnerabilityTypes).map((type: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                    {type.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Distributions Tab - Distributions List Only */}
              {activeTab === 'distributions' && (
                <Card className="border border-gray-200 shadow-md border-l-4 border-l-emerald-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-emerald-600" />
                      Relief Distributions
                    </CardTitle>
                    <CardDescription>History of all relief distributions you have made</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {myDistributions.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No distributions recorded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {myDistributions.map((dist) => (
                          <div key={dist.id} className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{dist.distributionType}</p>
                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(dist.distributionDate).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Recipient: {dist.vulnerableProfile?.user?.name || 'Unknown'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Location: {dist.vulnerableProfile?.barangay || 'Unknown'}
                                </p>
                              </div>
                              <Badge className="bg-emerald-600">
                                ✓ Delivered
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-700 mt-2">
                              <strong>Items:</strong> {dist.itemsProvided}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Map Tab - Map Only */}
              {activeTab === 'map' && (
                <Card className="border border-gray-200 shadow-md border-l-4 border-l-emerald-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Map className="w-5 h-5 text-emerald-600" />
                      Vulnerable Population Map
                    </CardTitle>
                    <CardDescription>
                      Geographic distribution with heatmaps (Green=Received, Red=Not Received)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[600px] rounded-lg overflow-hidden border relative">
                      <VulnerableMap
                        points={mapPoints}
                        center={[12.1792, 125.5072]}
                        zoom={12}
                        showHeatmap={true}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Field Notes Tab - Field Notes Only */}
              {activeTab === 'notes' && (
                <Card className="border border-gray-200 shadow-md border-l-4 border-l-emerald-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-600" />
                      Field Notes
                    </CardTitle>
                    <CardDescription>Document your field observations and reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-emerald-300" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Submit a Field Note</h3>
                      <p className="text-gray-600 mb-4">Document your observations, findings, or field reports</p>
                      <Button
                        onClick={() => setShowFieldNotesModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Create Field Note
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Register Vulnerable Modal */}
      <VulnerableRegistrationModal
        open={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSubmit={handleRegisterVulnerable}
        userRole="worker"
      />

      {/* Distribute Relief Modal */}
      <Dialog open={showDistributeModal} onOpenChange={setShowDistributeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Distribute Relief</DialogTitle>
            <DialogDescription>
              Record relief distribution to a vulnerable individual
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDistribute} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile">Select Recipient *</Label>
              <Select
                value={selectedProfile?.id || ''}
                onValueChange={(value) => {
                  const profile = profiles.find(p => p.id === value)
                  setSelectedProfile(profile || null)
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {profiles
                    .filter(p => p.registrationStatus === 'APPROVED')
                    .map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.lastName}, {profile.firstName} - {profile.barangay}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="distributionType">Distribution Type *</Label>
              <Select
                value={distribution.distributionType}
                onValueChange={(value) => setDistribution({ ...distribution, distributionType: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food Pack">Food Pack</SelectItem>
                  <SelectItem value="Hygiene Kit">Hygiene Kit</SelectItem>
                  <SelectItem value="Cash Assistance">Cash Assistance</SelectItem>
                  <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                  <SelectItem value="Clothing">Clothing</SelectItem>
                  <SelectItem value="Emergency Shelter">Emergency Shelter</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemsProvided">Items Provided *</Label>
              <Textarea
                id="itemsProvided"
                placeholder="List the items distributed"
                value={distribution.itemsProvided}
                onChange={(e) => setDistribution({ ...distribution, itemsProvided: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={distribution.quantity}
                onChange={(e) => setDistribution({ ...distribution, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this distribution"
                value={distribution.notes}
                onChange={(e) => setDistribution({ ...distribution, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDistributeModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isDistributing} className="bg-emerald-600 hover:bg-emerald-700">
                {isDistributing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Record Distribution
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Field Notes Modal */}
      <Dialog open={showFieldNotesModal} onOpenChange={setShowFieldNotesModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Field Notes</DialogTitle>
            <DialogDescription>
              Document your observations and field reports
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fieldNote">Field Note *</Label>
              <Textarea
                id="fieldNote"
                placeholder="Enter your field observations, findings, or reports..."
                value={fieldNote}
                onChange={(e) => setFieldNote(e.target.value)}
                rows={6}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFieldNotesModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitFieldNote} disabled={isSubmittingNote} className="bg-emerald-600 hover:bg-emerald-700">
                {isSubmittingNote ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Note
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Location View Modal */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-emerald-600" />
              Location View
            </DialogTitle>
            <DialogDescription>
              View the location of {selectedLocationProfile?.firstName} {selectedLocationProfile?.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedLocationProfile && (
            <div className="space-y-4">
              {/* User Info Card with Full Address */}
              <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg">
                    {selectedLocationProfile.firstName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                      {selectedLocationProfile.lastName}, {selectedLocationProfile.firstName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedLocationProfile.mobileNumber && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedLocationProfile.mobileNumber}
                        </span>
                      )}
                    </p>
                  </div>
                  {getStatusBadge(selectedLocationProfile.registrationStatus)}
                </div>
              </div>

              {/* Full Address Display */}
              <div className="p-5 bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Complete Address
                </h4>
                <div className="space-y-2">
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {selectedLocationProfile.address || 'No street address provided'}
                  </p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedLocationProfile.barangay}
                  </p>
                  {selectedLocationProfile.latitude && selectedLocationProfile.longitude && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      Coordinates: {selectedLocationProfile.latitude.toFixed(6)}, {selectedLocationProfile.longitude.toFixed(6)}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedLocationProfile.latitude && selectedLocationProfile.longitude && (
                    <Button
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedLocationProfile.latitude},${selectedLocationProfile.longitude}`, '_blank')}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                      size="sm"
                    >
                      <Navigation className="w-4 h-4" />
                      Get Directions
                    </Button>
                  )}
                  <Button
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLocationProfile.address + ' ' + selectedLocationProfile.barangay)}`, '_blank')}
                    variant="outline"
                    className="gap-2 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Google Maps
                  </Button>
                </div>
              </div>
              <div className="w-full h-[500px] rounded-lg overflow-hidden border relative">
                <SingleLocationMap
                  name={`${selectedLocationProfile.firstName} ${selectedLocationProfile.lastName}`}
                  latitude={selectedLocationProfile.latitude || 12.1792}
                  longitude={selectedLocationProfile.longitude || 125.5072}
                  address={selectedLocationProfile.address}
                  barangay={selectedLocationProfile.barangay}
                  vulnerabilityTypes={selectedLocationProfile.vulnerabilityTypes ? JSON.parse(selectedLocationProfile.vulnerabilityTypes) : []}
                  phone={selectedLocationProfile.mobileNumber}
                  email={selectedLocationProfile.emailAddress}
                  status={selectedLocationProfile.registrationStatus}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <SuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successTitle}
        message={successMessage}
      />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Logout"
        description="Are you sure you want to logout? You will need to sign in again to access your account."
        confirmLabel="Logout"
        variant="default"
      />

      {/* User Profile Modal */}
      <UserProfileModal
        open={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        user={user!}
      />

      {/* View User Profile Modal */}
      <ViewUserProfileModal
        open={showViewUserProfileModal}
        onClose={() => {
          setShowViewUserProfileModal(false)
          setSelectedUserProfile(null)
        }}
        user={selectedUserProfile}
      />
    </div>
  )
}
