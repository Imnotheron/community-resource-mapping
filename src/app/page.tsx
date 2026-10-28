import type { Metadata } from 'next'
import { HomeShell } from './home-shell'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: { url: '/', type: 'website' },
}

export default function Home() {
  return <HomeShell />
}
