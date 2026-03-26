'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import dynamic from 'next/dynamic'
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  MapPin,
  Navigation,
  ExternalLink,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  UserCircle,
  Info
} from 'lucide-react'

// Dynamically import map component to avoid SSR issues
const SingleLocationMap = dynamic(() => import('@/components/map/SingleLocationMap'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
    <div className="text-slate-600 dark:text-slate-400">Loading map...</div>
  </div>
})

interface VulnerableProfile {
  id: string
  userId: string
  lastName: string
  firstName: string
  middleName?: string
  suffix?: string
  dateOfBirth?: string
  gender?: string
  civilStatus?: string
  mobileNumber?: string
  landlineNumber?: string
  emailAddress?: string
  houseNumber?: string
  street?: string
  barangay: string
  municipality: string
  province: string
  latitude?: number
  longitude?: number
  educationalAttainment?: string
  employmentStatus?: string
  employmentDetails?: string
  vulnerabilityTypes: string
  disabilityType?: string
  disabilityCause?: string
  disabilityIdNumber?: string
  hasMedicalCondition: boolean
  medicalConditions?: string
  needsAssistance: boolean
  assistanceType?: string
  emergencyContact?: string
  emergencyPhone?: string
  registrationStatus: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

interface UserData {
  id: string
  name: string
  email: string
  phone?: string | null
  role: string
  profilePicture?: string | null
  createdAt: string
  updatedAt: string
  vulnerableProfile?: VulnerableProfile | null
}

interface ViewUserProfileModalProps {
  open: boolean
  onClose: () => void
  user: UserData | null
}

export default function ViewUserProfileModal({ open, onClose, user }: ViewUserProfileModalProps) {
  const [showMap, setShowMap] = useState(false)

  if (!user) return null

  const getRoleColor = (role: string) => {
    const upperRole = role.toUpperCase()
    switch (upperRole) {
      case 'VULNERABLE':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-600'
        }
      case 'WORKER':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/30',
          text: 'text-emerald-600 dark:text-emerald-400',
          badge: 'bg-emerald-600'
        }
      case 'ADMIN':
      default:
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-600 dark:text-purple-400',
          badge: 'bg-purple-600'
        }
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available'
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDirections = (lat: number, lng: number, address: string) => {
    // Open Google Maps with directions
    const query = encodeURIComponent(`${address}`)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
  }

  const colors = getRoleColor(user.role)
  const profile = user.vulnerableProfile

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">User Profile</DialogTitle>
          <DialogDescription>
            View detailed user information and profile data
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* User Header Card */}
          <Card className={`border-2 ${colors.text.replace('text', 'border')} bg-gradient-to-br ${colors.bg}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar className="w-24 h-24 border-4 border-white dark:border-slate-800 shadow-xl">
                  <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
                  <AvatarFallback className={`bg-gradient-to-br ${colors.badge.replace('bg-', 'to-')} ${colors.badge} text-white text-3xl font-bold`}>
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        {user.name}
                      </h3>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${colors.badge} text-white text-sm font-medium`}>
                        <Shield className="w-3 h-3" />
                        <span className="uppercase">{user.role}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <Phone className="w-4 h-4" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Calendar className="w-4 h-4" />
                      <span>Member since {formatDate(user.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vulnerable Profile Section */}
          {profile && (
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserCircle className="w-5 h-5 text-emerald-600" />
                  Vulnerable Person Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Registration Status */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <span className="font-medium">Registration Status:</span>
                  </div>
                  {getStatusBadge(profile.registrationStatus)}
                </div>

                {profile.rejectionReason && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-300">Rejection Reason:</p>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">{profile.rejectionReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Full Name</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {profile.lastName}, {profile.firstName} {profile.middleName || ''} {profile.suffix || ''}
                      </p>
                    </div>
                    {profile.dateOfBirth && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Date of Birth</p>
                        <p className="font-medium text-slate-900 dark:text-white">{formatDate(profile.dateOfBirth)}</p>
                      </div>
                    )}
                    {profile.gender && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Gender</p>
                        <p className="font-medium text-slate-900 dark:text-white">{profile.gender}</p>
                      </div>
                    )}
                    {profile.civilStatus && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Civil Status</p>
                        <p className="font-medium text-slate-900 dark:text-white">{profile.civilStatus}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profile.mobileNumber && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Mobile Number</p>
                        <p className="font-medium text-slate-900 dark:text-white">{profile.mobileNumber}</p>
                      </div>
                    )}
                    {profile.landlineNumber && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Landline Number</p>
                        <p className="font-medium text-slate-900 dark:text-white">{profile.landlineNumber}</p>
                      </div>
                    )}
                    {profile.emailAddress && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg md:col-span-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Email Address</p>
                        <p className="font-medium text-slate-900 dark:text-white">{profile.emailAddress}</p>
                      </div>
                    )}
                    {profile.emergencyContact && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg md:col-span-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Emergency Contact</p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {profile.emergencyContact} {profile.emergencyPhone && `(${profile.emergencyPhone})`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Address Information
                  </h4>

                  {/* Full Address with Actions */}
                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <div className="space-y-2 mb-4">
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {profile.houseNumber || ''} {profile.street || ''} {profile.barangay || ''}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {profile.municipality}, {profile.province}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {profile.latitude && profile.longitude && (
                        <Button
                          onClick={() => getDirections(profile.latitude!, profile.longitude!, `${profile.houseNumber} ${profile.street}, ${profile.barangay}, ${profile.municipality}`)}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                          size="sm"
                        >
                          <Navigation className="w-4 h-4" />
                          Get Directions
                        </Button>
                      )}
                      <Button
                        onClick={() => setShowMap(!showMap)}
                        variant="outline"
                        className="gap-2 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        size="sm"
                      >
                        <MapPin className="w-4 h-4" />
                        {showMap ? 'Hide Map' : 'View on Map'}
                      </Button>
                    </div>
                  </div>

                  {/* Map Preview */}
                  {showMap && profile.latitude && profile.longitude && (
                    <div className="rounded-lg overflow-hidden border-2 border-emerald-200 dark:border-emerald-800">
                      <SingleLocationMap
                        name={`${profile.firstName} ${profile.lastName}`}
                        latitude={profile.latitude}
                        longitude={profile.longitude}
                        address={`${profile.houseNumber || ''} ${profile.street || ''}`}
                        barangay={profile.barangay}
                        vulnerabilityTypes={profile.vulnerabilityTypes ? JSON.parse(profile.vulnerabilityTypes) : []}
                        phone={profile.mobileNumber}
                        email={profile.emailAddress}
                        status={profile.registrationStatus}
                      />
                    </div>
                  )}

                  {/* Detailed Address Fields */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {profile.houseNumber && (
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">House Number</p>
                          <p className="font-medium text-slate-900 dark:text-white">{profile.houseNumber}</p>
                        </div>
                      )}
                      {profile.street && (
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Street</p>
                          <p className="font-medium text-slate-900 dark:text-white">{profile.street}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Barangay</p>
                        <p className="font-medium text-slate-900 dark:text-white">{profile.barangay}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Municipality</p>
                        <p className="font-medium text-slate-900 dark:text-white">{profile.municipality}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Province</p>
                        <p className="font-medium text-slate-900 dark:text-white">{profile.province}</p>
                      </div>
                      {(profile.latitude || profile.longitude) && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Coordinates</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {profile.latitude?.toFixed(6)}, {profile.longitude?.toFixed(6)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Education and Employment */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Education & Employment
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profile.educationalAttainment && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Educational Attainment</p>
                        <p className="font-medium text-slate-900 dark:text-white">{profile.educationalAttainment}</p>
                      </div>
                    )}
                    {profile.employmentStatus && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Employment Status</p>
                        <p className="font-medium text-slate-900 dark:text-white">{profile.employmentStatus}</p>
                      </div>
                    )}
                    {profile.employmentDetails && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg md:col-span-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Employment Details</p>
                        <p className="font-medium text-slate-900 dark:text-white">{profile.employmentDetails}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vulnerability Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-emerald-600" />
                    Vulnerability Information
                  </h4>
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Vulnerability Types</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.vulnerabilityTypes ? JSON.parse(profile.vulnerabilityTypes).map((type: string, i: number) => (
                          <Badge key={i} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {type.replace(/_/g, ' ')}
                          </Badge>
                        )) : <span className="text-sm text-slate-600">None specified</span>}
                      </div>
                    </div>

                    {profile.disabilityType && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Disability Type</p>
                        <p className="font-medium text-slate-900 dark:text-white">{profile.disabilityType}</p>
                        {profile.disabilityCause && (
                          <>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 mb-1">Cause of Disability</p>
                            <p className="font-medium text-slate-900 dark:text-white">{profile.disabilityCause}</p>
                          </>
                        )}
                        {profile.disabilityIdNumber && (
                          <>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 mb-1">Disability ID Number</p>
                            <p className="font-medium text-slate-900 dark:text-white">{profile.disabilityIdNumber}</p>
                          </>
                        )}
                      </div>
                    )}

                    {profile.hasMedicalCondition && profile.medicalConditions && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-xs text-red-600 dark:text-red-400 mb-2">Medical Conditions</p>
                        <p className="font-medium text-red-900 dark:text-red-300">{profile.medicalConditions}</p>
                      </div>
                    )}

                    {profile.needsAssistance && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">Assistance Needed</p>
                        <p className="font-medium text-amber-900 dark:text-amber-300">{profile.assistanceType || 'General assistance required'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Registration Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Registered On</p>
                    <p className="font-medium text-slate-900 dark:text-white">{formatDate(profile.createdAt)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Last Updated</p>
                    <p className="font-medium text-slate-900 dark:text-white">{formatDate(profile.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!profile && user.role === 'VULNERABLE' && (
            <Card className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300">No Vulnerable Profile Found</p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      This user is marked as a vulnerable person but has not completed their profile yet.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
