import { normalizePublicationText, truncatePublicationText } from './product-publication'

// Every crawler (search, AI search, AI training) may crawl all public pages and public read APIs;
// client-rendered modules fetch /api/public/* while a crawler renders the page. Only authenticated
// API prefixes and the map-key proxy are excluded because they never serve public content.
const privateCrawlerPaths = ['/api/admin/', '/api/auth/', '/api/users/', '/api/forum/', '/_AMapService/'] as const

export function escapeMarkdownText(value: string) {
  return normalizePublicationText(value)
    .replace(/\\/g, '\\\\')
    .replace(/([\[\]()])/g, '\\$1')
}

export function discoveryDescription(value: string | null | undefined, fallback: string, maximum = 220) {
  return truncatePublicationText(normalizePublicationText(value) || fallback, maximum)
}

export function discoveryLink(label: string, url: string, description: string) {
  return `- [${escapeMarkdownText(label)}](${url}): ${escapeMarkdownText(description)}`
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function sitemapLastModified(value?: string | null) {
  const normalized = normalizePublicationText(value)
  if (!normalized || !/^\d{4}-\d{2}-\d{2}T/u.test(normalized)) return undefined
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined
}

export function buildRobotsTxt(siteUrl: string) {
  const origin = siteUrl.replace(/\/+$/u, '')
  return [
    ['User-agent: *', 'Allow: /', ...privateCrawlerPaths.map(path => `Disallow: ${path}`)].join('\n'),
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n\n')
}
