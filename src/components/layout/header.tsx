'use client'

import { motion } from 'framer-motion'

function PartnerSeal({
  src,
  alt,
  label,
  sublabel,
  delay = 0,
}: {
  src: string
  alt: string
  label: string
  sublabel: string
  delay?: number
}) {
  return (
    <motion.div
      className="group flex items-center gap-2.5"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <div className="seal-orbit relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-white shadow-[0_8px_24px_rgba(16,185,129,0.16)] transition-transform duration-300 group-hover:scale-110">
        <img src={src} alt={alt} className="h-full w-full object-contain" />
        <span className="absolute inset-0 rounded-full ring-1 ring-primary/20" />
      </div>
      <div className="hidden flex-col leading-tight sm:flex">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">{sublabel}</span>
      </div>
    </motion.div>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b border-border/70 bg-background/80 shadow-[0_10px_40px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="header-glow absolute inset-x-0 bottom-0 h-px" aria-hidden="true" />
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <PartnerSeal
          src="/logos/san-policarpo.jpg"
          alt="LGU San Policarpo"
          label="LGU San Policarpo"
          sublabel="Local Government Unit"
          delay={0.02}
        />
        <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
          <PartnerSeal
            src="/logos/essu.jpg"
            alt="ESSU"
            label="ESSU"
            sublabel="Eastern Samar State University"
            delay={0.08}
          />
        </div>
        <PartnerSeal
          src="/logos/dswd.png"
          alt="DSWD"
          label="DSWD"
          sublabel="Dept. of Social Welfare"
          delay={0.14}
        />
      </div>
    </header>
  )
}
