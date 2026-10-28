import type { Metadata } from 'next'
import { HomeShell } from './home-shell'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Community Resource Mapping System — San Policarpo, Eastern Samar',
    description:
      'Explore the CRMS academic capstone project for community mapping, vulnerable citizen registration, relief tracking and community updates.',
    url: '/',
    type: 'website',
    images: [{ url: '/logos/crms-system-icon.png', alt: 'CRMS logo' }],
  },
}

export default function Home() {
  return <HomeShell />
}
