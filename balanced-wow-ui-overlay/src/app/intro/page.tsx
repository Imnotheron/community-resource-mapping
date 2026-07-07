'use client'

import { useRouter } from 'next/navigation'
import { LandingPage } from '@/components/landing/landing-page'

export default function IntroPage() {
  const router = useRouter()
  return <LandingPage onAccessPortal={() => router.push('/login')} />
}
