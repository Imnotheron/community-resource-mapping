import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo-site'

export default function sitemap(): MetadataRoute.Sitemap {
  // Never expose API endpoints, account-specific URLs or citizen records here.
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/about` },
  ]
}
