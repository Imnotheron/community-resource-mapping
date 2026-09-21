'use client'

interface FooterProps {
  onAccessPortal: () => void
}

export function Footer({ onAccessPortal }: FooterProps) {
  return (
    <footer className="relative overflow-hidden border-t border-emerald-100 bg-white">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.16),transparent_58%),radial-gradient(ellipse_at_bottom_right,rgba(56,189,248,0.12),transparent_58%)]" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-3">
          <img
            src="/logos/san-policarpo.jpg"
            alt="Municipality of San Policarpo"
            className="h-12 w-12 rounded-full border border-emerald-100 object-cover"
          />
          <div>
            <p className="text-sm font-bold text-slate-950">Municipality of San Policarpo</p>
            <p className="text-xs text-slate-500">Eastern Samar, Philippines</p>
          </div>
        </div>

        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          People · Resources · Safer Communities
        </p>

        <button
          type="button"
          onClick={onAccessPortal}
          className="self-start rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 md:self-auto"
        >
          Access Portal
        </button>
      </div>
    </footer>
  )
}
