export function absoluteSiteUrl(siteUrl: string, value: string) {
  const origin = new URL(`${siteUrl.replace(/\/+$/u, '')}/`)
  const resolved = new URL(value, origin)
  if (origin.protocol !== 'https:' || resolved.protocol !== 'https:' || resolved.username || resolved.password) {
    throw new TypeError('Structured data URLs must use credential-free HTTPS.')
  }
  return resolved.toString()
}

export function organizationEntityId(siteUrl: string) {
  return absoluteSiteUrl(siteUrl, '/#organization')
}

export function websiteEntityId(siteUrl: string) {
  return absoluteSiteUrl(siteUrl, '/#website')
}

// The CMS company name is a display label that may carry a "官方网站" suffix; the legal entity name must not.
export function legalCompanyName(value?: string) {
  return (value || '').replace(/\s*(?:官方网站|官网)$/u, '').trim() || '优联科技（深圳）有限公司'
}

// Mainland landline (0755-84416462) or mobile numbers become E.164-style; anything else is kept verbatim.
export function internationalChinaTelephone(value: string) {
  const compact = value.trim().replace(/[\s()（）]/gu, '')
  // Without the dash the area-code length is ambiguous (010… vs 0755…), so only dashed landlines are converted.
  const landline = /^0(\d{2,3})-(\d{7,8})$/u.exec(compact)
  if (landline) return `+86-${landline[1]}-${landline[2]}`
  if (/^1\d{10}$/u.test(compact)) return `+86-${compact}`
  return value.trim()
}

export function chinaPostalAddressEntity(value: string) {
  const address = value.trim()
  // Only a short leading province/city prefix is split off, so street names containing 市 stay intact.
  const parts = /^(?:中国)?([^\d\s]{2,8}?(?:省|自治区))?([^\d\s]{2,8}?市)?(.+)$/u.exec(address)
  const region = parts?.[1]
  const locality = parts?.[2]
  return {
    '@type': 'PostalAddress',
    streetAddress: locality ? parts[3] : address,
    ...(locality ? { addressLocality: locality } : {}),
    ...(region ? { addressRegion: region } : {}),
    addressCountry: 'CN',
  }
}

export type BreadcrumbListItem = {
  name: string
  path?: string
}

export function breadcrumbListEntity(siteUrl: string, canonicalPath: string, items: BreadcrumbListItem[]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': absoluteSiteUrl(siteUrl, `${canonicalPath}#breadcrumb`),
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteSiteUrl(siteUrl, item.path) } : {}),
    })),
  }
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
