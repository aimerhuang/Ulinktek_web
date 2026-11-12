import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { SiteSettings } from '~/composables/useContentApi'
import { normalizePublicationText, truncatePublicationText } from '~/shared/content/product-publication'
import { absoluteSiteUrl } from '~/shared/content/structured-data'

// `strippedSuffixes` covers older brand names editors may still have typed into CMS titles.
export function buildPageTitle(title: string, siteName: string, strippedSuffixes: string[] = []) {
  const normalizedSiteName = normalizePublicationText(siteName)
  let normalizedTitle = normalizePublicationText(title)
  for (const name of [normalizedSiteName, ...strippedSuffixes.map(normalizePublicationText)].filter(Boolean)) {
    for (const separator of [' | ', ' - ', '|', '-', '_']) {
      const suffix = `${separator}${name}`
      if (normalizedTitle.endsWith(suffix)) normalizedTitle = normalizedTitle.slice(0, -suffix.length).trim()
    }
  }
  return !normalizedTitle || normalizedTitle === normalizedSiteName ? normalizedSiteName : `${normalizedTitle} | ${normalizedSiteName}`
}

type PageSeoInput = {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  keywords?: MaybeRefOrGetter<string | undefined>
  path: MaybeRefOrGetter<string>
  absoluteTitle?: boolean
  image?: MaybeRefOrGetter<string | undefined>
  noindex?: MaybeRefOrGetter<boolean>
  robots?: MaybeRefOrGetter<string | undefined>
  ogType?: 'website' | 'article' | 'video.other'
  language?: MaybeRefOrGetter<'zh-CN' | 'en'>
  alternates?: MaybeRefOrGetter<ReadonlyArray<{ hreflang: string, path: string }>>
}

export function usePageSeo(input: PageSeoInput) {
  const config = useRuntimeConfig()
  const siteSettings = useState<SiteSettings | undefined>('site-settings')
  const canonical = computed(() => absoluteSiteUrl(config.public.siteUrl, toValue(input.path)))
  const explicitImage = computed(() => toValue(input.image))
  const image = computed(() => {
    const value = explicitImage.value || siteSettings.value?.logoUrl
    return value ? absoluteSiteUrl(config.public.siteUrl, value) : undefined
  })
  // Titles end with the short brand; the CMS site name ("…有限公司官方网站") is too long for search result titles.
  const title = computed(() => input.absoluteTitle
    ? normalizePublicationText(toValue(input.title))
    : buildPageTitle(toValue(input.title), config.public.siteName, [siteSettings.value?.siteName || '']))
  const description = computed(() => truncatePublicationText(toValue(input.description), 160))
  const keywords = computed(() => input.keywords ? normalizePublicationText(toValue(input.keywords) || '') || undefined : undefined)
  const robots = computed(() => toValue(input.robots)
    || (toValue(input.noindex) ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'))
  const language = computed(() => toValue(input.language) || 'zh-CN')
  const alternateLinks = computed(() => {
    if (/(?:^|,)\s*noindex(?:\s|,|$)/iu.test(robots.value)) return []
    const configured = input.alternates ? toValue(input.alternates) : [{ hreflang: language.value, path: toValue(input.path) }]
    return configured.map(alternate => ({
      rel: 'alternate' as const,
      hreflang: alternate.hreflang,
      href: absoluteSiteUrl(config.public.siteUrl, alternate.path),
    }))
  })
  useSeoMeta({
    title,
    description,
    robots,
    ogTitle: title,
    ogDescription: description,
    ogType: input.ogType || 'website',
    ogUrl: canonical,
    ogImage: image,
    twitterCard: computed(() => explicitImage.value ? 'summary_large_image' : image.value ? 'summary' : undefined),
    twitterImage: image,
  })
  useHead(() => ({
    htmlAttrs: { lang: language.value },
    // Baidu still reads keywords, but unhead 3 dropped them from the typed useSeoMeta input.
    meta: keywords.value ? [{ key: 'keywords', name: 'keywords', content: keywords.value }] : [],
    link: [
      { rel: 'canonical', href: canonical.value },
      ...alternateLinks.value,
    ],
  }))
}
