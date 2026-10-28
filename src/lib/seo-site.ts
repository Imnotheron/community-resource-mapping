/**
 * Public, canonical production URL. Keep this in sync with the live Vercel
 * domain (or configure NEXT_PUBLIC_APP_URL when moving to a custom domain).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim().startsWith('https://')
    ? process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '')
    : 'https://community-resource-mapping.vercel.app'
