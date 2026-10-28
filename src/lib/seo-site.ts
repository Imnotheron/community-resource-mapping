/**
 * Canonical public production URL. Update NEXT_PUBLIC_APP_URL if the site
 * moves to a custom domain.
 */
const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || ''

export const SITE_URL = configuredUrl.startsWith('https://')
  ? configuredUrl.replace(/\/+$/, '')
  : 'https://community-resource-mapping.vercel.app'
