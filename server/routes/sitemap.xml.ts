import { getIndexableZhUrls } from '~/server/utils/content'
import { escapeXml } from '~/shared/content/discovery'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const urls = getIndexableZhUrls(event, config).then(entries => entries.map((entry) => {
    const location = escapeXml(new URL(entry.path, `${config.public.siteUrl}/`).toString())
    const lastModified = entry.lastModified ? `<lastmod>${escapeXml(entry.lastModified)}</lastmod>` : ''
    return `<url><loc>${location}</loc>${lastModified}</url>`
  }).join(''))
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return urls.then((content) => `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${content}</urlset>`)
})
