'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Shield, Users, MapPin, Database, Bell, Heart, CheckCircle, Lock, Globe, Building2, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function IntroPage() {
  const router = useRouter()

  // Force light mode for this page
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  }, [])

  const features = [
    {
      icon: Users,
      title: 'Vulnerable Individuals Management',
      description: 'Comprehensive registration and monitoring of senior citizens, PWDs, solo parents, and indigenous peoples with detailed profiles and assistance history.',
    },
    {
      icon: MapPin,
      title: 'Geographic Mapping System',
      description: 'Interactive map visualization showing exact locations across all barangays for efficient field operations and emergency response.',
    },
    {
      icon: Database,
      title: 'Resource Tracking & Inventory',
      description: 'Real-time inventory management of relief goods, medical supplies, and essential items with distribution tracking.',
    },
    {
      icon: Shield,
      title: 'Secure Data Protection',
      description: 'Government-grade security protocols with role-based access control ensuring privacy and confidentiality at all times.',
    },
    {
      icon: Bell,
      title: 'Real-Time Notifications',
      description: 'Instant alerts for new registrations, urgent requests, inventory updates, and system announcements.',
    },
    {
      icon: Heart,
      title: 'Community-Centered Approach',
      description: 'Designed with compassion to ensure no vulnerable individual is left behind during challenging times.',
    }
  ]

  return (
    <div className="min-h-screen !bg-white !text-gray-900 flex flex-col relative">
      {/* Header with Logos */}
      <header className="!bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 items-center mb-2">
            {/* Top Left - San Policarpo Logo */}
            <div className="flex justify-start">
              <img
                src="/logo-sampolicarpo.jpg"
                alt="San Policarpo Logo"
                className="h-14 md:h-16 w-auto object-contain"
              />
            </div>

            {/* Middle - ESSU Logo */}
            <div className="flex justify-center">
              <img
                src="/logo-essu.jpg"
                alt="ESSU Logo"
                className="h-14 md:h-16 w-auto object-contain"
              />
            </div>

            {/* Top Right - DSWD Logo */}
            <div className="flex justify-end">
              <img
                src="/logo-dswd.png"
                alt="DSWD Logo"
                className="h-14 md:h-16 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <section className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-900 px-5 py-2.5 rounded-lg text-sm font-semibold mb-8 border border-blue-200">
              <Shield className="w-4 h-4" />
              Official Government System
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Community Resource Mapping System
            </h1>

            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-4 leading-relaxed">
              Empowering San Policarpo, Eastern Samar with comprehensive support for vulnerable groups through efficient resource management and transparent service delivery.
            </p>

            <p className="text-base text-gray-500 max-w-3xl mx-auto mb-10 leading-relaxed">
              A collaborative partnership between LGU San Policarpo, Eastern Samar State University, and DSWD.
            </p>

            <Button
              onClick={() => router.push('/role-selection')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-semibold rounded-lg transition-all"
            >
              Access Portal
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </section>

          {/* Features Section */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                System Features
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Comprehensive tools for efficient community resource management
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Collaboration Section */}
          <section className="mb-20">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-10 md:p-12">
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Collaborative Partnership
                </h2>
                <p className="text-gray-600 text-lg max-w-3xl mx-auto">
                  A unified effort bringing together government, academia, and social welfare to serve the community
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center p-6 bg-white border border-gray-200 rounded-lg">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                    <img
                      src="/logo-sampolicarpo.jpg"
                      alt="LGU San Policarpo"
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">LGU San Policarpo</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Local government leadership and community oversight ensuring efficient service delivery and accountability
                  </p>
                </div>

                <div className="text-center p-6 bg-white border border-gray-200 rounded-lg">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                    <img
                      src="/logo-essu.jpg"
                      alt="Eastern Samar State University"
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Eastern Samar State University</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Academic excellence and research-driven approaches for sustainable community development
                  </p>
                </div>

                <div className="text-center p-6 bg-white border border-gray-200 rounded-lg">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                    <img
                      src="/logo-dswd.png"
                      alt="DSWD"
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">DSWD</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Social welfare expertise and standards for protecting vulnerable groups and ensuring dignified assistance
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Service Cards */}
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white border border-blue-200 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">For Vulnerable Individuals</h3>
                </div>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Easy registration with field worker assistance</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Track assistance history and status</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Request emergency assistance when needed</span>
                  </li>
                </ul>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white border border-teal-200 rounded-lg flex items-center justify-center">
                    <Globe className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">For Administrators & Workers</h3>
                </div>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Comprehensive dashboard for efficient management</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Real-time updates and notifications</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Detailed reporting and analytics</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Trust Indicators */}
          <section className="border-t border-gray-200 pt-12">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                <span>Secure Data Protection</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span>Government Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>Official LGU System</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="!bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div>
              <p className="text-gray-900 text-sm font-semibold mb-1">
                © 2026 Community Resource Mapping System
              </p>
              <p className="text-gray-500 text-xs">
                San Policarpo, Eastern Samar
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-600 text-sm font-medium">
                A collaborative initiative of
              </p>
              <p className="text-gray-500 text-xs mt-1">
                LGU San Policarpo • ESSU • DSWD
              </p>
            </div>
            <p className="text-gray-600 text-sm font-medium">
              "Serving with compassion and dignity"
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
