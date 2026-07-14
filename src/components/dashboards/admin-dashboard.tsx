"use client";

import VulnerableRegistrationModal from '@/components/modals/VulnerableRegistrationModal';
import { CreateStaffAccountDialog } from "@/components/admin/create-staff-account-dialog";
import { ApprovalCenter } from "@/components/admin/approval-center";
import { useEffect, useState, useCallback, useMemo, type ComponentType } from "react";
import { RoleManual } from "@/components/help/RoleManual";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Package,
  Megaphone,
  MessageSquare,
  BarChart3,
  MapIcon,
  Check,
  X,
  Trash2,
  Loader2,
  TrendingUp,
  AlertCircle,
  Clock,
  ShieldCheck,
  BookOpen,
  Radio,
  MapPin,
  Siren,
  Activity,
  Printer,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { DailyReportsView } from "@/components/reports/daily-reports-view";
import { NavItem } from "@/components/layout/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { WowLoader } from "@/components/ui/wow-loader";
import { AnnouncementForm } from "@/components/forms/announcement-form";
import { AnnouncementsCarousel } from "@/components/dashboards/announcements-carousel";
import { apiFetch, AuthUser } from "@/lib/api-client";
import {
  formatDate,
  formatDateTime,
  timeAgo,
  StatusBadge,
  PriorityBadge,
  formatVulnerabilityTypes,
  vulnerabilityLabel,
} from "./shared";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell as RechartsCell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const VulnerableMap = dynamic(
  () => import("@/components/maps/vulnerable-map").then((m) => m.VulnerableMap),
  {
    ssr: false,
    loading: () => (
      <WowLoader
        compact
        label="Loading map"
        description="Rendering vulnerable citizen locations..."
        className="h-[500px]"
      />
    ),
  },
);

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "approval-center", label: "Approval Center", icon: ShieldCheck },
  { id: "registrations", label: "Registrations", icon: UserCheck },
  { id: "users", label: "Users", icon: Users },
  { id: "distributions", label: "Relief Approval", icon: Package },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "map", label: "Vulnerable Map", icon: MapIcon },
  { id: "reports", label: "Daily Reports", icon: Printer },
  { id: "guide", label: "User Guide", icon: BookOpen },
];

interface AdminDashboardProps {
  user: AuthUser;
  onLogout: () => void;
  onProfile: () => void;
}


function getUserPhoto(user: AuthUser): string | null {
  const possibleUser = user as AuthUser & {
    profilePicture?: string | null
    profileImage?: string | null
    profilePhoto?: string | null
    photoUrl?: string | null
    avatarUrl?: string | null
    avatar?: string | null
    image?: string | null
    picture?: string | null
  }

  return (
    possibleUser.profilePicture ||
    possibleUser.profileImage ||
    possibleUser.profilePhoto ||
    possibleUser.photoUrl ||
    possibleUser.avatarUrl ||
    possibleUser.avatar ||
    possibleUser.image ||
    possibleUser.picture ||
    null
  )
}

export function AdminDashboard({
  user,
  onLogout,
  onProfile,
}: AdminDashboardProps) {
  const [view, setView] = useState("overview");

  return (
    <AppShell
      items={NAV_ITEMS}
      activeView={view}
      onNavigate={setView}
      onLogout={onLogout}
      onProfile={onProfile}
      userName={user.name || 'Admin User'}
      userEmail={user.email || ''}
      userRole={user.role || 'ADMIN'}
      userPhoto={getUserPhoto(user)}
    >
      {view === "overview" && <OverviewView />}
      {view === "approval-center" && <ApprovalCenter admin={user} />}
      {view === "registrations" && <RegistrationsView />}
      {view === "users" && <UsersView />}
      {view === "distributions" && <DistributionsView />}
      {view === "announcements" && <AnnouncementsView />}
      {view === "feedback" && <FeedbackView />}
      {view === "analytics" && <AnalyticsView />}
      {view === "map" && <MapView />}
      {view === "reports" && <DailyReportsView user={user} />}
      {view === "guide" && <RoleManual role={user.role || "ADMIN"} />}
    </AppShell>
  );
}

// =================== OVERVIEW ===================
function OverviewView() {
  const [stats, setStats] = useState<any>(null);
  const [activeUsers, setActiveUsers] = useState<any>(null);
  const [recentProfiles, setRecentProfiles] = useState<any[]>([]);
  const [mapPoints, setMapPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, au, profiles, mapData] = await Promise.all([
        apiFetch("/api/admin/stats"),
        apiFetch("/api/active-users"),
        apiFetch("/api/admin/profiles"),
        apiFetch("/api/map/data").catch(() => ({ points: [] })),
      ]);

      setStats(s.stats);
      setActiveUsers(au.stats);
      setRecentProfiles((profiles.profiles || []).slice(0, 5));
      setMapPoints(mapData.points || []);
    } catch (err: any) {
      toast.error("Failed to load overview", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <WowLoader
        label="Opening operations center"
        description="Syncing registrations, live map records, relief operations, and municipal activity..."
      />
    );
  }

  const pending = stats?.pending ?? 0;
  const total = stats?.total ?? 0;
  const approved = stats?.approved ?? activeUsers?.approvedProfiles ?? 0;
  const activeTotal = activeUsers?.total ?? 0;

  const activityItems = [
    pending > 0
      ? {
          tone: "amber" as const,
          title: `${pending} registration${pending === 1 ? "" : "s"} awaiting review`,
          description: "Approval desk requires administrator validation.",
          time: "Now",
        }
      : {
          tone: "emerald" as const,
          title: "Registration queue is clear",
          description: "No vulnerable profile applications are currently pending.",
          time: "Now",
        },
    {
      tone: "sky" as const,
      title: `${mapPoints.length} mapped vulnerable location${mapPoints.length === 1 ? "" : "s"}`,
      description: "GIS layer is ready for municipal operations review.",
      time: "Live",
    },
    {
      tone: "emerald" as const,
      title: `${activeTotal} active system account${activeTotal === 1 ? "" : "s"}`,
      description: `${activeUsers?.admins ?? 0} admin · ${activeUsers?.workers ?? 0} worker · ${activeUsers?.vulnerable ?? 0} vulnerable`,
      time: "Synced",
    },
    ...recentProfiles.slice(0, 2).map((profile) => ({
      tone: "slate" as const,
      title: `${profile.firstName || "Citizen"} ${profile.lastName || ""}`.trim(),
      description: `${profile.barangay || "Unknown barangay"} · ${profile.registrationStatus || "SUBMITTED"}`,
      time: timeAgo(profile.createdAt),
    })),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Executive Operations Center
          </p>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">
            Municipal Operations Overview
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            High-level command view for registrations, relief readiness, vulnerable citizen mapping, and live system activity.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          Live municipal workspace
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CivicMetricCard
          label="Registered vulnerable families"
          value={total}
          hint={`${approved} approved and eligible`}
          tone="emerald"
          icon={ShieldCheck}
        />
        <CivicMetricCard
          label="Pending applications"
          value={pending}
          hint="Awaiting admin review"
          tone="amber"
          icon={Clock}
        />
        <CivicMetricCard
          label="Active system users"
          value={activeTotal}
          hint={`${activeUsers?.admins ?? 0} admin · ${activeUsers?.workers ?? 0} worker · ${activeUsers?.vulnerable ?? 0} vulnerable`}
          tone="sky"
          icon={Users}
        />
        <CivicMetricCard
          label="Mapped locations"
          value={mapPoints.length}
          hint="Approved GIS records"
          tone="rose"
          icon={MapPin}
        />
      </div>

      <div className="grid min-h-[520px] gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.75fr)]">
        <Card className="overflow-hidden rounded-[1.75rem] border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <MapIcon className="h-4 w-4 text-emerald-600" />
                  Live vulnerable citizen GIS map
                </CardTitle>
                <CardDescription>
                  Operational map layer for assistance prioritization and municipal planning.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">Needs assistance</span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">No relief yet</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Relief received</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="relative overflow-hidden rounded-[1.35rem]">
              <VulnerableMap
                points={mapPoints}
                height={430}
                interactiveMarkers={false}
              />

              <div className="pointer-events-none absolute right-4 top-4 z-[30] rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm backdrop-blur-xl">
                Overview markers locked
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[1.75rem] border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <Radio className="h-4 w-4 text-emerald-600" />
              System activity / alerts
            </CardTitle>
            <CardDescription>
              Live administrative signals for quick decision-making.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {activityItems.map((item, index) => (
              <ActivityFeedItem
                key={`${item.title}-${index}`}
                tone={item.tone}
                title={item.title}
                description={item.description}
                time={item.time}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Clock className="h-4 w-4 text-emerald-600" />
              Recent registrations
            </CardTitle>
            <CardDescription>Latest vulnerable profile submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProfiles.length === 0 ? (
              <CivicEmptyState title="No registrations yet" description="New citizen submissions will appear here for rapid review." />
            ) : (
              recentProfiles.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {p.barangay} · {timeAgo(p.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={p.registrationStatus} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Activity className="h-4 w-4 text-emerald-600" />
              Operational shortcuts
            </CardTitle>
            <CardDescription>Common administrative workflows</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <QuickAction label="Review pending registrations" count={pending} hint="Approve or reject vulnerable profiles" />
            <QuickAction label="Approve relief distributions" hint="Pending distribution requests" />
            <QuickAction label="Publish announcement" hint="Notify workers and citizens" />
            <QuickAction label="Review feedback" hint="Messages from citizens" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CivicMetricCard({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  hint: string;
  tone: "emerald" | "amber" | "sky" | "rose";
  icon: ComponentType<{ className?: string }>;
}) {
  const toneClass = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  }[tone];

  return (
    <div className="group rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.09)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-2xl border ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function ActivityFeedItem({
  tone,
  title,
  description,
  time,
}: {
  tone: "emerald" | "amber" | "rose" | "sky" | "slate";
  title: string;
  description: string;
  time: string;
}) {
  const toneClass = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    sky: "bg-sky-500",
    slate: "bg-slate-400",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-emerald-200 hover:bg-white">
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${toneClass}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold leading-5 text-slate-950">{title}</p>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{time}</span>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function CivicEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
      <Siren className="mx-auto h-7 w-7 text-slate-400" />
      <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function QuickAction({
  label,
  count,
  hint,
}: {
  label: string;
  count?: number;
  hint: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-emerald-200 hover:bg-emerald-50/30">
      <div>
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="text-xs leading-5 text-slate-500">{hint}</p>
      </div>
      {count !== undefined && count > 0 && (
        <Badge className="bg-amber-100 text-amber-800">{count}</Badge>
      )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

// =================== REGISTRATIONS ===================
function RegistrationsView() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')
  const [rejectTarget, setRejectTarget] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRegisterVulnerable, setShowRegisterVulnerable] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const data = await apiFetch('/api/admin/profiles')
      setProfiles(data.profiles || [])
    } catch (err: any) {
      toast.error('Failed to load profiles', { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = profiles.filter(
    (p) => filter === 'ALL' || p.registrationStatus === filter
  )

  const approve = async (profileId: string) => {
    try {
      await apiFetch('/api/admin/approve', {
        method: 'POST',
        body: JSON.stringify({ profileId }),
      })

      toast.success('Profile approved', {
        description: 'The citizen can now log in.',
      })

      load()
    } catch (err: any) {
      toast.error('Approval failed', { description: err.message })
    }
  }

  const reject = async () => {
    if (!rejectTarget) return

    try {
      await apiFetch('/api/admin/reject', {
        method: 'POST',
        body: JSON.stringify({
          profileId: rejectTarget.id,
          reason: rejectReason,
        }),
      })

      toast.success('Profile rejected')
      setRejectTarget(null)
      setRejectReason('')
      load()
    } catch (err: any) {
      toast.error('Rejection failed', { description: err.message })
    }
  }

  const registerVulnerablePerson = async (formData: any) => {
    const adminId = getAdminId()

    if (!adminId) {
      toast.error('Admin session missing', {
        description: 'Please sign in again before registering a vulnerable person.',
      })
      throw new Error('Admin session missing')
    }

    try {
      const payload = {
        ...formData,
        adminId,

        // Strip File objects because your current API route receives JSON only.
        pwdRegistrationForm: undefined,
        medicalCertificate: undefined,
        proofOfIdentity: undefined,
        proofOfResidence: undefined,
        idPhotos: undefined,

        hasPWDRegistrationForm: !!formData.hasPWDRegistrationForm,
        hasMedicalCertificate: !!formData.hasMedicalCertificate,
        hasProofOfIdentity: !!formData.hasProofOfIdentity,
        hasProofOfResidence: !!formData.hasProofOfResidence,
        hasIDPhotos: !!formData.hasIDPhotos,
      }

      const data = await apiFetch('/api/admin/register-vulnerable', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      toast.success('Vulnerable person registered', {
        description:
          data?.user?.defaultPassword
            ? `Temporary password: ${data.user.defaultPassword}`
            : 'The profile has been created and approved.',
      })

      setShowRegisterVulnerable(false)
      await load()
    } catch (err: any) {
      toast.error('Registration failed', {
        description: err.message || 'Unable to register vulnerable person.',
      })

      throw err
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Vulnerable Registrations
          </h1>
          <p className="text-sm text-muted-foreground">
            Review, approve, and register vulnerable citizen profiles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => setShowRegisterVulnerable(true)}
            className="gap-1.5"
          >
            <UserCheck className="h-4 w-4" />
            Register Vulnerable Person
          </Button>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <WowLoader
          compact
          label="Loading records"
          description="Fetching the latest approval queue..."
        />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No {filter.toLowerCase()} registrations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const vuln = formatVulnerabilityTypes(p.vulnerabilityTypes)

            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">
                          {p.firstName}{' '}
                          {p.middleName ? p.middleName.charAt(0) + '.' : ''}{' '}
                          {p.lastName}
                          {p.suffix ? ', ' + p.suffix : ''}
                        </h3>
                        <StatusBadge status={p.registrationStatus} />
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground md:grid-cols-3">
                        <span>
                          <b className="text-foreground">Email:</b>{' '}
                          {p.emailAddress}
                        </span>
                        <span>
                          <b className="text-foreground">Mobile:</b>{' '}
                          {p.mobileNumber}
                        </span>
                        <span>
                          <b className="text-foreground">Barangay:</b>{' '}
                          {p.barangay}
                        </span>
                        <span>
                          <b className="text-foreground">Gender:</b>{' '}
                          {p.gender || '—'}
                        </span>
                        <span>
                          <b className="text-foreground">DOB:</b>{' '}
                          {formatDate(p.dateOfBirth)}
                        </span>
                        <span>
                          <b className="text-foreground">Submitted:</b>{' '}
                          {timeAgo(p.createdAt)}
                        </span>
                      </div>

                      {vuln.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-xs font-medium text-foreground">
                            Vulnerabilities:
                          </span>
                          {vuln.map((v: string) => (
                            <Badge
                              key={v}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {vulnerabilityLabel(v)}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {p.rejectionReason && (
                        <p className="text-xs text-destructive">
                          <b>Rejection reason:</b> {p.rejectionReason}
                        </p>
                      )}
                    </div>

                    {p.registrationStatus === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approve(p.id)}
                          className="gap-1.5"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectTarget(p)}
                          className="gap-1.5"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {rejectTarget?.firstName}{' '}
              {rejectTarget?.lastName}&apos;s registration. This will be visible
              to the citizen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Missing required documents..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={reject}>
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VulnerableRegistrationModal
        open={showRegisterVulnerable}
        onClose={() => setShowRegisterVulnerable(false)}
        onSubmit={registerVulnerablePerson}
        userRole="admin"
      />
    </div>
  )
}


function formatLastSeen(value?: string | null) {
  if (!value) return "Never seen";

  try {
    return `Last seen ${timeAgo(value)}`;
  } catch {
    return "Last seen recently";
  }
}

function OnlineStatusBadge({ user }: { user: any }) {
  const isOnline = Boolean(user?.isOnline);

  return (
    <div className="flex flex-col gap-1">
      <Badge
        variant="outline"
        className={
          isOnline
            ? "w-fit border-emerald-200 bg-emerald-50 text-emerald-700"
            : "w-fit border-slate-200 bg-slate-50 text-slate-500"
        }
      >
        <span
          className={
            isOnline
              ? "mr-1.5 h-2 w-2 rounded-full bg-emerald-500"
              : "mr-1.5 h-2 w-2 rounded-full bg-slate-400"
          }
        />
        {isOnline ? "Online" : "Offline"}
      </Badge>
      <span className="text-[11px] text-muted-foreground">
        {isOnline ? "Active now" : formatLastSeen(user?.lastSeenAt)}
      </span>
    </div>
  );
}


function userInitials(user: any) {
  return String(user?.name || user?.email || "User")
    .split(/\\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function UserManagementAvatar({ user }: { user: any }) {
  const picture =
    user?.profilePicture ||
    user?.profileImage ||
    user?.profilePhoto ||
    user?.photoUrl ||
    user?.avatarUrl ||
    null;

  return (
    <Avatar className="h-10 w-10 border border-slate-200 bg-slate-100 shadow-sm">
      {picture ? (
        <AvatarImage
          src={picture}
          alt={user?.name || "User profile"}
          className="object-cover"
        />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
        {userInitials(user)}
      </AvatarFallback>
    </Avatar>
  );
}


function AccountSetupBadge({ user }: { user: any }) {
  if (user?.vulnerableProfile) {
    return (
      <StatusBadge
        status={user.vulnerableProfile.registrationStatus}
      />
    );
  }

  return (
    <Badge
      variant="outline"
      className="w-fit border-blue-200 bg-blue-50 font-semibold text-blue-700"
    >
      Account Created
    </Badge>
  );
}

// =================== USERS ===================
type UserRoleFilter = "ALL" | "ADMIN" | "WORKER" | "VULNERABLE";
type PresenceFilter = "ALL" | "ONLINE_NOW" | "ONLINE_TODAY" | "NOT_ONLINE_TODAY" | "OFFLINE";

function normalizeRole(role: any) {
  return String(role || "").trim().toUpperCase();
}

function isSeenToday(value: any) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getUserPresence(user: any) {
  const onlineNow = Boolean(user?.isOnline);
  const onlineToday = onlineNow || isSeenToday(user?.lastSeenAt);

  return {
    onlineNow,
    onlineToday,
    notOnlineToday: !onlineToday,
    offline: !onlineNow,
  };
}

function UsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("ALL");
  const [presenceFilter, setPresenceFilter] = useState<PresenceFilter>("ALL");
  const [filterAnimationKey, setFilterAnimationKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const changeRoleFilter = (nextFilter: UserRoleFilter) => {
    if (nextFilter === roleFilter) return;
    setRoleFilter(nextFilter);
    setFilterAnimationKey((key) => key + 1);
  };

  const changePresenceFilter = (nextFilter: PresenceFilter) => {
    if (nextFilter === presenceFilter) return;
    setPresenceFilter(nextFilter);
    setFilterAnimationKey((key) => key + 1);
  };

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);

    try {
      const data = await apiFetch("/api/admin/users");
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error("Failed to load users", { description: err.message });
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);

    const intervalId = window.setInterval(() => {
      load(false);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [load]);

  const roleTabs = useMemo(() => {
    const countRole = (role: UserRoleFilter) => {
      if (role === "ALL") return users.length;
      return users.filter((user) => normalizeRole(user.role) === role).length;
    };

    return [
      { value: "ALL" as const, label: "All", count: countRole("ALL") },
      { value: "ADMIN" as const, label: "Admin", count: countRole("ADMIN") },
      { value: "WORKER" as const, label: "Worker", count: countRole("WORKER") },
      { value: "VULNERABLE" as const, label: "Vulnerable", count: countRole("VULNERABLE") },
    ];
  }, [users]);

  const presenceStats = useMemo(() => {
    const onlineNow = users.filter((user) => getUserPresence(user).onlineNow).length;
    const onlineToday = users.filter((user) => getUserPresence(user).onlineToday).length;
    const notOnlineToday = users.filter((user) => getUserPresence(user).notOnlineToday).length;
    const offline = users.filter((user) => getUserPresence(user).offline).length;

    return {
      onlineNow,
      onlineToday,
      notOnlineToday,
      offline,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const userRole = normalizeRole(user.role);
      const presence = getUserPresence(user);

      const matchesRole = roleFilter === "ALL" || userRole === roleFilter;

      const matchesPresence =
        presenceFilter === "ALL" ||
        (presenceFilter === "ONLINE_NOW" && presence.onlineNow) ||
        (presenceFilter === "ONLINE_TODAY" && presence.onlineToday) ||
        (presenceFilter === "NOT_ONLINE_TODAY" && presence.notOnlineToday) ||
        (presenceFilter === "OFFLINE" && presence.offline);

      return matchesRole && matchesPresence;
    });
  }, [users, roleFilter, presenceFilter]);

  const requestDeleteUser = (user: any) => {
    setDeleteTarget(user);
  };

  const cancelDeleteUser = () => {
    if (deletingUser) return;
    setDeleteTarget(null);
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget?.id) return;

    setDeletingUser(true);

    try {
      await apiFetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
        body: JSON.stringify({ adminId: getAdminId() }),
      });

      setUsers((currentUsers) =>
        currentUsers.filter((user) => user.id !== deleteTarget.id),
      );
      toast.success("User deleted", {
        description: `${deleteTarget.name || deleteTarget.email || "The user"} was removed successfully.`,
      });
      setDeleteTarget(null);
      load(false);
    } catch (err: any) {
      toast.error("Delete failed", { description: err.message });
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <style>{`
        @keyframes crmsUserRowReveal {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes crmsFilterPanelReveal {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .crms-filter-panel-reveal {
          animation: crmsFilterPanelReveal 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .crms-user-row-reveal {
          animation: crmsUserRowReveal 460ms cubic-bezier(0.16, 1, 0.3, 1) both;
          will-change: transform, opacity, filter;
        }

        @media (prefers-reduced-motion: reduce) {
          .crms-filter-panel-reveal,
          .crms-user-row-reveal {
            animation: none;
          }
        }
      `}</style>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between crms-filter-panel-reveal">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">
            All system users and their roles.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur">
            <Select
              value={presenceFilter}
              onValueChange={(value) => changePresenceFilter(value as PresenceFilter)}
            >
              <SelectTrigger className="h-10 min-w-[230px] rounded-xl border-0 bg-transparent font-semibold shadow-none focus:ring-0">
                <SelectValue placeholder="Filter online activity" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="ALL">All online activity</SelectItem>
                <SelectItem value="ONLINE_NOW">Online now ({presenceStats.onlineNow})</SelectItem>
                <SelectItem value="ONLINE_TODAY">Online today ({presenceStats.onlineToday})</SelectItem>
                <SelectItem value="NOT_ONLINE_TODAY">Not online today ({presenceStats.notOnlineToday})</SelectItem>
                <SelectItem value="OFFLINE">Offline ({presenceStats.offline})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            onClick={() => setShowCreate(true)}
            className="gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Create Account
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-emerald-100/80 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-white to-cyan-50/40 pb-4 crms-filter-panel-reveal">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {roleTabs.map((tab) => {
                const active = roleFilter === tab.value;

                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => changeRoleFilter(tab.value)}
                    className={
                      active
                        ? "inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(16,185,129,0.25)] transition duration-300 hover:-translate-y-0.5 active:scale-95"
                        : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
                    }
                  >
                    {tab.label}
                    <span
                      className={
                        active
                          ? "rounded-full bg-white/20 px-2 py-0.5 text-xs text-white"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                      }
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-700">
                <span className="block text-[10px] uppercase tracking-[0.16em]">Online now</span>
                <span className="text-lg font-semibold">{presenceStats.onlineNow}</span>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700">
                <span className="block text-[10px] uppercase tracking-[0.16em]">Online today</span>
                <span className="text-lg font-semibold">{presenceStats.onlineToday}</span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                <span className="block text-[10px] uppercase tracking-[0.16em]">Not today</span>
                <span className="text-lg font-semibold">{presenceStats.notOnlineToday}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <WowLoader
                compact
                label="Loading users"
                description="Preparing account records..."
              />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div key={`empty-${roleFilter}-${presenceFilter}-${filterAnimationKey}`} className="flex flex-col items-center justify-center px-6 py-14 text-center crms-user-row-reveal">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                <Users className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-950">No users match this filter.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try switching the role section or online activity filter.
              </p>
            </div>
          ) : (
            <Table key={`users-table-${roleFilter}-${presenceFilter}-${filterAnimationKey}`}>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Account / Registration</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u, index) => (
                  <TableRow
                    key={`${u.id}-${roleFilter}-${presenceFilter}-${filterAnimationKey}`}
                    className="crms-user-row-reveal transition-colors hover:bg-emerald-50/35"
                    style={{ animationDelay: `${Math.min(index, 8) * 48}ms` }}
                  >
                    <TableCell>
                      <div className="flex min-w-[220px] items-center gap-3">
                        <UserManagementAvatar user={u} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {u.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {u.profilePicture ? "Profile photo uploaded" : "Initials avatar"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.phone || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell>
                      <AccountSetupBadge user={u} />
                    </TableCell>
                    <TableCell>
                      <OnlineStatusBadge user={u} />
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id !== getAdminId() ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => requestDeleteUser(u)}
                          className="text-destructive"
                          aria-label={`Delete ${u.name || u.email || "user"}`}
                          title={
                            normalizeRole(u.role) === "ADMIN"
                              ? "Delete this Administrator account"
                              : "Delete this user account"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500"
                        >
                          Current account
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateStaffAccountDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => load(false)}
      />

      <DeleteUserConfirmDialog
        user={deleteTarget}
        open={Boolean(deleteTarget)}
        deleting={deletingUser}
        onCancel={cancelDeleteUser}
        onConfirm={confirmDeleteUser}
      />
    </div>
  );
}

function DeleteUserConfirmDialog({
  user,
  open,
  deleting,
  onCancel,
  onConfirm,
}: {
  user: any | null;
  open: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const displayName = user?.name || "Selected user";
  const displayEmail = user?.email || "No email recorded";
  const displayRole = normalizeRole(user?.role) || "USER";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogContent className="overflow-hidden border-0 bg-white p-0 shadow-[0_30px_90px_rgba(15,23,42,0.24)] sm:max-w-lg">
        <div className="relative bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.16),transparent_38%),linear-gradient(135deg,#ffffff,#f8fafc)] px-6 pb-5 pt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close delete confirmation"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4 pr-10">
            <div className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl border border-red-100 bg-red-50 text-red-600 shadow-sm">
              <Trash2 className="h-6 w-6" />
            </div>

            <div>
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-950">
                  Delete this account?
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-slate-600">
                  This action permanently removes the selected account and related access. Accounts may be deleted whether password setup is pending or complete. The current Administrator and the last remaining Administrator are protected.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-950">
                  {displayName}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-slate-500">
                  {displayEmail}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 font-mono text-xs">
                {displayRole}
              </Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold leading-relaxed text-red-700">
            Please confirm only if you are sure this account should be removed from the system.
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-slate-100 bg-white px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-xl bg-red-600 font-semibold text-white shadow-[0_14px_35px_rgba(220,38,38,0.24)] hover:bg-red-700"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getAdminId(): string {
  if (typeof window === "undefined") return "";
  const u = localStorage.getItem("crms_user");
  return u ? JSON.parse(u).id : "";
}

function CreateWorkerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdWorker, setCreatedWorker] = useState<{
    name: string;
    email: string;
    phone?: string | null;
    emailSent: boolean;
    smsSent: boolean;
  } | null>(null);

  const closeCreateDialog = (nextOpen: boolean) => {
    if (submitting) return;
    onOpenChange(nextOpen);
  };

  const submit = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanEmail) {
      toast.error("Missing worker details", {
        description: "Please enter the worker's full name and email address.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const data = await apiFetch("/api/admin/create-worker", {
        method: "POST",
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          adminId: getAdminId(),
        }),
      });

      const worker = data?.user || {};
      setCreatedWorker({
        name: worker?.name || cleanName,
        email: worker?.email || cleanEmail,
        phone: worker?.phone || cleanPhone || null,
        emailSent: Boolean(data?.notification?.emailSent),
        smsSent: Boolean(data?.notification?.smsSent),
      });

      setName("");
      setEmail("");
      setPhone("");
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error("Failed to create worker", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={closeCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Field Worker Account</DialogTitle>
            <DialogDescription>
              A secure worker login will be created and delivered through your configured notification channels.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cw-name">Full Name</Label>
              <Input
                id="cw-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cw-email">Email</Label>
              <Input
                id="cw-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cw-phone">Phone (optional)</Label>
              <Input
                id="cw-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => closeCreateDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdWorker} onOpenChange={(nextOpen) => !nextOpen && setCreatedWorker(null)}>
        <DialogContent className="overflow-hidden border-0 p-0 shadow-[0_32px_120px_rgba(15,23,42,0.28)] sm:max-w-[560px]">
          {createdWorker && (
            <div className="relative bg-white">
              <div className="relative overflow-hidden border-b border-emerald-100 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_34%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#f8fafc_100%)] px-7 pb-6 pt-7">
                <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl" />
                <div className="absolute -bottom-20 left-10 h-36 w-36 rounded-full bg-cyan-200/30 blur-3xl" />

                <div className="relative flex items-start gap-4 pr-8">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 shadow-[0_16px_45px_rgba(16,185,129,0.24)]">
                    <Check className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
                      Account setup complete
                    </p>
                    <DialogTitle className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                      Worker Account Created
                    </DialogTitle>
                    <DialogDescription className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                      The worker account is now active. For security, login credentials are never displayed in this confirmation.
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-7 py-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        New worker profile
                      </p>
                      <h3 className="mt-2 truncate text-xl font-semibold tracking-tight text-slate-950">
                        {createdWorker.name}
                      </h3>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                        {createdWorker.email}
                      </p>
                      {createdWorker.phone ? (
                        <p className="mt-1 text-sm font-medium text-slate-500">{createdWorker.phone}</p>
                      ) : null}
                    </div>

                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                      Worker
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white shadow-sm">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">Secure credential handling</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        Login details should be delivered only through approved channels. The password is hidden from this confirmation to avoid exposing credentials on-screen.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div
                    className={`rounded-2xl border px-4 py-3 shadow-sm ${
                      createdWorker.emailSent
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-orange-200 bg-orange-50 text-orange-700"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                      Email notification
                    </p>
                    <p className="mt-1 font-semibold">
                      {createdWorker.emailSent ? "Sent successfully" : "Not sent"}
                    </p>
                  </div>

                  <div
                    className={`rounded-2xl border px-4 py-3 shadow-sm ${
                      createdWorker.smsSent
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                      SMS notification
                    </p>
                    <p className="mt-1 font-semibold">
                      {createdWorker.smsSent ? "Sent successfully" : "Skipped / not configured"}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-100 bg-slate-50/80 px-7 py-4">
                <Button
                  variant="outline"
                  onClick={() => setCreatedWorker(null)}
                  className="rounded-2xl border-slate-200 bg-white px-6 font-semibold"
                >
                  Close
                </Button>
                <Button
                  onClick={() => setCreatedWorker(null)}
                  className="rounded-2xl bg-emerald-600 px-7 font-semibold text-white shadow-[0_14px_35px_rgba(16,185,129,0.28)] hover:bg-emerald-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// =================== DISTRIBUTIONS (Approval) ===================
function DistributionsView() {
  const [distributions, setDistributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/admin/distributions");
      setDistributions(data.distributions || []);
    } catch (err: any) {
      toast.error("Failed to load distributions", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = distributions.filter(
    (d) => filter === "ALL" || d.status === filter,
  );

  const act = async (id: string, action: "APPROVE" | "REJECT") => {
    const reason =
      action === "REJECT"
        ? prompt("Reason for rejection (optional):") || ""
        : "";
    try {
      await apiFetch("/api/admin/relief-approval", {
        method: "POST",
        body: JSON.stringify({ distributionId: id, action, reason }),
      });
      toast.success(
        `Distribution ${action === "APPROVE" ? "approved" : "rejected"}`,
      );
      load();
    } catch (err: any) {
      toast.error("Action failed", { description: err.message });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Relief Distribution Approval
          </h1>
          <p className="text-sm text-muted-foreground">
            Review relief distributions recorded by field workers.
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <WowLoader
          compact
          label="Loading records"
          description="Fetching the latest approval queue..."
        />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No {filter.toLowerCase()} distributions.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{d.distributionType}</h3>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {d.itemsProvided}
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground md:grid-cols-4">
                      <span>
                        <b className="text-foreground">Beneficiary:</b>{" "}
                        {d.vulnerableProfile
                          ? `${d.vulnerableProfile.firstName} ${d.vulnerableProfile.lastName}`
                          : "Household"}
                      </span>
                      <span>
                        <b className="text-foreground">Worker:</b>{" "}
                        {d.worker?.name}
                      </span>
                      <span>
                        <b className="text-foreground">Quantity:</b>{" "}
                        {d.quantity}
                      </span>
                      <span>
                        <b className="text-foreground">Date:</b>{" "}
                        {formatDate(d.distributionDate)}
                      </span>
                    </div>
                    {d.notes && (
                      <p className="text-xs italic text-muted-foreground">
                        "{d.notes}"
                      </p>
                    )}
                    {d.rejectionReason && (
                      <p className="text-xs text-destructive">
                        <b>Reason:</b> {d.rejectionReason}
                      </p>
                    )}
                  </div>
                  {d.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => act(d.id, "APPROVE")}
                        className="gap-1.5"
                      >
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => act(d.id, "REJECT")}
                        className="gap-1.5"
                      >
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// =================== ANNOUNCEMENTS ===================
function AnnouncementsView() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const data = await apiFetch(`/api/announcements?userRole=ADMIN`);
      setAnnouncements(data.announcements || []);
    } catch (err: any) {
      const message = err?.message || "Failed to load announcements";
      setLoadError(message);
      toast.error("Failed to load announcements", { description: message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (announcement = deleteTarget) => {
    if (!announcement?.id) return;

    setDeletingId(announcement.id);

    try {
      await apiFetch(`/api/announcements/${announcement.id}?requesterId=${getAdminId()}`, {
        method: "DELETE",
      });
      toast.success("Announcement deleted", {
        description: `${announcement.title || "The announcement"} has been removed from the public list.`,
      });
      setDeleteTarget(null);
      await load();
    } catch (err: any) {
      toast.error("Delete failed", { description: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const urgentCount = announcements.filter((item) => item.priority === "URGENT" || item.priority === "HIGH").length;
  const workerCount = announcements.filter((item) => item.targetRole === "WORKER" || item.targetRole === "ALL").length;
  const citizenCount = announcements.filter((item) => item.targetRole === "VULNERABLE" || item.targetRole === "ALL").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Municipal communications
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Announcements
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Publish official notices, emergency advisories, meeting reminders, and relief updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={load}
            disabled={loading}
            className="rounded-xl border-slate-200 bg-white"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
          <Button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="rounded-xl bg-cyan-600 text-white hover:bg-cyan-700"
          >
            {showForm ? "View List" : "New Announcement"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Published</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{announcements.length}</p>
          <p className="mt-1 text-xs text-slate-500">Active official notices</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">High priority</p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">{urgentCount}</p>
          <p className="mt-1 text-xs text-amber-800/80">Needs extra visibility</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Audience reach</p>
          <p className="mt-2 text-sm font-semibold text-emerald-950">{workerCount} worker · {citizenCount} citizen</p>
          <p className="mt-2 text-xs text-emerald-800/80">Based on selected target audience</p>
        </div>
      </div>

      {!showForm && <AnnouncementsCarousel userRole="admin" />}

      {showForm ? (
        <Card className="overflow-hidden rounded-[1.5rem] border-emerald-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-950">
                  New Announcement
                </CardTitle>
                <CardDescription>
                  Complete the form below. The system validates the payload before saving it to the announcement table.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <AnnouncementForm
              onSubmitted={() => {
                setShowForm(false);
                load();
              }}
            />
          </CardContent>
        </Card>
      ) : loading ? (
        <WowLoader
          compact
          label="Loading announcements"
          description="Collecting official notices..."
        />
      ) : loadError ? (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="py-8 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-500" />
            <p className="text-sm font-semibold text-rose-900">Announcements could not load.</p>
            <p className="mt-1 text-xs text-rose-700">{loadError}</p>
            <Button type="button" variant="outline" className="mt-4 bg-white" onClick={load}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : announcements.length === 0 ? (
        <Card className="rounded-[1.5rem] border-dashed border-slate-200 bg-white">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Megaphone className="mb-3 h-9 w-9 text-slate-400" />
            <p className="text-sm font-semibold text-slate-950">No announcements yet</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              Publish your first notice to inform workers and citizens about municipal updates.
            </p>
            <Button className="mt-4 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700" onClick={() => setShowForm(true)}>
              Create Announcement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className="rounded-2xl border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{a.title}</h3>
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        {String(a.type || "GENERAL").replace(/_/g, " ")}
                      </Badge>
                      <PriorityBadge priority={a.priority} />
                      {a.targetRole && (
                        <Badge variant="secondary" className="rounded-full text-[10px]">
                          To: {a.targetRole === "ALL" ? "Everyone" : a.targetRole}
                        </Badge>
                      )}
                    </div>
                    <p className="max-w-4xl whitespace-pre-line text-sm leading-6 text-slate-600">{a.content}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {a.eventDate && (
                        <span>
                          📅 {formatDate(a.eventDate)}
                          {a.eventTime ? ` ${a.eventTime}` : ""}
                        </span>
                      )}
                      {a.location && <span>📍 {a.location}</span>}
                      <span>🕒 {timeAgo(a.createdAt)}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={deletingId === a.id}
                    onClick={() => setDeleteTarget(a)}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    aria-label={`Delete announcement ${a.title}`}
                  >
                    {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeleteTarget(null);
        }}
      >
        <DialogContent className="overflow-hidden rounded-[1.6rem] border-0 p-0 shadow-[0_32px_100px_rgba(15,23,42,0.28)] sm:max-w-lg">
          <div className="border-b border-rose-100 bg-gradient-to-br from-rose-50 via-white to-amber-50 px-6 py-5">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-rose-200 bg-white text-rose-600 shadow-sm">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">
                    Delete announcement
                  </p>
                  <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                    Remove this official notice?
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm leading-6 text-slate-600">
                    This announcement will be removed from the published list and will no longer be visible to its audience.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Selected notice
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {deleteTarget?.title || "Untitled announcement"}
              </p>
              {deleteTarget?.content ? (
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-600">
                  {deleteTarget.content}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {deleteTarget?.type ? (
                  <Badge variant="outline" className="rounded-full bg-white text-[10px]">
                    {String(deleteTarget.type).replace(/_/g, " ")}
                  </Badge>
                ) : null}
                {deleteTarget?.priority ? <PriorityBadge priority={deleteTarget.priority} /> : null}
                {deleteTarget?.targetRole ? (
                  <Badge variant="secondary" className="rounded-full text-[10px]">
                    To: {deleteTarget.targetRole === "ALL" ? "Everyone" : deleteTarget.targetRole}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <div className="flex gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Deleting is permanent for this record. Create a new announcement if this notice needs to be published again later.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(deletingId)}
              className="rounded-xl border-slate-200 bg-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => remove()}
              disabled={Boolean(deletingId)}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
            >
              {deletingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =================== FEEDBACK ===================
function FeedbackView() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondTarget, setRespondTarget] = useState<any | null>(null);
  const [response, setResponse] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/admin/feedback?adminView=true");
      setFeedback(data.feedback || []);
    } catch (err: any) {
      toast.error("Failed to load feedback", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async () => {
    if (!respondTarget) return;
    try {
      await apiFetch("/api/admin/feedback", {
        method: "POST",
        body: JSON.stringify({
          feedbackId: respondTarget.id,
          adminResponse: response,
        }),
      });
      toast.success("Response sent");
      setRespondTarget(null);
      setResponse("");
      load();
    } catch (err: any) {
      toast.error("Failed to respond", { description: err.message });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Feedback Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Review and respond to feedback from citizens and workers.
        </p>
      </div>

      {loading ? (
        <WowLoader
          compact
          label="Loading feedback"
          description="Checking messages and responses..."
        />
      ) : feedback.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No feedback yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {f.type.replace(/_/g, " ")}
                      </Badge>
                      <StatusBadge status={f.status} />
                      <span className="text-xs text-muted-foreground">
                        from {f.user?.name} · {timeAgo(f.createdAt)}
                      </span>
                    </div>
                    {f.subject && <h3 className="font-medium">{f.subject}</h3>}
                    <p className="text-sm text-muted-foreground">{f.message}</p>
                    {f.adminResponse && (
                      <div className="mt-2 rounded-md bg-muted p-2 text-xs">
                        <span className="font-medium text-foreground">
                          Admin response:
                        </span>{" "}
                        {f.adminResponse}
                      </div>
                    )}
                  </div>
                  {!f.adminResponse && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRespondTarget(f);
                        setResponse("");
                      }}
                    >
                      Respond
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!respondTarget}
        onOpenChange={(o) => !o && setRespondTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Feedback</DialogTitle>
            <DialogDescription>
              From {respondTarget?.user?.name}:{" "}
              {respondTarget?.message?.slice(0, 100)}...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="resp">Your response</Label>
            <Textarea
              id="resp"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
              placeholder="Type your response..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondTarget(null)}>
              Cancel
            </Button>
            <Button onClick={respond} disabled={!response.trim()}>
              Send Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =================== ANALYTICS ===================
function AnalyticsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/admin/analytics?days=90");
        setData(res.analytics);
      } catch (err: any) {
        toast.error("Failed to load analytics", { description: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <WowLoader
        label="Loading analytics"
        description="Crunching registration trends, relief stats, and feedback data..."
      />
    );
  if (!data)
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No analytics data.
        </CardContent>
      </Card>
    );

  const regData = (data.registrationsByDate || []).map((r: any) => ({
    date: r.date.slice(5),
    count: r.count,
  }));
  const distData = (data.distributionsByDate || []).map((r: any) => ({
    date: r.date.slice(5),
    count: r.count,
  }));
  const vulnData = Object.entries(data.vulnerabilityCounts || {}).map(
    ([name, value]) => ({
      name: vulnerabilityLabel(name),
      value: value as number,
    }),
  );
  const typeData = Object.entries(data.distributionByType || {}).map(
    ([name, value]) => ({
      name,
      value: value as number,
    }),
  );
  const PIE_COLORS = [
    "#10b981",
    "#34d399",
    "#6ee7b7",
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#8b5cf6",
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          90-day trends for registrations, distributions, and vulnerabilities.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="gov-stat">
          <span className="stat-label">Distributions</span>
          <span className="stat-value text-primary">
            {data.reliefCoverage.totalDistributions}
          </span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Items Distributed</span>
          <span className="stat-value">
            {data.reliefCoverage.totalQuantity}
          </span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Feedback</span>
          <span className="stat-value">{data.feedbackStats.total}</span>
        </div>
        <div className="gov-stat">
          <span className="stat-label">Pending Feedback</span>
          <span className="stat-value text-amber-600">
            {data.feedbackStats.submitted}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrations (90 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={regData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distributions (90 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={distData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vulnerability Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {vulnData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={vulnData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {vulnData.map((_: any, i: number) => (
                      <RechartsCell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribution Types</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="number"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="var(--chart-2)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =================== MAP ===================
function MapView() {
  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("/api/map/data");
        setPoints(data.points || []);
      } catch (err: any) {
        toast.error("Failed to load map data", { description: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleViewProfile = useCallback(async (profileId: string) => {
    setProfileDialogOpen(true);
    setProfileLoading(true);
    setSelectedProfile(null);

    try {
      const data = await apiFetch("/api/admin/profiles");
      const profiles = data.profiles || [];

      const profile =
        profiles.find((item: any) => item.id === profileId) ||
        profiles.find((item: any) => item.userId === profileId) ||
        null;

      if (!profile) {
        toast.error("Profile not found", {
          description: "The selected map marker does not match an available vulnerable profile record.",
        });
        return;
      }

      setSelectedProfile(profile);
    } catch (err: any) {
      toast.error("Failed to load profile", { description: err.message });
    } finally {
      setProfileLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Vulnerable Citizens Map
        </h1>
        <p className="text-sm text-muted-foreground">
          Geospatial view of approved vulnerable individuals. Markers:{" "}
          <span className="text-red-600">needs assistance</span> ·{" "}
          <span className="text-amber-600">no relief yet</span> ·{" "}
          <span className="text-emerald-600">relief received</span>
        </p>
      </div>

      {loading ? (
        <WowLoader
          compact
          label="Loading map data"
          description="Plotting approved vulnerable citizen locations..."
          className="h-[420px]"
        />
      ) : (
        <Card>
          <CardContent className="p-2">
            <VulnerableMap
              points={points}
              height={500}
              onViewProfile={handleViewProfile}
            />
          </CardContent>
        </Card>
      )}

      <AdminMapProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        loading={profileLoading}
        profile={selectedProfile}
      />
    </div>
  );
}

function AdminMapProfileDialog({
  open,
  onOpenChange,
  loading,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  profile: any | null;
}) {
  const fullName = profile
    ? `${profile.firstName || ""} ${profile.middleName ? profile.middleName + " " : ""}${profile.lastName || ""}${profile.suffix ? ", " + profile.suffix : ""}`.trim()
    : "";

  const address = profile
    ? [
      profile.houseNumber,
      profile.street,
      profile.barangay,
      profile.municipality,
      profile.province,
    ]
      .filter(Boolean)
      .join(", ")
    : "";

  const vulnerabilities = profile
    ? formatVulnerabilityTypes(profile.vulnerabilityTypes)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Vulnerable Citizen Profile</DialogTitle>
          <DialogDescription>
            Full registered details for the selected map marker.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <WowLoader
            compact
            label="Loading profile"
            description="Retrieving the full vulnerable citizen record..."
          />
        ) : !profile ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No profile loaded.</p>
              <p className="text-xs text-muted-foreground">
                Select a recorded map marker and choose View full profile.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Registered Citizen
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                      {fullName || "Unnamed profile"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {profile.emailAddress || "No email recorded"}
                    </p>
                  </div>

                  <StatusBadge status={profile.registrationStatus || "UNKNOWN"} />
                </div>

                {profile.rejectionReason && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <b>Rejection reason:</b> {profile.rejectionReason}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <ProfileInfoRow label="Gender" value={profile.gender} />
                  <ProfileInfoRow label="Civil Status" value={profile.civilStatus} />
                  <ProfileInfoRow label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
                  <ProfileInfoRow label="Mobile" value={profile.mobileNumber} />
                  <ProfileInfoRow label="Landline" value={profile.landlineNumber} />
                  <ProfileInfoRow label="Education" value={profile.educationalAttainment} />
                  <ProfileInfoRow label="Employment" value={profile.employmentStatus} />
                  <ProfileInfoRow label="Employment Details" value={profile.employmentDetails} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Address & Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <ProfileInfoRow label="Full Address" value={address} />
                  <ProfileInfoRow label="Barangay" value={profile.barangay} />
                  <ProfileInfoRow label="Latitude" value={profile.latitude?.toString()} />
                  <ProfileInfoRow label="Longitude" value={profile.longitude?.toString()} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vulnerability & Medical</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="mb-2 font-medium text-muted-foreground">
                      Vulnerability Types
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {vulnerabilities.length > 0 ? (
                        vulnerabilities.map((item: string) => (
                          <Badge key={item} variant="secondary" className="text-[10px]">
                            {vulnerabilityLabel(item)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">None recorded</span>
                      )}
                    </div>
                  </div>

                  <ProfileInfoRow label="Needs Assistance" value={profile.needsAssistance ? "Yes" : "No"} />
                  <ProfileInfoRow label="Assistance Type" value={profile.assistanceType} />
                  <ProfileInfoRow label="Disability Type" value={profile.disabilityType} />
                  <ProfileInfoRow label="Disability Cause" value={profile.disabilityCause} />
                  <ProfileInfoRow label="Disability ID Number" value={profile.disabilityIdNumber} />
                  <ProfileInfoRow label="Medical Conditions" value={profile.medicalConditions} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <ProfileInfoRow label="Contact Name" value={profile.emergencyContact} />
                  <ProfileInfoRow label="Contact Phone" value={profile.emergencyPhone} />
                  <ProfileInfoRow label="Submitted" value={formatDateTime(profile.createdAt)} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileInfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-1.5 last:border-0 last:pb-0">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-semibold">
        {value || "—"}
      </span>
    </div>
  );
}




