'use client'

import dynamic from 'next/dynamic'
import { Navbar } from './navbar'
import { HeroSection } from './hero-section'
import { Footer } from './footer'
import { useLiveMapData } from '@/hooks/use-live-map-data'

// Lazy-load the FeatureSlider (which imports the Carousel + AssetCard + mock data)
// to keep the initial bundle smaller and reduce compilation memory pressure.
const GeoNetworkScene = dynamic(
  () => import('@/components/effects/geo-network-scene').then((m) => m.GeoNetworkScene),
  { ssr: false }
)

const FeatureSlider = dynamic(
  () => import('./feature-slider').then((m) => m.FeatureSlider),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
      </div>
    ),
  }
)

interface LandingPageProps {
  onAccessPortal: () => void
}

export function LandingPage({ onAccessPortal }: LandingPageProps) {
  const { assets } = useLiveMapData()

  return (
    <div
      id="top"
      className="relative min-h-screen overflow-hidden bg-[#04100c] text-emerald-50"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.12), transparent), radial-gradient(ellipse 60% 40% at 80% 60%, rgba(20,184,166,0.08), transparent)',
      }}
    >
      <GeoNetworkScene />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,0.14),transparent_38%),linear-gradient(180deg,rgba(4,16,12,0)_0%,#04100c_82%)]" aria-hidden="true" />
      <Navbar onAccessPortal={onAccessPortal} />
      <main className="relative z-10">
        <HeroSection onAccessPortal={onAccessPortal} />
        <FeatureSlider liveAssets={assets} />
      </main>
      <div className="relative z-10"><Footer onAccessPortal={onAccessPortal} /></div>
    </div>
  )
}
