'use client'

import { MapPin } from 'lucide-react'

const PARTNERS = [
  { logo: '/logos/san-policarpo.jpg', name: 'LGU San Policarpo' },
  { logo: '/logos/essu.jpg', name: 'ESSU' },
  { logo: '/logos/dswd.png', name: 'DSWD' },
]

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {PARTNERS.map((p) => (
              <span key={p.name} className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white">
                  <img src={p.logo} alt={p.name} className="h-full w-full object-contain" />
                </span>
                {p.name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>San Policarpo, Eastern Samar, Philippines</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Community Resource Mapping System
          </p>
        </div>
      </div>
    </footer>
  )
}
