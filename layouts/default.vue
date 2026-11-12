<script setup lang="ts">
import type { SiteSettings } from '~/composables/useContentApi'
import type { SiteNavigationItem } from '~/shared/content/navigation'
import { absoluteSiteUrl, chinaPostalAddressEntity, internationalChinaTelephone, legalCompanyName, organizationEntityId, serializeJsonLd, websiteEntityId } from '~/shared/content/structured-data'

const { getSiteShell } = useContentApi()
const { data: shell, error: shellError } = await useAsyncData('site-shell', getSiteShell)

if (shellError.value) throw shellError.value
const shellData = shell.value
if (!shellData) {
  throw createError({
    statusCode: 503,
    statusMessage: 'Site shell data is temporarily unavailable.',
  })
}
const siteSettings = useState<SiteSettings | undefined>('site-settings', () => undefined)
const siteNavigation = useState<SiteNavigationItem[] | undefined>('site-navigation', () => undefined)
siteSettings.value = shellData.settings
siteNavigation.value = shellData.navigation
const config = useRuntimeConfig()
const legalName = legalCompanyName(shellData.contact.companyName)
const siteName = config.public.siteName
const siteUrl = absoluteSiteUrl(config.public.siteUrl, '/')
const alternateNames = [...new Set(['ULINKTEK', legalName].filter(name => name && name !== siteName))]
const telephone = shellData.contact.phone ? internationalChinaTelephone(shellData.contact.phone) : undefined
const organization = {
  '@type': 'Organization',
  '@id': organizationEntityId(config.public.siteUrl),
  name: siteName,
  legalName,
  alternateName: alternateNames,
  url: siteUrl,
  logo: shellData.settings.logoUrl ? absoluteSiteUrl(config.public.siteUrl, shellData.settings.logoUrl) : undefined,
  sameAs: ['https://ulinktek.com/'],
  telephone,
  email: shellData.contact.email || undefined,
  contactPoint: telephone || shellData.contact.email
    ? [{
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone,
        email: shellData.contact.email || undefined,
        areaServed: 'CN',
        availableLanguage: 'zh-CN',
      }]
    : undefined,
  address: shellData.contact.address ? chinaPostalAddressEntity(shellData.contact.address) : undefined,
}
const website = {
  '@type': 'WebSite',
  '@id': websiteEntityId(config.public.siteUrl),
  name: siteName,
  alternateName: shellData.settings.siteName && shellData.settings.siteName !== siteName ? shellData.settings.siteName : undefined,
  url: siteUrl,
  publisher: { '@id': organizationEntityId(config.public.siteUrl) },
}

useSeoMeta({
  title: shellData.settings.defaultSeoTitle || shellData.settings.siteName || undefined,
  description: shellData.settings.defaultSeoDescription,
  // Same short brand as the page-title suffix built by usePageSeo.
  ogSiteName: siteName,
})
useHead({
  link: [{ key: 'site-favicon', rel: 'icon', href: shellData.settings.faviconUrl || '/favicon.svg' }],
  script: [{
    key: 'site-entities-jsonld',
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({ '@context': 'https://schema.org', '@graph': [organization, website] }),
  }],
})
</script>

<template>
  <div class="site-shell">
    <a class="skip-link" href="#main-content">跳至主要内容</a>
    <SiteHeader :navigation="shellData.navigation" :contact="shellData.contact" :settings="shellData.settings" />
    <SiteBreadcrumb :navigation="shellData.navigation" />
    <main id="main-content" tabindex="-1">
      <slot />
    </main>
    <SiteFooter :navigation="shellData.navigation" :contact="shellData.contact" :settings="shellData.settings" />
    <ContactToolbar :contact="shellData.contact" />
  </div>
</template>
