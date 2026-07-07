'use client'

import dynamic from 'next/dynamic'

// EVERYTHING is lazy-loaded to keep the initial compilation as light as
// possible. The first paint shows a minimal loading spinner, then the
// landing page (or auth screen, or dashboard) loads on the client.
// This prevents OOM kills during the initial webpack compilation.

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#04100c]">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
      <p className="text-sm text-emerald-300/70">Loading San Policarpo CRMS…</p>
    </div>
  </div>
)

// Top-level shell — lightweight, no heavy deps
const AppShell = dynamic(() => import('./app-shell').then((m) => m.AppShellRoot), {
  ssr: false,
  loading: () => <LoadingScreen />,
})

export default function Home() {
  return <AppShell />
}
