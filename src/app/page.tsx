'use client'

import dynamic from 'next/dynamic'

import { CrmsLoadingScreen } from '@/components/loading/crms-loading-screen'

// EVERYTHING is lazy-loaded to keep the initial compilation as light as
// possible. The first paint shows a minimal loading spinner, then the
// landing page (or auth screen, or dashboard) loads on the client.
// This prevents OOM kills during the initial webpack compilation.

const LoadingScreen = () => (
  <CrmsLoadingScreen label="Starting CRMS…" />
)

// Top-level shell — lightweight, no heavy deps
const AppShell = dynamic(() => import('./app-shell').then((m) => m.AppShellRoot), {
  ssr: false,
  loading: () => <LoadingScreen />,
})

export default function Home() {
  return <AppShell />
}
