'use client'

/**
 * PartnerSeal — a circular government-style seal with a logo image and label.
 */
function PartnerSeal({
  src,
  alt,
  label,
  sublabel,
}: {
  src: string
  alt: string
  label: string
  sublabel: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-white">
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-contain"
        />
        <span className="absolute inset-0 rounded-full ring-1 ring-primary/20" />
      </div>
      <div className="hidden flex-col leading-tight sm:flex">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{sublabel}</span>
      </div>
    </div>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <PartnerSeal
          src="/logos/san-policarpo.jpg"
          alt="LGU San Policarpo"
          label="LGU San Policarpo"
          sublabel="Local Government Unit"
        />
        <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
          <PartnerSeal
            src="/logos/essu.jpg"
            alt="ESSU"
            label="ESSU"
            sublabel="Eastern Samar State University"
          />
        </div>
        <PartnerSeal
          src="/logos/dswd.png"
          alt="DSWD"
          label="DSWD"
          sublabel="Dept. of Social Welfare"
        />
      </div>
    </header>
  )
}
