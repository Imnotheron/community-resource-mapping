'use client'

import { motion } from 'framer-motion'
import { Layers, Users, Package, Building2, AlertTriangle, MapPin, BarChart3 } from 'lucide-react'
import { buildFeatureSlides, CATEGORY_META } from '@/lib/mock-data'
import type { CommunityAsset } from '@/lib/types/community-asset'
import { Carousel, type CarouselSlide } from './carousel'
import { AssetCard, CategoryStat } from './asset-card'

const SLIDE_ICONS = {
  VULNERABLE_CITIZENS: Users,
  RELIEF_DISTRIBUTION: Package,
  COMMUNITY_FACILITIES: Building2,
  EMERGENCY_ALERTS: AlertTriangle,
} as const

type FeatureSlideData = ReturnType<typeof buildFeatureSlides>[number] & CarouselSlide

interface FeatureSliderProps {
  liveAssets?: CommunityAsset[]
}

export function FeatureSlider({ liveAssets }: FeatureSliderProps) {
  const slides = buildFeatureSlides(liveAssets) as FeatureSlideData[]

  return (
    <section
      id="features"
      className="relative px-4 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header — scroll-triggered */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end"
        >
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/40 px-3 py-1.5"
            >
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-emerald-300">
                Feature Explorer
              </span>
            </motion.div>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-emerald-50 md:text-4xl">
              Four pillars of
              <span className="ml-2 bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                community care
              </span>
            </h2>
            <p className="mt-3 text-sm text-emerald-100/60 md:text-base">
              Browse live resource categories powered by the mapping engine. Each card reflects real data shapes from the field.
            </p>
          </div>
        </motion.div>

        <Carousel<FeatureSlideData>
          slides={slides}
          ariaLabel="Community resource categories"
          accentColor={CATEGORY_META[slides[0]?.category || 'VULNERABLE_CITIZENS'].accentColor}
          renderHeader={(slide) => {
            const meta = CATEGORY_META[slide.category]
            const Icon = SLIDE_ICONS[slide.category]
            return (
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border"
                    style={{
                      borderColor: `${meta.accentColor}40`,
                      backgroundColor: `${meta.accentColor}14`,
                    }}
                  >
                    <Icon className="h-7 w-7" style={{ color: meta.accentColor }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-50 md:text-2xl">
                      {slide.title}
                    </h3>
                    <p className="mt-0.5 max-w-md text-xs text-emerald-100/60 md:text-sm">
                      {slide.description}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <CategoryStat
                    icon={MapPin}
                    label="Locations"
                    value={String(slide.assets.length)}
                    color={meta.accentColor}
                  />
                  <CategoryStat
                    icon={BarChart3}
                    label="Category"
                    value={slide.tagline}
                    color={meta.accentColor}
                  />
                  <CategoryStat
                    icon={Icon}
                    label="Status"
                    value="Live"
                    color={meta.accentColor}
                  />
                </div>
              </div>
            )
          }}
          renderSlide={(slide) => (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {slide.assets.map((asset, i) => (
                <AssetCard key={asset.id} asset={asset} index={i} />
              ))}
            </div>
          )}
        />

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-center text-[0.6875rem] text-emerald-500/40"
        >
          Use ← → arrow keys to navigate · Space to pause · Auto-advances every 6.5s
        </motion.p>
      </div>
    </section>
  )
}
