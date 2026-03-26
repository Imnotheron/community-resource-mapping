'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, Home, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RegistrationSuccess() {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col">
      <header className="w-full bg-white dark:bg-slate-950 shadow-sm border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  Vulnerable Registration
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Community Resource Mapping System
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl">Registration Submitted!</CardTitle>
            <CardDescription className="text-base">
              Your registration has been successfully submitted for review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">Under Review</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Your application is being reviewed by our administrators. This process typically takes 1-3 business days.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">What Happens Next?</h3>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                    <li>• You will receive a notification once your registration is approved</li>
                    <li>• If additional information is needed, you will be contacted</li>
                    <li>• After approval, you can access your dashboard and track assistance</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full gap-2"
              >
                <Home className="w-4 h-4" />
                Return to Home
              </Button>

              <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                For inquiries, please contact your local barangay office.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            © 2026 Community Resource Mapping System • San Policarpo, Eastern Samar
          </p>
        </div>
      </footer>
    </div>
  )
}
