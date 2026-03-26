'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AnnouncementList from '@/components/announcements/AnnouncementList'
import AnnouncementForm from '@/components/announcements/AnnouncementForm'
import Sidebar from '@/components/layout/Sidebar'
import SuccessModal from '@/components/modals/SuccessModal'
import LogoutModal from '@/components/modals/LogoutModal'
import UserProfileModal from '@/components/modals/UserProfileModal'
import ViewUserProfileModal from '@/components/modals/ViewUserProfileModal'
import VulnerableRegistrationModal from '@/components/modals/VulnerableRegistrationModal'
import { useUserSync } from '@/hooks/useUserSync'
import { safeParseVulnerabilityTypes } from '@/lib/json-utils'
import { useActivity } from '@/hooks/use-activity'
import MobileBlock from '@/components/layout/MobileBlock'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Users,
  User,
  Shield,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Search,
  Plus,
  BarChart3,
  MessageSquare,
  TrendingUp,
  Activity,
  Package,
  Megaphone,
  Trash2,
  LayoutDashboard,
  Map,
  Phone,
  Mail,
  Calendar,
  Zap,
  UserCircle,
  Eye,
  MoreHorizontal
} from 'lucide-react'

// Dynamically import map component to avoid SSR issues
const VulnerableMap = dynamic(() => import('@/components/map/VulnerableMap'), {
  ssr: false,
  loading: () => <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
    <div className="text-slate-600 dark:text-slate-400">Loading map...</div>
  </div>
})

interface VulnerableProfile {
  id: string
  userId: string
  user: {
    name: string
    email: string
  }
  vulnerabilityTypes: string
  disabilityType?: string
  disabilityIdNumber?: string
  address: string
  barangay: string
  latitude?: number
  longitude?: number
  birthDate?: string
  gender?: string
  emergencyContact?: string
  emergencyPhone?: string
  hasMedicalCondition: boolean
  medicalConditions?: string
  needsAssistance: boolean
  assistanceType?: string
  registrationStatus: string
  rejectionReason?: string
  documents: Array<{
    id: string
    documentType: string
    fileName: string
    fileUrl: string
  }>
  createdAt: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, setUser, isLoading: isUserSyncing } = useUserSync()
  const userId = user?.id || ''
  const [activeTab, setActiveTab] = useState('dashboard')

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
  const [profiles, setProfiles] = useState<VulnerableProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<VulnerableProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [rejectDialog, setRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [mapPoints, setMapPoints] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })

  // Active users state
  const [activeUsers, setActiveUsers] = useState<number>(0)

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)

  // User management states
  const [users, setUsers] = useState<any[]>([])
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'WORKER', 
    phone: '',
    // Vulnerable specific fields
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
    latitude: 12.1792,
    longitude: 125.5072,
    educationalAttainment: '',
    employmentStatus: '',
    employmentDetails: '',
    vulnerabilityTypes: '',
    disabilityType: '',
    disabilityCause: '',
    disabilityIdNumber: '',
    emergencyContact: '',
    emergencyPhone: ''
  })

  // Feedback states
  const [feedbackList, setFeedbackList] = useState<any[]>([])
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null)
  const [feedbackResponse, setFeedbackResponse] = useState('')
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)

  // Analytics states
  const [analytics, setAnalytics] = useState<any>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  
  // Worker signup states
  const [workerSignupRequests, setWorkerSignupRequests] = useState<any[]>([])
  const [showCreateWorkerDialog, setShowCreateWorkerDialog] = useState(false)
  const [newWorker, setNewWorker] = useState({ name: '', email: '', password: '', phone: '' })
  const [rejectWorkerDialog, setRejectWorkerDialog] = useState(false)
  const [selectedWorkerRequest, setSelectedWorkerRequest] = useState<any>(null)
  const [workerRejectReason, setWorkerRejectReason] = useState('')

  // Announcement states
  const [announcementsKey, setAnnouncementsKey] = useState(0)

  // Delete user states
  const [deleteUserDialog, setDeleteUserDialog] = useState(false)
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<any>(null)

  // Vulnerable registration modal states
  const [showRegisterVulnerableModal, setShowRegisterVulnerableModal] = useState(false)
  const [isRegisteringVulnerable, setIsRegisteringVulnerable] = useState(false)

  // View user profile modal
  const [showViewUserProfileModal, setShowViewUserProfileModal] = useState(false)
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null)

  // Distributions state
  const [distributions, setDistributions] = useState<any[]>([])
  const [isLoadingDistributions, setIsLoadingDistributions] = useState(false)

  // Track user activity for real-time online status
  useActivity(user?.id || null)

  useEffect(() => {
    if (isUserSyncing) return

    if (!user) {
      router.push('/')
      return
    }

    if (user.role.toLowerCase() !== 'admin') {
      router.push('/')
      return
    }

    fetchProfiles()
    fetchStats()
    fetchMapData()
    fetchUsers()
    fetchFeedback()
    fetchAnalytics()
    fetchWorkerSignupRequests()
    fetchActiveUsers()
    fetchDistributions()

    // Set up interval for active users
    const interval = setInterval(fetchActiveUsers, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [user])

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

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchFeedback = async () => {
    try {
      const res = await fetch('/api/admin/feedback')
      const data = await res.json()
      if (data.success) {
        setFeedbackList(data.feedback)
      }
    } catch (error) {
      console.error('Error fetching feedback:', error)
    }
  }

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true)
    try {
      const res = await fetch('/api/admin/analytics?days=30')
      const data = await res.json()
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  const fetchWorkerSignupRequests = async () => {
    try {
      const res = await fetch('/api/admin/signup-requests')
      const data = await res.json()
      if (data.success) {
        setWorkerSignupRequests(data.requests)
      }
    } catch (error) {
      console.error('Error fetching worker signup requests:', error)
    }
  }

  const fetchDistributions = async () => {
    setIsLoadingDistributions(true)
    try {
      const res = await fetch('/api/admin/distributions')
      const data = await res.json()
      if (data.success) {
        setDistributions(data.distributions || [])
      }
    } catch (error) {
      console.error('Error fetching distributions:', error)
    } finally {
      setIsLoadingDistributions(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let endpoint = '/api/admin/users'
      let payload: any = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        phone: newUser.phone
      }

      // If vulnerable, include all vulnerable-specific fields and use different endpoint
      if (newUser.role === 'VULNERABLE') {
        endpoint = '/api/admin/create-vulnerable'
        payload = {
          ...payload,
          lastName: newUser.lastName,
          firstName: newUser.firstName,
          middleName: newUser.middleName,
          suffix: newUser.suffix,
          dateOfBirth: newUser.dateOfBirth,
          gender: newUser.gender,
          civilStatus: newUser.civilStatus,
          mobileNumber: newUser.mobileNumber,
          landlineNumber: newUser.landlineNumber,
          emailAddress: newUser.emailAddress,
          houseNumber: newUser.houseNumber,
          street: newUser.street,
          barangay: newUser.barangay,
          municipality: newUser.municipality,
          province: newUser.province,
          latitude: newUser.latitude,
          longitude: newUser.longitude,
          educationalAttainment: newUser.educationalAttainment,
          employmentStatus: newUser.employmentStatus,
          employmentDetails: newUser.employmentDetails,
          vulnerabilityTypes: newUser.vulnerabilityTypes,
          disabilityType: newUser.disabilityType,
          disabilityCause: newUser.disabilityCause,
          disabilityIdNumber: newUser.disabilityIdNumber,
          emergencyContact: newUser.emergencyContact,
          emergencyPhone: newUser.emergencyPhone
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage(data.message)
        setShowSuccessModal(true)
        setShowAddUserDialog(false)
        // Reset form
        setNewUser({ 
          name: '', 
          email: '', 
          password: '', 
          role: 'WORKER', 
          phone: '',
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
          latitude: 12.1792,
          longitude: 125.5072,
          educationalAttainment: '',
          employmentStatus: '',
          employmentDetails: '',
          vulnerabilityTypes: '',
          disabilityType: '',
          disabilityCause: '',
          disabilityIdNumber: '',
          emergencyContact: '',
          emergencyPhone: ''
        })
        fetchUsers()
        fetchProfiles()
        fetchStats()
      } else {
        alert(data.error || data.message || 'Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Failed to create user. Please try again.')
    }
  }

  const handleSendFeedbackResponse = async () => {
    if (!selectedFeedback || !feedbackResponse.trim()) {
      alert('Please enter a response')
      return
    }

    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackId: selectedFeedback.id,
          adminResponse: feedbackResponse
        })
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage(data.message)
        setShowSuccessModal(true)
        setShowFeedbackDialog(false)
        setFeedbackResponse('')
        setSelectedFeedback(null)
        fetchFeedback()
      } else {
        alert(data.error || 'Failed to send response')
      }
    } catch (error) {
      console.error('Error sending response:', error)
      alert('Failed to send response. Please try again.')
    }
  }

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        alert('You must be logged in as admin')
        return
      }
      const adminUser = JSON.parse(userStr)

      const res = await fetch('/api/admin/create-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newWorker,
          adminId: adminUser.id
        })
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage(data.message)
        setShowSuccessModal(true)
        setShowCreateWorkerDialog(false)
        setNewWorker({ name: '', email: '', password: '', phone: '' })
        fetchUsers()
      } else {
        alert(data.message || data.error || 'Failed to create worker')
      }
    } catch (error) {
      console.error('Error creating worker:', error)
      alert('Failed to create worker. Please try again.')
    }
  }

  const handleApproveWorkerSignup = async (requestId: string) => {
    try {
      const res = await fetch('/api/admin/approve-worker-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage('Worker signup approved successfully!')
        setShowSuccessModal(true)
        fetchWorkerSignupRequests()
        fetchUsers()
      } else {
        alert(data.message || 'Approval failed')
      }
    } catch (error) {
      console.error('Worker approval error:', error)
      alert('Approval failed. Please try again.')
    }
  }

  const handleRejectWorkerSignup = async () => {
    if (!selectedWorkerRequest || !workerRejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      const res = await fetch('/api/admin/reject-worker-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedWorkerRequest.id,
          reason: workerRejectReason
        })
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage('Worker signup rejected successfully.')
        setShowSuccessModal(true)
        setRejectWorkerDialog(false)
        setSelectedWorkerRequest(null)
        setWorkerRejectReason('')
        fetchWorkerSignupRequests()
      } else {
        alert(data.message || 'Rejection failed')
      }
    } catch (error) {
      console.error('Worker rejection error:', error)
      alert('Rejection failed. Please try again.')
    }
  }

  const handleAnnouncementSuccess = () => {
    setAnnouncementsKey(prev => prev + 1)
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

  const handleDeleteUser = async () => {
    if (!selectedUserToDelete) {
      alert('No user selected for deletion')
      return
    }

    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        alert('You must be logged in as admin')
        return
      }
      const adminUser = JSON.parse(userStr)

      const res = await fetch(`/api/admin/users/${selectedUserToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: adminUser.id })
      })

      const data = await res.json()

      if (data.success) {
        setSuccessMessage('User account deleted successfully!')
        setShowSuccessModal(true)
        setDeleteUserDialog(false)
        setSelectedUserToDelete(null)
        fetchUsers()
        fetchProfiles()
        fetchStats()
      } else {
        alert(data.message || 'Failed to delete user account')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user account. Please try again.')
    }
  }

  const handleRegisterVulnerable = async (formData: any) => {
    setIsRegisteringVulnerable(true)
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        alert('You must be logged in as admin')
        return
      }
      const adminUser = JSON.parse(userStr)

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

      // Explicitly build the payload (no File objects)
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
        medicalCertificateNumber: formData.medicalCertificateNumber || '',
        hasMedicalCondition: formData.hasMedicalCondition || false,
        medicalConditions: formData.medicalConditions || '',
        needsAssistance: formData.needsAssistance || false,
        assistanceType: formData.assistanceType || '',
        // Administrative
        bloodType: formData.bloodType || '',
        guardianName: formData.guardianName || '',
        guardianRelationship: formData.guardianRelationship || '',
        guardianContact: formData.guardianContact || '',
        guardianAddress: formData.guardianAddress || '',
        philHealthNumber: formData.philHealthNumber || '',
        sssNumber: formData.sssNumber || '',
        gsisNumber: formData.gsisNumber || '',
        educationalAttainment: formData.educationalAttainment || '',
        employmentStatus: formData.employmentStatus || '',
        employmentDetails: formData.employmentDetails || '',
        emergencyContact: formData.emergencyContact || '',
        emergencyPhone: formData.emergencyPhone || '',
        // Documents (flags only, no file objects)
        hasPWDRegistrationForm: formData.hasPWDRegistrationForm || false,
        hasMedicalCertificate: formData.hasMedicalCertificate || false,
        hasProofOfIdentity: formData.hasProofOfIdentity || false,
        hasProofOfResidence: formData.hasProofOfResidence || false,
        // Vulnerability
        vulnerabilityTypes,
        // Admin
        adminId: adminUser.id
      }

      const res = await fetch('/api/admin/register-vulnerable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage('Vulnerable person registered successfully!')
        setShowSuccessModal(true)
        setShowRegisterVulnerableModal(false)
        fetchProfiles()
        fetchStats()
      } else {
        alert(data.error || data.message || 'Registration failed. Please check all required fields.')
      }
    } catch (error) {
      console.error('Error registering vulnerable:', error)
      alert('Registration failed. Please try again.')
    } finally {
      setIsRegisteringVulnerable(false)
    }
  }

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/admin/profiles')
      const data = await res.json()
      if (data.success) {
        setProfiles(data.profiles)
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
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

  const handleApprove = async (profileId: string) => {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId })
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage('Registration approved successfully!')
        setShowSuccessModal(true)
        fetchProfiles()
        fetchStats()
        setSelectedProfile(null)
      } else {
        alert(data.message || 'Approval failed')
      }
    } catch (error) {
      console.error('Approval error:', error)
      alert('Approval failed. Please try again.')
    }
  }

  const handleReject = async () => {
    if (!selectedProfile || !rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfile.id,
          reason: rejectReason
        })
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage('Registration rejected successfully.')
        setShowSuccessModal(true)
        fetchProfiles()
        fetchStats()
        setSelectedProfile(null)
        setRejectDialog(false)
        setRejectReason('')
      } else {
        alert(data.message || 'Rejection failed')
      }
    } catch (error) {
      console.error('Rejection error:', error)
      alert('Rejection failed. Please try again.')
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

  const handleViewUserProfile = async (profile: any) => {
    try {
      const res = await fetch(`/api/worker/users/${profile.userId}`)
      const data = await res.json()
      if (data.success) {
        setSelectedUserProfile(data.user)
        setShowViewUserProfileModal(true)
      } else {
        alert('Failed to load user profile')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      alert('Failed to load user profile')
    }
  }

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch =
      profile.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.barangay.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.address.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || profile.registrationStatus.toLowerCase() === filterStatus

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
      case 'approved':
        return <Badge className="bg-purple-600"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Custom scrollbar style
  const customScrollbar = "overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:hover:scrollbar-thumb-gray-500 dark:scrollbar-track-gray-800"

  // Format user data for sidebar
  const sidebarUser = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profilePicture: user.profilePicture || null,
    createdAt: user.createdAt
  } : null

    if (isUserSyncing) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Activity className="w-12 h-12 text-purple-600 animate-spin" />
            <p className="text-slate-600 font-medium">Loading Dashboard...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Block mobile users from admin portal */}
        <MobileBlock />

        {sidebarUser && (
          <>
            <Sidebar
              user={sidebarUser}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onLogout={handleLogout}
              onProfileClick={() => setShowUserProfileModal(true)}
              collapsed={sidebarCollapsed}
              onToggleCollapse={handleToggleSidebar}
            />
          </>
        )}

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
          {/* Logos Row */}
          <div className="grid grid-cols-3 items-center mb-3">
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
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500 hidden sm:block">Welcome back, {user?.name || 'Administrator'}!</p>
            </div>

            {/* Active Users Counter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <Zap className="w-5 h-5 text-purple-600 animate-pulse" />
                <div>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Active Users</p>
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{activeUsers}</p>
                </div>
              </div>

              <Button
                onClick={() => setShowRegisterVulnerableModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Register Vulnerable
              </Button>
              <Button
                onClick={() => setShowAddUserDialog(true)}
                className="bg-purple-600 hover:bg-purple-700 gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards - Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1 font-medium">Total Registrations</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                        <p className="text-xs text-gray-600 mt-1">All vulnerable individuals</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-l-yellow-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1 font-medium">Pending Review</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
                        <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1 font-medium">Approved</p>
                        <p className="text-3xl font-bold text-purple-600">{stats.approved}</p>
                        <p className="text-xs text-gray-600 mt-1">Active profiles</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1 font-medium">Rejected</p>
                        <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
                        <p className="text-xs text-gray-600 mt-1">Declined applications</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-l-emerald-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1 font-medium">Total Distributions</p>
                        <p className="text-3xl font-bold text-emerald-600">{distributions.length}</p>
                        <p className="text-xs text-gray-600 mt-1">Relief delivered</p>
                      </div>
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Overall Results Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Statistics */}
                <Card className="border border-gray-200 shadow-md border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      User Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-gray-700">Total Users</span>
                        <span className="font-bold text-blue-700">{users.length}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-gray-700">Admins</span>
                        <span className="font-bold text-purple-700">{users.filter((u: any) => u.role === 'ADMIN').length}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                        <span className="text-sm text-gray-700">Workers</span>
                        <span className="font-bold text-emerald-700">{users.filter((u: any) => u.role === 'WORKER').length}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg">
                        <span className="text-sm text-gray-700">Vulnerable Users</span>
                        <span className="font-bold text-cyan-700">{users.filter((u: any) => u.role === 'VULNERABLE').length}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <span className="text-sm text-gray-700">Pending Worker Signups</span>
                        <span className="font-bold text-yellow-700">{workerSignupRequests.filter((r: any) => r.status === 'PENDING').length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Registration Status Overview */}
                <Card className="border border-gray-200 shadow-md border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                      Registration Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Approval Rate</span>
                        <span className="font-bold text-gray-900">
                          {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${stats.total > 0 ? (stats.approved / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="text-center p-2 bg-green-50 rounded-lg">
                          <p className="text-xs text-gray-600">Approved</p>
                          <p className="text-lg font-bold text-green-700">{stats.approved}</p>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 rounded-lg">
                          <p className="text-xs text-gray-600">Pending</p>
                          <p className="text-lg font-bold text-yellow-700">{stats.pending}</p>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded-lg">
                          <p className="text-xs text-gray-600">Rejected</p>
                          <p className="text-lg font-bold text-red-700">{stats.rejected}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="border border-gray-200 shadow-md border-l-4 border-l-purple-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest system activity and registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  {profiles.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {profiles.slice(0, 5).map((profile) => (
                        <div key={profile.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-purple-600 text-white text-sm">
                                {profile.user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm text-gray-900">{profile.user.name}</p>
                              <p className="text-xs text-gray-600">
                                {profile.barangay} • {new Date(profile.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(profile.registrationStatus)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Registrations Tab */}
          {activeTab === 'registrations' && (
            <div className="space-y-6">
              {/* Pending Registrations Section */}
              <Card className="border border-gray-200 shadow-md border-l-4 border-l-yellow-500">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        Pending Registrations
                      </CardTitle>
                      <CardDescription>
                        Review and approve vulnerable individual registrations
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search pending..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-full sm:w-64"
                        />
                      </div>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                        {profiles.filter(p => p.registrationStatus === 'PENDING').length} Pending
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading registrations...</div>
                  ) : profiles.filter(p => p.registrationStatus === 'PENDING').length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300" />
                      <p className="text-gray-500 font-medium">No pending registrations</p>
                      <p className="text-sm text-gray-400 mt-1">All registrations have been reviewed</p>
                    </div>
                  ) : (
                    <div className={`space-y-4 max-h-[500px] ${customScrollbar}`}>
                      {profiles
                        .filter(p => p.registrationStatus === 'PENDING')
                        .filter(profile => {
                          const matchesSearch =
                            profile.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            profile.barangay.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            profile.address.toLowerCase().includes(searchTerm.toLowerCase())
                          return matchesSearch
                        })
                        .map((profile) => (
                          <Card
                            key={profile.id}
                            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200 border-l-4 border-l-yellow-500"
                            onClick={() => setSelectedProfile(profile)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-lg text-gray-900">{profile.user.name}</h3>
                                    <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
                                  </div>
                                  <div className="space-y-1 text-sm text-gray-600">
                                    <p><span className="font-medium text-gray-700">Email:</span> {profile.user.email}</p>
                                    <div className="flex items-start gap-1">
                                      <span className="font-medium text-gray-700 flex-shrink-0">Location:</span>
                                      <span className="flex-1">
                                        {profile.address && <span className="block">{profile.address}</span>}
                                        <span className="block font-medium text-gray-900">{profile.barangay}</span>
                                      </span>
                                    </div>
                                    <p><span className="font-medium text-gray-700">Vulnerability Types:</span> {safeParseVulnerabilityTypes(profile.vulnerabilityTypes).join(', ')}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500 mb-2">
                                    {new Date(profile.createdAt).toLocaleDateString()}
                                  </p>
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <FileText className="w-4 h-4" />
                                    {profile.documents.length} document{profile.documents.length !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Approved and Rejected Section */}
              <Card className="border border-gray-200 shadow-md">
                <CardHeader>
                  <CardTitle>Approved & Rejected Registrations</CardTitle>
                  <CardDescription>
                    View historical registrations and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profiles.filter(p => p.registrationStatus !== 'PENDING').length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 font-medium">No processed registrations yet</p>
                      <p className="text-sm text-gray-400 mt-1">Approved and rejected registrations will appear here</p>
                    </div>
                  ) : (
                    <div className={`space-y-3 max-h-[500px] ${customScrollbar}`}>
                      {profiles
                        .filter(p => p.registrationStatus !== 'PENDING')
                        .map((profile) => (
                          <Card
                            key={profile.id}
                            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200 border-l-4"
                            style={{
                              borderLeftColor:
                                profile.registrationStatus === 'APPROVED' ? '#9333ea' : '#ef4444'
                            }}
                            onClick={() => setSelectedProfile(profile)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-lg text-gray-900">{profile.user.name}</h3>
                                    {getStatusBadge(profile.registrationStatus)}
                                  </div>
                                  <div className="space-y-1 text-sm text-gray-600">
                                    <p><span className="font-medium text-gray-700">Email:</span> {profile.user.email}</p>
                                    <p><span className="font-medium text-gray-700">Barangay:</span> {profile.barangay}</p>
                                    {profile.registrationStatus === 'REJECTED' && profile.rejectionReason && (
                                      <p className="text-red-600"><span className="font-medium">Reason:</span> {profile.rejectionReason}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">
                                    {new Date(profile.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}



          {/* Profiles Tab */}
          {activeTab === 'profiles' && (
            <Card className="border border-gray-200 shadow-md">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Vulnerable Profiles</CardTitle>
                    <CardDescription>
                      View and manage all registered vulnerable individuals
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search profiles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64"
                      />
                    </div>
                    <Select
                      value={filterStatus}
                      onValueChange={setFilterStatus}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12 text-gray-500">Loading profiles...</div>
                ) : filteredProfiles.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-medium">No profiles found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter</p>
                  </div>
                ) : (
                  <div className={`space-y-4 max-h-[600px] ${customScrollbar}`}>
                    {filteredProfiles.map((profile) => (
                      <Card
                        key={profile.id}
                        className="hover:shadow-md transition-shadow border border-gray-200 border-l-4 cursor-pointer"
                        style={{
                          borderLeftColor:
                            profile.registrationStatus === 'PENDING' ? '#eab308' :
                            profile.registrationStatus === 'APPROVED' ? '#9333ea' :
                            '#ef4444'
                        }}
                        onClick={() => setSelectedProfile(profile)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg text-gray-900">{profile.user.name}</h3>
                                {getStatusBadge(profile.registrationStatus)}
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p><span className="font-medium text-gray-700">Email:</span> {profile.user.email}</p>
                                <div className="flex items-start gap-1">
                                  <span className="font-medium text-gray-700 flex-shrink-0">Location:</span>
                                  <span className="flex-1">
                                    {profile.address && <span className="block">{profile.address}</span>}
                                    <span className="block font-medium text-gray-900">{profile.barangay}</span>
                                  </span>
                                </div>
                                <p><span className="font-medium text-gray-700">Vulnerability Types:</span> {safeParseVulnerabilityTypes(profile.vulnerabilityTypes).join(', ')}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewUserProfile(profile)
                                }}
                                className="gap-1 text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300"
                              >
                                <UserCircle className="w-3 h-3" />
                                View Profile
                              </Button>
                              <p className="text-xs text-gray-500">
                                {new Date(profile.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Map Tab */}
          {activeTab === 'map' && (
            <Card className="border border-gray-200 shadow-md">
              <CardHeader>
                <CardTitle>Vulnerable Population Map</CardTitle>
                <CardDescription>
                  Geographic distribution with heatmaps (Green=Received, Red=Not Received)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] rounded-lg overflow-hidden border border-gray-200">
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

          {/* Distributions Tab */}
          {activeTab === 'distributions' && (
            <Card className="border border-gray-200 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Relief Distributions
                </CardTitle>
                <CardDescription>
                  View all relief distributions recorded in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDistributions ? (
                  <div className="text-center py-12 text-gray-500">Loading distributions...</div>
                ) : distributions.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-medium">No distributions recorded yet</p>
                    <p className="text-sm text-gray-400 mt-1">Distributions will appear here once workers record them</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {distributions.map((dist) => (
                      <Card key={dist.id} className="hover:shadow-md transition-shadow border border-gray-200 border-l-4 border-l-purple-600">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg text-gray-900">{dist.distributionType}</h3>
                                <Badge className="bg-purple-600">✓ Delivered</Badge>
                              </div>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(dist.distributionDate).toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Recipient:</strong> {dist.vulnerableProfile?.user?.name || 'Unknown'}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Location:</strong> {dist.vulnerableProfile?.barangay || 'Unknown'}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Distributed by:</strong> {dist.worker?.name || 'Unknown'}
                              </p>
                              <div className="text-sm text-gray-700 mt-2">
                                <strong>Items:</strong> {dist.itemsProvided}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <Card className="border border-gray-200 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Manage admin and worker accounts for the system
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddUserDialog(true)} className="bg-purple-600 hover:bg-purple-700 gap-2">
                    <Plus className="w-4 h-4" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`space-y-4 max-h-[600px] ${customScrollbar}`} id="users-list">
                  {users.map((userItem) => {
                    const userStr = localStorage.getItem('user')
                    const currentUser = userStr ? JSON.parse(userStr) : {}
                    const isCurrentUser = userItem.id === currentUser.id
                    
                    const handleDeleteClick = () => {
                      setSelectedUserToDelete(userItem)
                      setDeleteUserDialog(true)
                    }
                    
                    return (
                      <div key={userItem.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <AvatarImage src={userItem.profilePicture || undefined} alt={userItem.name} />
                              <AvatarFallback className={`${
                                userItem.role === 'admin' ? 'bg-purple-600' :
                                userItem.role === 'worker' ? 'bg-emerald-600' : 'bg-blue-600'
                              }`}>
                                {userItem.name?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{userItem.name}</h4>
                              <p className="text-sm text-gray-600 truncate">{userItem.email}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge className={
                                  userItem.role === 'admin' ? 'bg-purple-600' :
                                  userItem.role === 'worker' ? 'bg-emerald-600' : 'bg-blue-600'
                                }>
                                  {userItem.role}
                                </Badge>
                                {userItem.phone && (
                                  <span className="text-xs text-gray-500">{userItem.phone}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                            <div className="text-xs text-gray-500">
                              Created {new Date(userItem.createdAt).toLocaleDateString()}
                            </div>
                            {userItem.vulnerableProfile && (
                              <div className="text-xs text-gray-500">
                                Profile: {userItem.vulnerableProfile.registrationStatus}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {userItem._count?.reliefDistributions || 0} distributions
                            </div>
                            {!isCurrentUser && (
                              <button
                                type="button"
                                onClick={handleDeleteClick}
                                className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            )}
                            {isCurrentUser && (
                              <span className="mt-2 text-xs text-gray-400 italic">(You)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {users.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 font-medium">No users found</p>
                      <p className="text-sm text-gray-400 mt-1">Click "Add User" to create one</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="grid gap-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-gray-200 shadow-md border-l-4 border-l-purple-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1 font-medium">Registrations (30 days)</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {analytics?.registrationsByDate?.reduce((sum: any, item: any) => sum + item.count, 0) || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-md border-l-4 border-l-emerald-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1 font-medium">Distributions (30 days)</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {analytics?.distributionsByDate?.reduce((sum: any, item: any) => sum + item.count, 0) || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-md border-l-4 border-l-blue-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1 font-medium">Active Users</p>
                        <p className="text-3xl font-bold text-gray-900">{users.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Activity className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-md border-l-4 border-l-orange-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1 font-medium">Pending Feedback</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {analytics?.feedbackStats?.find((f: any) => f.status === 'SUBMITTED')?.count || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Vulnerability Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border border-gray-200 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      Vulnerability Types
                    </CardTitle>
                    <CardDescription>Breakdown by vulnerability category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics?.vulnerabilityCounts ? (
                      <div className="space-y-3">
                        {Object.entries(analytics.vulnerabilityCounts).map(([type, count]: [string, any]) => (
                          <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm capitalize text-gray-700">{type.replace(/_/g, ' ')}</span>
                            <Badge className="bg-purple-600">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">Loading analytics data...</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      Relief Coverage by Barangay
                    </CardTitle>
                    <CardDescription>Percentage of households that received relief</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics?.reliefCoverage ? (
                      <div className={`space-y-3 max-h-64 ${customScrollbar}`}>
                        {analytics.reliefCoverage.map((barangay: any) => {
                          const percentage = barangay.totalProfiles > 0
                            ? Math.round((barangay.receivedRelief / barangay.totalProfiles) * 100)
                            : 0
                          return (
                            <div key={barangay.barangay} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{barangay.barangay}</span>
                                <span className="font-medium text-gray-900">{percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-emerald-600 h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">Loading analytics data...</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <Card className="border border-gray-200 shadow-md">
              <CardHeader>
                <CardTitle>User Feedback Management</CardTitle>
                <CardDescription>
                  View and respond to feedback from vulnerable individuals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`space-y-4 max-h-[600px] ${customScrollbar}`}>
                  {feedbackList.map((feedback) => (
                    <Card key={feedback.id} className="p-4 shadow-sm border border-gray-200">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={
                                feedback.status === 'SUBMITTED' ? 'default' :
                                feedback.status === 'REVIEWED' ? 'secondary' : 'default'
                              } className={
                                feedback.status === 'RESOLVED' ? 'bg-emerald-600' :
                                feedback.status === 'REVIEWED' ? 'bg-blue-600' : 'bg-yellow-600'
                              }>
                                {feedback.status}
                              </Badge>
                              <Badge variant="outline">{feedback.feedbackType}</Badge>
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {feedback.user.name} ({feedback.user.email})
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {feedback.message}
                            </p>
                            <div className="text-xs text-gray-500 mt-2">
                              Submitted: {new Date(feedback.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedFeedback(feedback)
                              setFeedbackResponse(feedback.adminResponse || '')
                              setShowFeedbackDialog(true)
                            }}
                            disabled={feedback.status === 'RESOLVED'}
                            className="border-purple-600 text-purple-600 hover:bg-purple-50"
                          >
                            {feedback.status === 'RESOLVED' ? 'Responded' : 'Respond'}
                          </Button>
                        </div>

                        {feedback.adminResponse && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs font-medium text-gray-600 mb-1">
                              Admin Response ({new Date(feedback.adminResponseDate!).toLocaleString()}):
                            </div>
                            <p className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded">
                              {feedback.adminResponse}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  {feedbackList.length === 0 && (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 font-medium">No feedback received yet</p>
                      <p className="text-sm text-gray-400 mt-1">Feedback from users will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
                  <p className="text-sm text-gray-500">Manage and view all announcements</p>
                </div>
                <Button
                  onClick={() => setShowAnnouncementForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 gap-2 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Create Announcement
                </Button>
              </div>
              <AnnouncementList key={announcementsKey} userRole="ADMIN" />
            </div>
          )}
        </main>
      </div>

      {/* Profile Detail Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedProfile && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">Registration Details</DialogTitle>
                <DialogDescription>
                  Review and approve or reject this registration
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Personal Information */}
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><span className="font-medium text-gray-700">Name:</span> {selectedProfile.user.name}</div>
                    <div><span className="font-medium text-gray-700">Email:</span> {selectedProfile.user.email}</div>
                    {selectedProfile.birthDate && (
                      <div><span className="font-medium text-gray-700">Date of Birth:</span> {new Date(selectedProfile.birthDate).toLocaleDateString()}</div>
                    )}
                    {selectedProfile.gender && (
                      <div><span className="font-medium text-gray-700">Gender:</span> {selectedProfile.gender}</div>
                    )}
                    {selectedProfile.emergencyContact && (
                      <div><span className="font-medium text-gray-700">Emergency Contact:</span> {selectedProfile.emergencyContact} ({selectedProfile.emergencyPhone})</div>
                    )}
                  </CardContent>
                </Card>

                {/* Vulnerability Information */}
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Vulnerability Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Vulnerability Types:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {safeParseVulnerabilityTypes(selectedProfile.vulnerabilityTypes).map((type: string, i: number) => (
                          <Badge key={i} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{type}</Badge>
                        ))}
                      </div>
                    </div>
                    {selectedProfile.disabilityType && (
                      <div><span className="font-medium text-gray-700">Disability Type:</span> {selectedProfile.disabilityType}</div>
                    )}
                    {selectedProfile.disabilityIdNumber && (
                      <div><span className="font-medium text-gray-700">PWD ID Number:</span> {selectedProfile.disabilityIdNumber}</div>
                    )}
                    {selectedProfile.hasMedicalCondition && (
                      <div>
                        <span className="font-medium text-gray-700">Medical Conditions:</span>
                        <p className="mt-1">{selectedProfile.medicalConditions || 'Not specified'}</p>
                      </div>
                    )}
                    {selectedProfile.needsAssistance && (
                      <div>
                        <span className="font-medium text-gray-700">Assistance Needed:</span>
                        <p className="mt-1">{selectedProfile.assistanceType || 'Not specified'}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Location Information */}
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Location Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><span className="font-medium text-gray-700">Barangay:</span> {selectedProfile.barangay}</div>
                    <div><span className="font-medium text-gray-700">Address:</span> {selectedProfile.address}</div>
                    {selectedProfile.latitude && selectedProfile.longitude && (
                      <div>
                        <span className="font-medium text-gray-700">Coordinates:</span> 
                        {selectedProfile.latitude.toFixed(6)}, {selectedProfile.longitude.toFixed(6)}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Registration Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-700">Current Status:</span>
                    <div className="mt-1">{getStatusBadge(selectedProfile.registrationStatus)}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Registered: {new Date(selectedProfile.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedProfile.registrationStatus === 'PENDING' && (
                  <div className="flex gap-3 justify-end">
                    <Button
                      onClick={() => setRejectDialog(true)}
                      variant="outline"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedProfile.id)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this registration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejectReason">Rejection Reason *</Label>
              <Textarea
                id="rejectReason"
                placeholder="Explain why this registration is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialog(false)
              setRejectReason('')
            }}>
              Cancel
            </Button>
            <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700">
              <XCircle className="w-4 h-4 mr-2" />
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account for the system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WORKER">Worker</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddUserDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Feedback Response Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Feedback</DialogTitle>
            <DialogDescription>
              Provide a response to this user's feedback
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFeedback && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">User:</span> {selectedFeedback.user.name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Message:</span> {selectedFeedback.message}
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="response">Your Response *</Label>
              <Textarea
                id="response"
                placeholder="Type your response here..."
                value={feedbackResponse}
                onChange={(e) => setFeedbackResponse(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowFeedbackDialog(false)
              setFeedbackResponse('')
              setSelectedFeedback(null)
            }}>
              Cancel
            </Button>
            <Button onClick={handleSendFeedbackResponse}>Send Response</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Worker Dialog */}
      <Dialog open={showCreateWorkerDialog} onOpenChange={setShowCreateWorkerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Worker Account</DialogTitle>
            <DialogDescription>
              Add a new worker to the system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorker} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workerName">Name *</Label>
              <Input
                id="workerName"
                value={newWorker.name}
                onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workerEmail">Email *</Label>
              <Input
                id="workerEmail"
                type="email"
                value={newWorker.email}
                onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workerPassword">Password *</Label>
              <Input
                id="workerPassword"
                type="password"
                value={newWorker.password}
                onChange={(e) => setNewWorker({ ...newWorker, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workerPhone">Phone</Label>
              <Input
                id="workerPhone"
                value={newWorker.phone}
                onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateWorkerDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Worker</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Worker Dialog */}
      <Dialog open={rejectWorkerDialog} onOpenChange={setRejectWorkerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Worker Signup Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this worker signup
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="workerRejectReason">Rejection Reason *</Label>
              <Textarea
                id="workerRejectReason"
                placeholder="Explain why this signup is being rejected..."
                value={workerRejectReason}
                onChange={(e) => setWorkerRejectReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectWorkerDialog(false)
              setWorkerRejectReason('')
              setSelectedWorkerRequest(null)
            }}>
              Cancel
            </Button>
            <Button onClick={handleRejectWorkerSignup} className="bg-red-600 hover:bg-red-700">
              <XCircle className="w-4 h-4 mr-2" />
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Worker Signup Requests Dialog */}
      <Dialog open={!!selectedWorkerRequest} onOpenChange={() => setSelectedWorkerRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Worker Signup Request</DialogTitle>
            <DialogDescription>
              Review this worker signup request
            </DialogDescription>
          </DialogHeader>
          {selectedWorkerRequest && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p><span className="font-medium">Name:</span> {selectedWorkerRequest.name}</p>
                <p><span className="font-medium">Email:</span> {selectedWorkerRequest.email}</p>
                <p><span className="font-medium">Phone:</span> {selectedWorkerRequest.phone || 'Not provided'}</p>
                <p><span className="font-medium">Submitted:</span> {new Date(selectedWorkerRequest.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => {
                    setSelectedWorkerRequest(selectedWorkerRequest)
                    setRejectWorkerDialog(true)
                  }}
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApproveWorkerSignup(selectedWorkerRequest.id)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      {deleteUserDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  Delete User Account
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  Are you sure you want to delete this user account?
                </p>
              </div>
              {selectedUserToDelete && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="font-medium text-gray-900">{selectedUserToDelete.name}</p>
                  <p className="text-sm text-gray-600">{selectedUserToDelete.email}</p>
                  <p className="text-sm text-gray-600">Role: {selectedUserToDelete.role}</p>
                </div>
              )}
              <p className="text-red-600 text-sm font-medium">
                ⚠️ Warning: This action cannot be undone. All associated data will be permanently deleted.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setDeleteUserDialog(false)
                    setSelectedUserToDelete(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Form */}
      <AnnouncementForm
        isOpen={showAnnouncementForm}
        onClose={() => setShowAnnouncementForm(false)}
        onSuccess={handleAnnouncementSuccess}
        userId={userId}
        userRole="ADMIN"
        onShowSuccess={(message) => {
          setSuccessMessage(message)
          setShowSuccessModal(true)
        }}
      />

      {/* Success Modal */}
      <SuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />

      {/* Logout Modal */}
      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        userName={user?.name}
      />

      {/* User Profile Modal */}
      {sidebarUser && (
        <UserProfileModal
          open={showUserProfileModal}
          onClose={() => setShowUserProfileModal(false)}
          user={sidebarUser}
        />
      )}

      {/* Vulnerable Registration Modal */}
      <VulnerableRegistrationModal
        open={showRegisterVulnerableModal}
        onClose={() => setShowRegisterVulnerableModal(false)}
        onSubmit={handleRegisterVulnerable}
        userRole="admin" />

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
