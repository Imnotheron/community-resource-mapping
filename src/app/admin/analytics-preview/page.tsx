'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { PremiumAdminAnalyticsV2 } from '@/components/analytics/premium-admin-analytics-v2'
import { Button } from '@/components/ui/button'
import { useUserSync } from '@/hooks/use-user-sync'

const ROLE = 'admin'
const LOGIN_PATH = '/login?role=admin'

function PreviewLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium">Opening analytics preview…</p>
      </div>
    </div>
  )
}

export default function AdminAnalyticsPreviewPage() {
  const router = useRouter()
  const { user, loading } = useUserSync()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted || loading) return

    if (!user || String(user.role || '').toLowerCase() !== ROLE) {
      router.replace(LOGIN_PATH)
    }
  }, [hasMounted, loading, router, user])

  if (!hasMounted || loading) {
    return <PreviewLoading />
  }

  if (!user || String(user.role || '').toLowerCase() !== ROLE) {
    return <PreviewLoading />
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_26%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.08),transparent_28%),#f8fafc] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/dashboard')}
            className="rounded-xl bg-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Button>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
            Analytics V2 · accurate legends + 3D
          </span>
        </div>
        <PremiumAdminAnalyticsV2 />
      </div>
    </main>
  )
}
