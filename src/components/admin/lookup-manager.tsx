'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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
import { apiFetch } from '@/lib/api-client'

const GROUPS = [
  ['BLOOD_TYPE', 'Blood Type'],
  ['EDUCATIONAL_ATTAINMENT', 'Educational Attainment'],
  ['EMPLOYMENT_STATUS', 'Employment Status'],
  ['GUARDIAN_RELATIONSHIP', 'Guardian Relationship'],
  ['POVERTY_STATUS', 'Poverty Status'],
  ['CIVIL_REGISTRY_STATUS', 'Civil Registry Status'],
  ['DISABILITY_TYPE', 'Disability Type'],
  ['DISABILITY_SEVERITY', 'Disability Severity'],
  ['DISABILITY_CAUSE', 'Disability Cause'],
  ['ASSISTANCE_TYPE', 'Assistance Type'],
  ['DISTRIBUTION_TYPE', 'Distribution Type'],
] as const

type LookupOption = {
  id: string
  groupName: string
  value: string
  label: string
  isActive: boolean
  sortOrder: number
}

export function LookupManager() {
  const [group, setGroup] = useState('EMPLOYMENT_STATUS')
  const [options, setOptions] = useState<LookupOption[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ options?: LookupOption[] }>(
        `/api/admin/lookups?group=${encodeURIComponent(group)}`,
        { cache: 'no-store' },
      )
      setOptions(data.options || [])
    } catch (error: any) {
      toast.error('Failed to load dropdown options', {
        description: error?.message,
      })
    } finally {
      setLoading(false)
    }
  }, [group])

  useEffect(() => {
    load()
  }, [load])

  async function addOption() {
    const label = newLabel.trim()
    if (!label) return

    setSaving(true)
    try {
      await apiFetch('/api/admin/lookups', {
        method: 'POST',
        body: JSON.stringify({ group, label }),
      })
      setNewLabel('')
      await load()
      toast.success('Dropdown option added')
    } catch (error: any) {
      toast.error('Could not add option', {
        description: error?.message,
      })
    } finally {
      setSaving(false)
    }
  }

  async function setActive(option: LookupOption, isActive: boolean) {
    setSaving(true)
    try {
      await apiFetch('/api/admin/lookups', {
        method: 'PATCH',
        body: JSON.stringify({
          id: option.id,
          label: option.label,
          isActive,
          sortOrder: option.sortOrder,
        }),
      })
      await load()
      toast.success(
        isActive
          ? 'Dropdown option restored'
          : 'Dropdown option hidden',
      )
    } catch (error: any) {
      toast.error('Could not update option', {
        description: error?.message,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Dropdown Options
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add or hide reusable registration and operations values without changing source code.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manage list</CardTitle>
          <CardDescription>
            Active entries are fetched automatically by supported forms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[280px_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label>Dropdown group</Label>
              <Select value={group} onValueChange={setGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUPS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>New option</Label>
              <Input
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addOption()
                  }
                }}
                placeholder="Type a new value"
                maxLength={120}
              />
            </div>

            <Button
              type="button"
              className="gap-2"
              onClick={addOption}
              disabled={saving || !newLabel.trim()}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="divide-y rounded-xl border">
            {options.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No options are available for this group.
              </p>
            ) : (
              options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between gap-4 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {option.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {option.isActive ? 'Active' : 'Hidden'}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={option.isActive ? 'outline' : 'secondary'}
                    className="gap-2"
                    disabled={saving}
                    onClick={() => setActive(option, !option.isActive)}
                  >
                    {option.isActive ? (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        Hide
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
