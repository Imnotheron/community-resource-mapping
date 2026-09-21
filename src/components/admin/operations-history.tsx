'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CalendarRange,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { apiFetch } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WowLoader } from '@/components/ui/wow-loader'
import { StatusBadge, formatDate, formatDateTime } from '@/components/dashboards/shared'

const ALL = 'ALL'

function fullName(profile: any) {
  if (!profile) return ''
  return [
    profile.firstName,
    profile.middleName,
    profile.lastName,
    profile.suffix,
  ]
    .filter(Boolean)
    .join(' ')
}

function lastNameOfDistribution(item: any) {
  return (
    item?.vulnerableProfile?.lastName ||
    item?.household?.headOfHousehold ||
    ''
  )
}

function beneficiaryName(item: any) {
  return (
    fullName(item?.vulnerableProfile) ||
    item?.household?.headOfHousehold ||
    'Household beneficiary'
  )
}

function barangayOfDistribution(item: any) {
  return (
    item?.vulnerableProfile?.barangay ||
    item?.household?.barangay ||
    'Unspecified'
  )
}

function eventState(item: any) {
  if (!item?.eventDate) return 'UNSCHEDULED'

  const eventDate = new Date(item.eventDate)
  if (Number.isNaN(eventDate.getTime())) return 'UNSCHEDULED'

  const today = new Date()
  const eventDay = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate(),
  )
  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )

  if (eventDay.getTime() < todayDay.getTime()) return 'COMPLETED'
  if (eventDay.getTime() === todayDay.getTime()) return 'TODAY'
  return 'UPCOMING'
}

function eventStateLabel(value: string) {
  if (value === 'COMPLETED') return 'Completed'
  if (value === 'TODAY') return 'Today'
  if (value === 'UPCOMING') return 'Upcoming'
  return 'Unscheduled'
}

function prettyType(value: string) {
  return String(value || 'GENERAL')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function OperationsHistory() {
  const [tab, setTab] = useState('relief')
  const [data, setData] = useState<any>({
    distributions: [],
    events: [],
  })
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [distributionType, setDistributionType] = useState(ALL)
  const [barangay, setBarangay] = useState(ALL)
  const [distributionStatus, setDistributionStatus] = useState(ALL)
  const [distributionFromDate, setDistributionFromDate] = useState('')
  const [distributionToDate, setDistributionToDate] = useState('')
  const [distributionSort, setDistributionSort] = useState('DATE_DESC')

  const [eventType, setEventType] = useState(ALL)
  const [eventStatus, setEventStatus] = useState(ALL)
  const [audience, setAudience] = useState(ALL)
  const [eventFromDate, setEventFromDate] = useState('')
  const [eventToDate, setEventToDate] = useState('')
  const [eventSort, setEventSort] = useState('DATE_DESC')

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const result = await apiFetch('/api/admin/history')
      setData({
        distributions: result.distributions || [],
        events: result.events || [],
      })
    } catch (error: any) {
      toast.error('Failed to load history', {
        description: error?.message || 'Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const distributionTypes = useMemo(
    () =>
      Array.from(
        new Set(
          data.distributions
            .map((item: any) => String(item.distributionType || '').trim())
            .filter(Boolean),
        ),
      ).sort((a: any, b: any) => a.localeCompare(b)),
    [data.distributions],
  )

  const barangays = useMemo(
    () =>
      Array.from(
        new Set(
          data.distributions
            .map((item: any) => barangayOfDistribution(item))
            .filter(Boolean),
        ),
      ).sort((a: any, b: any) => a.localeCompare(b)),
    [data.distributions],
  )

  const eventTypes = useMemo(
    () =>
      Array.from(
        new Set(
          data.events
            .map((item: any) => String(item.type || '').trim())
            .filter(Boolean),
        ),
      ).sort((a: any, b: any) => a.localeCompare(b)),
    [data.events],
  )

  const audiences = useMemo(
    () =>
      Array.from(
        new Set(
          data.events
            .map((item: any) => String(item.targetRole || 'ALL').trim())
            .filter(Boolean),
        ),
      ).sort((a: any, b: any) => a.localeCompare(b)),
    [data.events],
  )

  const filteredDistributions = useMemo(() => {
    const search = query.trim().toLowerCase()

    return [...data.distributions]
      .filter((item: any) => {
        const searchable = [
          beneficiaryName(item),
          item.distributionType,
          item.itemsProvided,
          item.worker?.name,
          barangayOfDistribution(item),
          item.status,
          item.notes,
        ]
          .join(' ')
          .toLowerCase()

        const happenedAt = new Date(
          item.distributionDate || item.createdAt || 0,
        )

        const fromMatches =
          !distributionFromDate ||
          happenedAt.getTime() >=
            new Date(`${distributionFromDate}T00:00:00`).getTime()

        const toMatches =
          !distributionToDate ||
          happenedAt.getTime() <=
            new Date(`${distributionToDate}T23:59:59.999`).getTime()

        return (
          (!search || searchable.includes(search)) &&
          (distributionType === ALL ||
            item.distributionType === distributionType) &&
          (barangay === ALL ||
            barangayOfDistribution(item) === barangay) &&
          (distributionStatus === ALL ||
            item.status === distributionStatus) &&
          fromMatches &&
          toMatches
        )
      })
      .sort((a: any, b: any) => {
        if (distributionSort === 'TYPE') {
          const compared = String(a.distributionType || '').localeCompare(
            String(b.distributionType || ''),
          )
          if (compared !== 0) return compared
        }

        if (distributionSort === 'BARANGAY') {
          const compared = barangayOfDistribution(a).localeCompare(
            barangayOfDistribution(b),
          )
          if (compared !== 0) return compared
        }

        if (distributionSort === 'LAST_NAME') {
          const compared = lastNameOfDistribution(a).localeCompare(
            lastNameOfDistribution(b),
          )
          if (compared !== 0) return compared
        }

        if (distributionSort === 'STATUS') {
          const compared = String(a.status || '').localeCompare(
            String(b.status || ''),
          )
          if (compared !== 0) return compared
        }

        const aDate = new Date(a.distributionDate || a.createdAt || 0).getTime()
        const bDate = new Date(b.distributionDate || b.createdAt || 0).getTime()

        if (distributionSort === 'DATE_ASC') {
          return aDate - bDate
        }

        return bDate - aDate
      })
  }, [
    barangay,
    data.distributions,
    distributionFromDate,
    distributionSort,
    distributionStatus,
    distributionToDate,
    distributionType,
    query,
  ])

  const filteredEvents = useMemo(() => {
    const search = query.trim().toLowerCase()

    return [...data.events]
      .filter((item: any) => {
        const state = eventState(item)
        const searchable = [
          item.title,
          item.content,
          item.type,
          item.location,
          item.targetRole,
          state,
        ]
          .join(' ')
          .toLowerCase()

        const happenedAt = new Date(item.eventDate || item.createdAt || 0)

        const fromMatches =
          !eventFromDate ||
          happenedAt.getTime() >=
            new Date(`${eventFromDate}T00:00:00`).getTime()

        const toMatches =
          !eventToDate ||
          happenedAt.getTime() <=
            new Date(`${eventToDate}T23:59:59.999`).getTime()

        return (
          (!search || searchable.includes(search)) &&
          (eventType === ALL || item.type === eventType) &&
          (eventStatus === ALL || state === eventStatus) &&
          (audience === ALL || (item.targetRole || 'ALL') === audience) &&
          fromMatches &&
          toMatches
        )
      })
      .sort((a: any, b: any) => {
        if (eventSort === 'TYPE') {
          const compared = String(a.type || '').localeCompare(
            String(b.type || ''),
          )
          if (compared !== 0) return compared
        }

        if (eventSort === 'TITLE') {
          return String(a.title || '').localeCompare(String(b.title || ''))
        }

        if (eventSort === 'STATUS') {
          return eventState(a).localeCompare(eventState(b))
        }

        const aDate = new Date(a.eventDate || a.createdAt || 0).getTime()
        const bDate = new Date(b.eventDate || b.createdAt || 0).getTime()

        if (eventSort === 'DATE_ASC') {
          return aDate - bDate
        }

        return bDate - aDate
      })
  }, [
    audience,
    data.events,
    eventFromDate,
    eventSort,
    eventStatus,
    eventToDate,
    eventType,
    query,
  ])

  const reliefCountByType = useMemo(() => {
    const counts = new Map<string, number>()
    data.distributions.forEach((item: any) => {
      const key = item.distributionType || 'Unspecified'
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return counts
  }, [data.distributions])

  if (loading) {
    return (
      <WowLoader
        label="Loading operations history"
        description="Collecting relief records, meetings, events, and municipal activities..."
      />
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Municipal Records
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Operations History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review completed and pending relief distributions, meetings, events, and other recorded municipal activities.
          </p>
        </div>

        <Button variant="outline" onClick={load} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <Package className="h-4 w-4 text-emerald-600" />
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              Relief records
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {data.distributions.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <CalendarRange className="h-4 w-4 text-sky-600" />
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              Events / activities
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {data.events.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <CalendarDays className="h-4 w-4 text-violet-600" />
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              Completed events
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {data.events.filter((item: any) => eventState(item) === 'COMPLETED').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Users className="h-4 w-4 text-amber-600" />
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              Distribution types
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {reliefCountByType.size}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value)
          setQuery('')
        }}
      >
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="relief">
            Relief Distribution History
          </TabsTrigger>
          <TabsTrigger value="events">
            Events & Activities
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">
              {tab === 'relief'
                ? 'Relief History Filters'
                : 'Event History Filters'}
            </CardTitle>
            <CardDescription>
              Sort and narrow large historical lists before reviewing records.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  tab === 'relief'
                    ? 'Search beneficiary, worker, barangay, items...'
                    : 'Search title, location, event type, audience...'
                }
                className="pl-9"
              />
            </div>

            {tab === 'relief' ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label>Distribution type</Label>
                  <Select value={distributionType} onValueChange={setDistributionType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      <SelectItem value={ALL}>All distribution types</SelectItem>
                      {distributionTypes.map((type: any) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Barangay</Label>
                  <Select value={barangay} onValueChange={setBarangay}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      <SelectItem value={ALL}>All barangays</SelectItem>
                      {barangays.map((name: any) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={distributionStatus} onValueChange={setDistributionStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All statuses</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>From date</Label>
                  <Input
                    type="date"
                    value={distributionFromDate}
                    onChange={(event) => setDistributionFromDate(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>To date</Label>
                  <Input
                    type="date"
                    value={distributionToDate}
                    onChange={(event) => setDistributionToDate(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sort by</Label>
                  <Select value={distributionSort} onValueChange={setDistributionSort}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DATE_DESC">Newest distribution first</SelectItem>
                      <SelectItem value="DATE_ASC">Oldest distribution first</SelectItem>
                      <SelectItem value="TYPE">Distribution type</SelectItem>
                      <SelectItem value="BARANGAY">Barangay</SelectItem>
                      <SelectItem value="LAST_NAME">Last name</SelectItem>
                      <SelectItem value="STATUS">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label>Event type</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      <SelectItem value={ALL}>All event types</SelectItem>
                      {eventTypes.map((type: any) => (
                        <SelectItem key={type} value={type}>{prettyType(type)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Event status</Label>
                  <Select value={eventStatus} onValueChange={setEventStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All event statuses</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="TODAY">Today</SelectItem>
                      <SelectItem value="UPCOMING">Upcoming</SelectItem>
                      <SelectItem value="UNSCHEDULED">Unscheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All audiences</SelectItem>
                      {audiences.map((value: any) => (
                        <SelectItem key={value} value={value}>{prettyType(value)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>From date</Label>
                  <Input
                    type="date"
                    value={eventFromDate}
                    onChange={(event) => setEventFromDate(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>To date</Label>
                  <Input
                    type="date"
                    value={eventToDate}
                    onChange={(event) => setEventToDate(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sort by</Label>
                  <Select value={eventSort} onValueChange={setEventSort}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DATE_DESC">Newest event first</SelectItem>
                      <SelectItem value="DATE_ASC">Oldest event first</SelectItem>
                      <SelectItem value="TYPE">Event type</SelectItem>
                      <SelectItem value="TITLE">Title</SelectItem>
                      <SelectItem value="STATUS">Event status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <TabsContent value="relief" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Relief Distribution History ({filteredDistributions.length})
              </CardTitle>
              <CardDescription>
                Includes approved, pending, and rejected distribution records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDistributions.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No relief history matches the selected filters.
                </p>
              ) : (
                <div className="max-h-[68vh] space-y-3 overflow-y-auto pr-2">
                  {filteredDistributions.map((item: any) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-950">
                              {beneficiaryName(item)}
                            </h3>
                            <StatusBadge status={item.status} />
                            <Badge variant="outline">
                              {item.distributionType}
                            </Badge>
                          </div>

                          <p className="mt-2 text-sm text-slate-600">
                            {item.itemsProvided}
                          </p>

                          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                            <span>
                              <b className="text-slate-700">Barangay:</b>{' '}
                              {barangayOfDistribution(item)}
                            </span>
                            <span>
                              <b className="text-slate-700">Quantity:</b>{' '}
                              {item.quantity}
                            </span>
                            <span>
                              <b className="text-slate-700">Worker:</b>{' '}
                              {item.worker?.name || '—'}
                            </span>
                            <span>
                              <b className="text-slate-700">Date:</b>{' '}
                              {formatDate(item.distributionDate)}
                            </span>
                          </div>

                          {item.notes ? (
                            <p className="mt-3 text-xs italic text-slate-500">
                              {item.notes}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Events & Activities History ({filteredEvents.length})
              </CardTitle>
              <CardDescription>
                Meetings, relief activities, health notices, emergency activities, and other published municipal events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEvents.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No events match the selected filters.
                </p>
              ) : (
                <div className="max-h-[68vh] space-y-3 overflow-y-auto pr-2">
                  {filteredEvents.map((item: any) => {
                    const state = eventState(item)

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-slate-950">
                                {item.title}
                              </h3>
                              <Badge variant="outline">
                                {prettyType(item.type)}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={
                                  state === 'COMPLETED'
                                    ? 'border-slate-200 bg-slate-50 text-slate-700'
                                    : state === 'TODAY'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : state === 'UPCOMING'
                                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                                        : 'border-amber-200 bg-amber-50 text-amber-700'
                                }
                              >
                                {eventStateLabel(state)}
                              </Badge>
                            </div>

                            <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                              {item.content}
                            </p>

                            <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {item.eventDate
                                  ? formatDate(item.eventDate)
                                  : 'Published ' + formatDate(item.createdAt)}
                              </span>
                              <span>
                                <b className="text-slate-700">Time:</b>{' '}
                                {item.eventTime || '—'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {item.location || 'No location specified'}
                              </span>
                              <span>
                                <b className="text-slate-700">Audience:</b>{' '}
                                {prettyType(item.targetRole || 'ALL')}
                              </span>
                            </div>

                            <p className="mt-3 text-[0.6875rem] text-slate-400">
                              Recorded {formatDateTime(item.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
