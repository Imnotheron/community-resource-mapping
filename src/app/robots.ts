import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo-site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Only public pages should be discoverable; role-based app data stays private.
      disallow: [
        '/api/',
        '/admin/',
        '/worker/',
        '/vulnerable/',
        '/profile',
        '/login',
        '/register',
        '/role-selection',
        '/intro',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
