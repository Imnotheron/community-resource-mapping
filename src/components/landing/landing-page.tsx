'use client'

import { Navbar } from './navbar'
import { HeroSection } from './hero-section'
import { Footer } from './footer'

interface LandingPageProps {
  onAccessPortal: () => void
}

export function LandingPage({ onAccessPortal }: LandingPageProps) {
  return (
    <div id="top" className="min-h-screen bg-white text-slate-900">
      <Navbar onAccessPortal={onAccessPortal} />
      <main>
        <HeroSection onAccessPortal={onAccessPortal} />
      </main>
      <Footer onAccessPortal={onAccessPortal} />
    </div>
  )
}
