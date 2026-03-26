import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 border-slate-200 dark:border-slate-700">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Search className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Page Not Found
          </CardTitle>
          <CardDescription className="text-base">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
              <strong className="text-blue-800 dark:text-blue-200">Tip:</strong> You may have mistyped the URL, or the page may have been moved or deleted.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              asChild 
              className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
            >
              <Link href="/">
                <Home className="w-4 h-4" />
                Go to Homepage
              </Link>
            </Button>
            
            <Button 
              variant="outline"
              className="w-full gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              If you believe this is an error, please contact the system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
