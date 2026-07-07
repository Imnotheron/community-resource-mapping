import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/theme-provider'
import ClickSpark from '@/components/effects/ClickSpark'
import AccountSetupReminder from '@/components/onboarding/account-setup-reminder'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'Community Resource Mapping System - San Policarpo, Eastern Samar',
    template: '%s | Community Resource Mapping System',
  },
  description:
    'A comprehensive system for identifying, tracking, and supporting vulnerable groups with real-time mapping and relief distribution tracking.',
  keywords: [
    'Community',
    'Resource Mapping',
    'Vulnerable Groups',
    'PWD',
    'San Policarpo',
    'Eastern Samar',
    'Relief Distribution',
  ],
  authors: [{ name: 'San Policarpo LGU' }],
  icons: {
    icon: [
      { url: '/icon.png?v=5', type: 'image/png', sizes: '32x32' },
      { url: '/icon.png?v=5', type: 'image/png', sizes: '192x192' },
      { url: '/favicon.ico?v=5', sizes: 'any' },
    ],
    shortcut: '/icon.png?v=5',
    apple: [{ url: '/apple-icon.png?v=5', type: 'image/png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'Community Resource Mapping System',
    description: 'Supporting vulnerable communities in San Policarpo, Eastern Samar',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/logos/crms-main-logo.png',
        width: 1200,
        height: 630,
        alt: 'Community Resource Mapping System logo',
      },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          storageKey="crms-theme"
        >
          <ClickSpark sparkColor="#3b82f6" sparkSize={15} sparkRadius={20} sparkCount={12} duration={500}>
            <TooltipProvider>
              {children}
              <AccountSetupReminder />
            </TooltipProvider>
          </ClickSpark>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
