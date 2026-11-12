export const IMAGE_CARD_WIDTHS = [320, 600, 960] as const
export const IMAGE_DETAIL_WIDTHS = [600, 960, 1440] as const
export const IMAGE_THUMBNAIL_WIDTHS = [320] as const

// Must stay within the API whitelist for GET /assets/managed/{storageKey}?w= (320/600/960/1440).
const allowedWidths = new Set<number>([...IMAGE_CARD_WIDTHS, ...IMAGE_DETAIL_WIDTHS, ...IMAGE_THUMBNAIL_WIDTHS])

// Exactly one storage-key segment; the API validates the key itself.
const managedPathPattern = /^\/assets\/managed\/[A-Za-z0-9_-][A-Za-z0-9._-]*$/u

function trustedShopifyUrl(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }

  if (url.protocol !== 'https:' || url.username || url.password) return undefined
  if (url.hostname === 'cn.ulinktek.com' && url.pathname.startsWith('/cdn/shop/')) return url
  if (url.hostname === 'cdn.shopifycdn.net' && url.pathname.startsWith('/s/files/')) return url
  return undefined
}

function siteOrigin(siteUrl: string | undefined) {
  if (!siteUrl) return undefined
  try {
    const url = new URL(siteUrl)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : undefined
  } catch {
    return undefined
  }
}

// Managed image URL without query: relative, or absolute on the site origin.
function trustedManagedUrl(value: string, siteUrl: string | undefined) {
  if (value.includes('..') || /[?#\\]/u.test(value)) return undefined
  if (value.startsWith('/')) return managedPathPattern.test(value) ? value : undefined

  const origin = siteOrigin(siteUrl)
  if (!origin) return undefined
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  if (url.username || url.password || url.origin !== origin) return undefined
  if (url.search || url.hash || !managedPathPattern.test(url.pathname)) return undefined
  return `${origin}${url.pathname}`
}

/**
 * Resized variant of a trusted image: `?w=` for managed site assets (`/assets/managed/{key}`,
 * relative or on the `siteUrl` origin) and `?width=` for the allowed Shopify hosts. Any other
 * image or width returns undefined so the caller falls back to the original src.
 */
export function trustedImageVariant(value: string, width: number, siteUrl?: string) {
  if (!allowedWidths.has(width)) return undefined
  const managed = trustedManagedUrl(value, siteUrl)
  if (managed) return `${managed}?w=${width}`
  const url = trustedShopifyUrl(value)
  if (!url) return undefined
  url.searchParams.set('width', String(width))
  return url.toString()
}

/** `srcset` for a trusted image, or undefined unless every requested width resolves. */
export function trustedImageSrcset(value: string, widths: readonly number[], siteUrl?: string) {
  const candidates = widths.flatMap((width) => {
    const url = trustedImageVariant(value, width, siteUrl)
    return url ? [`${url} ${width}w`] : []
  })
  return candidates.length > 0 && candidates.length === widths.length ? candidates.join(', ') : undefined
}
