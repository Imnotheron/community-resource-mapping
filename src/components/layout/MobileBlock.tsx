'use client'

import { Monitor, Smartphone } from 'lucide-react'

export default function MobileBlock() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:hidden">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center gap-4">
          <div className="p-4 bg-slate-700 rounded-2xl">
            <Smartphone className="w-10 h-10 text-red-400" />
          </div>
          <div className="flex items-center text-slate-500 text-2xl font-thin">→</div>
          <div className="p-4 bg-emerald-900/50 rounded-2xl border-2 border-emerald-500">
            <Monitor className="w-10 h-10 text-emerald-400" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">
            Desktop Required
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            The Admin Dashboard is designed for desktop and laptop use only. Please access this system from a desktop computer or laptop for the best experience and full functionality.
          </p>
        </div>

        {/* Role badge */}
        <div className="inline-flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-purple-400" />
          <span className="text-slate-300 text-sm font-medium">
            Administrator Portal
          </span>
        </div>

        {/* Instruction */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-xs">
            💻 Open this link on your{' '}
            <span className="text-white font-semibold">desktop browser</span>{' '}
            to access the admin dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}
