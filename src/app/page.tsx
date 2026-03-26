'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't do anything if already on specific pages
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/worker') ||
      pathname.startsWith('/vulnerable') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/role-selection') ||
      pathname.startsWith('/intro')
    ) {
      return
    }

    // Check user and redirect appropriately
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        const role = user?.role?.toLowerCase()

        // Redirect based on role
        if (role === 'admin') {
          router.replace('/admin/dashboard')
        } else if (role === 'worker') {
          router.replace('/worker/dashboard')
        } else if (role === 'vulnerable') {
          router.replace('/vulnerable/dashboard')
        } else {
          // Unknown role, go to intro
          router.replace('/intro')
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
        router.replace('/intro')
      }
    } else {
      // No user, go to intro
      router.replace('/intro')
    }
  }, [router, pathname])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-blue-400 text-sm">Loading...</p>
      </div>
    </div>
  )
}
