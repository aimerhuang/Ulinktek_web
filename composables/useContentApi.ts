import type { Article } from '~/shared/content/articles'
import { projectArticleMetadata } from '~/shared/content/article-metadata'
import type { Faq } from '~/shared/content/faqs'
import type { Product } from '~/shared/content/products'
import { projectPublishedProduct, type ProductPublicationSource } from '~/shared/content/product-publication'
import { readableImageAlt, sanitizeRichHtml } from '~/shared/content/rich-html'
import { asPublishedPage, getPublishedPageItems } from '~/shared/content/public-api'
import { parseMainNavigation } from '~/shared/content/navigation'
import { articleSchemaType, mediaTypeLabel } from '~/shared/content/media-publication'
import { productsInProductCategory, projectProductCategoryTree } from '~/shared/content/product-categories'
import type { ProductCategory, ProductCategorySourceNode } from '~/shared/content/product-categories'
import { decodeProductSpecificationValues } from '~/shared/content/product-specifications'
import {
  decodePublicDownload,
  decodePublicDownloadDetail,
  decodePublicVideo,
  decodePublicVideoDetail,
  isCanonicalResourceSlug,
} from '~/shared/content/resources'
import type { PublicDownload, PublicDownloadDetail, PublicVideo, PublicVideoDetail } from '~/shared/content/resources'
import { createResilientCache } from '~/shared/content/resilient-cache'
import { decodeProductCategoryLanding } from '~/shared/content/product-category-landing'
import type { ProductCategoryLanding } from '~/shared/content/product-category-landing'
import { projectCertificate } from '~/shared/content/certificates'
import type { ApiCertificate, Certificate } from '~/shared/content/certificates'
import { decodeKnowledgeCategory, decodeKnowledgeCategoryList, readKnowledgeCategoryRef } from '~/shared/content/knowledge-categories'
import type { KnowledgeCategory } from '~/shared/content/knowledge-categories'
import { isCanonicalKnowledgeCategorySlug } from '~/shared/content/knowledge'

type ApiProductSpecification = { code?: string | null, label?: string | null, value?: string | null, sortOrder?: number | null }
type ApiProduct = ProductPublicationSource & { id?: number | null, categoryId?: number | null, coverImageUrl?: string | null, videoUrl?: string | null, categorySlug?: string | null, gallery?: string[] | null, galleryJson?: string | null, featuredSpecifications?: ApiProductSpecification[] | null, specifications?: Record<string, unknown> | null, specificationsJson?: string | null }
type ApiMedia = { type?: string | null, title?: string | null, slug?: string | null, summary?: string | null, content?: string | null, coverImageUrl?: string | null, gallery?: string[] | null, galleryJson?: string | null, sourceName?: string | null, sourceUrl?: string | null, publishedAt?: string | null, tags?: unknown, seo?: unknown, category?: unknown }
type ApiServiceFaq = { id?: number | null, category?: string | null, question?: string | null, answer?: string | null }
type ApiServicePolicy = { id?: number | null, type?: string | null, title?: string | null, content?: string | null, imageUrl?: string | null }
type ApiResource = { id?: number | null, resourceType?: string | null, title?: string | null, description?: string | null, coverImageUrl?: string | null, resourceUrl?: string | null, fileName?: string | null, fileSizeBytes?: number | null }
type ApiAboutContent = { id?: number | null, type?: string | null, title?: string | null, content?: string | null, imageUrl?: string | null }
type ApiContactInfo = { companyName?: string | null, address?: string | null, phone?: string | null, email?: string | null, emails?: Array<{ label?: string | null, address?: string | null } | null> | null, mapProvider?: string | null, mapUrl?: string | null, longitude?: number | null, latitude?: number | null }
type ApiBanner = { title?: string | null, description?: string | null, imageUrl?: string | null, mobileImageUrl?: string | null, altText?: string | null }
type ApiPublicHome = { featuredProducts?: unknown }
type ApiWebsiteSetting = { siteName?: string | null, logoUrl?: string | null, faviconUrl?: string | null, icpNumber?: string | null, publicSecurityNumber?: string | null, copyright?: string | null, icpImageUrl?: string | null, publicSecurityImageUrl?: string | null, copyrightImageUrl?: string | null, defaultSeoTitle?: string | null, defaultSeoKeywords?: string | null, defaultSeoDescription?: string | null }
type ApiPublicSite = { setting?: ApiWebsiteSetting | null, contact?: ApiContactInfo | null }

export type ServicePolicy = { id: string, type: string, title: string, content: string, contentHtml: string, imageUrl?: string }
export type ServicePolicyType = 'warranty' | 'after_sales'
export type Resource = { id: string, type: string, title: string, description: string, coverImageUrl?: string, resourceUrl?: string, fileName?: string, fileSizeBytes?: number }
export type { Certificate } from '~/shared/content/certificates'
export type CompanyProfile = { brandTitle?: string, brandIntro?: string, brandIntroHtml?: string, brandImageUrl?: string, brandPreviewImageUrl?: string, gallery: Array<{ id: string, title: string, imageUrl?: string }> }
export type ContactEmail = { label?: string, address: string }
export type ContactInfo = { companyName?: string, address?: string, phone?: string, email?: string, emails?: ContactEmail[], mapProvider?: string, longitude?: number, latitude?: number }
export type DisplayContactInfo = ContactInfo & Required<Pick<ContactInfo, 'phone' | 'email' | 'emails' | 'address'>>
export type { ProductCategory } from '~/shared/content/product-categories'
export type ProductCategoryCatalog = { category: ProductCategory, categories: ProductCategory[], products: Product[] }
export type { ProductCategoryLanding } from '~/shared/content/product-category-landing'
export type ProductPage = { items: Product[], page: number, pageSize: number, total: number }
export type MediaPage = { items: Article[], page: number, pageSize: number, total: number }
export type { KnowledgeCategory } from '~/shared/content/knowledge-categories'
export type KnowledgeCategoryPage = { category: KnowledgeCategory, articles: MediaPage }
export type HomeBanner = { id: string, title: string, description?: string, imageUrl: string, mobileImageUrl?: string, alt: string }
export type SiteSettings = { siteName: string, logoUrl?: string, faviconUrl?: string, icpNumber?: string, publicSecurityNumber?: string, copyright?: string, icpImageUrl?: string, publicSecurityImageUrl?: string, copyrightImageUrl?: string, defaultSeoTitle?: string, defaultSeoKeywords?: string, defaultSeoDescription?: string }
export type SiteShell = { contact: DisplayContactInfo, navigation: ReturnType<typeof parseMainNavigation>, settings: SiteSettings }

let prerenderProductCategories: Promise<ProductCategory[]> | undefined
let prerenderMainNavigation: Promise<ReturnType<typeof parseMainNavigation>> | undefined
let prerenderSiteSettings: Promise<SiteSettings> | undefined
let prerenderContact: Promise<ContactInfo | undefined> | undefined
const prerenderCollectionRequests = new Map<string, Promise<unknown>>()
const siteShellCache = createResilientCache<SiteShell>({
  maxAgeMs: 60_000,
  retryDelayMs: 30_000,
  shouldUseStale: error => typeof error === 'object'
    && error !== null
    && 'statusCode' in error
    && (error as { statusCode?: number }).statusCode === 503,
})

export const fallbackContactInfo: Required<Pick<ContactInfo, 'phone' | 'email' | 'address'>> = {
  phone: '0755-84416462',
  email: 'marketing@ulinktek.com',
  address: '深圳市龙岗区南湾街道下李朗社区布澜路21号联创科技园5栋',
}

  function plainText(value?: string | null) {
  return (value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}

function isHttpsUrl(value: string) {
  return /^https:\/\//i.test(value)
}

function isLocalAssetPath(value: string) {
  return /^(?:\/assets\/|assets\/)/i.test(value)
}

function parseStringArray(value?: string[] | string | null): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function isNotFound(error: unknown) {
  return typeof error === 'object' && error !== null && 'statusCode' in error && (error as { statusCode?: number }).statusCode === 404
}

function reusePrerenderRequest<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!import.meta.prerender) return load()
  const existing = prerenderCollectionRequests.get(key)
  if (existing) return existing as Promise<T>
  const request = load()
  prerenderCollectionRequests.set(key, request)
  return request
}

export function useContentApi() {
  const apiUrl = useApiUrl()
  const siteApiUrl = useSiteApiUrl()
  const publicContentFetch = usePublicContentFetch()
  const config = useRuntimeConfig()
  const apiBase = (import.meta.server ? config.apiServerBase : config.public.apiBase) || config.public.apiBase

  function assetUrl(path?: string | null) {
    const value = path?.trim()
    if (!value) return undefined
    if (isHttpsUrl(value)) return value
    if (!isLocalAssetPath(value)) return undefined
    const normalizedPath = value.startsWith('/') ? value : `/${value}`
    if (!config.public.apiBase || !/^https?:\/\//i.test(config.public.apiBase)) return normalizedPath
    return new URL(normalizedPath, new URL(apiBase).origin).toString()
  }

  function mapContact(contact?: ApiContactInfo | null): ContactInfo {
    if (!contact) return {}
    const emails = (contact.emails ?? []).flatMap(item => {
      const address = item?.address?.trim()
      return address ? [{ label: item?.label?.trim() || undefined, address }] : []
    })
    const email = emails[0]?.address || contact.email?.trim() || undefined
    return {
      companyName: contact.companyName?.trim() || undefined,
      address: contact.address?.trim() || undefined,
      phone: contact.phone?.trim() || undefined,
      email,
      emails: emails.length ? emails : email ? [{ address: email }] : undefined,
      mapProvider: contact.mapProvider?.trim() || undefined,
      longitude: typeof contact.longitude === 'number' ? contact.longitude : undefined,
      latitude: typeof contact.latitude === 'number' ? contact.latitude : undefined,
    }
  }

  function displayContact(contact: ContactInfo): DisplayContactInfo {
    return {
      ...contact,
      phone: contact.phone || fallbackContactInfo.phone,
      email: contact.email || fallbackContactInfo.email,
      emails: contact.emails?.length ? contact.emails : [{ address: contact.email || fallbackContactInfo.email }],
      address: contact.address || fallbackContactInfo.address,
    }
  }

  async function loadPublicSite(): Promise<{ contact: ContactInfo, settings: SiteSettings }> {
    const response = await publicContentFetch<unknown>(siteApiUrl('site'))
    if (!response || typeof response !== 'object' || !('setting' in response) || !response.setting || typeof response.setting !== 'object') {
      throw new Error('Public site API returned an invalid site settings response.')
    }
    const site = response as ApiPublicSite
    const setting = site.setting as ApiWebsiteSetting
    return {
      contact: mapContact(site.contact),
      settings: {
        siteName: setting.siteName?.trim() || '',
        logoUrl: assetUrl(setting.logoUrl),
        faviconUrl: assetUrl(setting.faviconUrl),
        icpNumber: setting.icpNumber?.trim() || undefined,
        publicSecurityNumber: setting.publicSecurityNumber?.trim() || undefined,
        copyright: setting.copyright?.trim() || undefined,
        icpImageUrl: assetUrl(setting.icpImageUrl),
        publicSecurityImageUrl: assetUrl(setting.publicSecurityImageUrl),
        copyrightImageUrl: assetUrl(setting.copyrightImageUrl),
        defaultSeoTitle: setting.defaultSeoTitle?.trim() || undefined,
        defaultSeoKeywords: setting.defaultSeoKeywords?.trim() || undefined,
        defaultSeoDescription: setting.defaultSeoDescription?.trim() || undefined,
      },
    }
  }

  function resourceUrl(value?: string | null) {
    const normalized = value?.trim()
    if (!normalized || (!/^https:\/\//i.test(normalized) && !isLocalAssetPath(normalized))) return undefined
    return assetUrl(normalized)
  }

  function safeLink(value?: string | null) {
    const normalized = value?.trim()
    if (!normalized) return undefined
    if (/^(https:\/\/|mailto:|tel:)/i.test(normalized)) return normalized
    return isLocalAssetPath(normalized) ? assetUrl(normalized) : undefined
  }

  function sanitizeHtml(value?: string | null, allowVideo = false, imageAltSubject?: string) {
    return sanitizeRichHtml(value || '', {
      linkUrl: safeLink,
      imageUrl: (src) => assetUrl(safeLink(src)),
      ...(allowVideo ? { videoUrl: (src?: string) => assetUrl(safeLink(src)) } : {}),
      ...(imageAltSubject ? { imageAlt: (alt: string, position: number) => readableImageAlt(alt, `${imageAltSubject} 图片 ${position}`) } : {}),
    })
  }

  function contentImageUrls(value?: string | null) {
    return [...(value || '').matchAll(/<img\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi)]
      .map(match => assetUrl(match.slice(1).find(Boolean)))
      .filter((path): path is string => Boolean(path))
  }

  async function getPublishedCollection<T>(endpoint: string, query: Record<string, string> = {}): Promise<T[]> {
    return reusePrerenderRequest(`versioned:${endpoint}:${new URLSearchParams(query).toString()}`, () => getPublishedPageItems(endpoint, (page, pageSize) => {
      const search = new URLSearchParams({ ...query, page: String(page), pageSize: String(pageSize) })
      return publicContentFetch<unknown>(apiUrl(`${endpoint}?${search.toString()}`))
    }))
  }

  async function getPublishedProducts(categoriesById: Map<number, ProductCategory>, categoryId?: number): Promise<Product[]> {
    const query = new URLSearchParams({ categoryId: categoryId ? String(categoryId) : '', keyword: '', page: '1', pageSize: '100' })
    return reusePrerenderRequest(`site:products:${query.toString()}`, async () => {
      const products = await getPublishedPageItems<ApiProduct>('products', (page, pageSize) => {
        const pageQuery = new URLSearchParams({ categoryId: categoryId ? String(categoryId) : '', keyword: '', page: String(page), pageSize: String(pageSize) })
        return publicContentFetch<unknown>(siteApiUrl(`products?${pageQuery.toString()}`))
      })
      return products.map((product) => toProduct(product, categoriesById)).filter((product): product is Product => Boolean(product))
    })
  }

  async function getCategoriesById() {
    return new Map((await getProductCategories()).map((category) => [category.id, category]))
  }

  async function getProductCategories(): Promise<ProductCategory[]> {
    const load = async () => {
      const categories = await publicContentFetch<unknown>(siteApiUrl('product-categories/tree'))
      if (!Array.isArray(categories)) throw new Error('Published content API returned an invalid product categories response.')
      return projectProductCategoryTree(categories as ProductCategorySourceNode[])
    }
    if (!import.meta.prerender) return load()
    return prerenderProductCategories ||= load()
  }

  async function getMainNavigation() {
    const load = () => publicContentFetch<unknown>(siteApiUrl('navigation?position=main')).then(parseMainNavigation)
    if (!import.meta.prerender) return load()
    return prerenderMainNavigation ||= load()
  }

  async function getSiteShell(): Promise<SiteShell> {
    const load = async () => {
      const [site, navigation] = await Promise.all([
        loadPublicSite(),
        getMainNavigation(),
      ])
      return {
        contact: displayContact(site.contact),
        navigation,
        settings: site.settings,
      }
    }
    return import.meta.server ? siteShellCache.get(load) : load()
  }

  async function getSiteSettings(): Promise<SiteSettings> {
    const load = async () => (await loadPublicSite()).settings
    if (!import.meta.prerender) return load()
    return prerenderSiteSettings ||= load()
  }

  async function getHomeBanners(): Promise<HomeBanner[]> {
    const banners = await publicContentFetch<unknown>(siteApiUrl('banners?position=home'))
    if (!Array.isArray(banners)) throw new Error('Public site API returned an invalid banners response.')
    return banners.flatMap((banner, index) => {
      const item = banner as ApiBanner
      const imageUrl = assetUrl(item.imageUrl)
      if (!imageUrl) return []
      const title = item.title?.trim() || ''
      const alt = item.altText?.trim() || title || '优联科技首页轮播图'
      return [{
        id: `${title || 'banner'}-${index}`,
        title,
        description: item.description?.trim() || undefined,
        imageUrl,
        mobileImageUrl: assetUrl(item.mobileImageUrl),
        alt,
      }]
    })
  }

  async function getHomepageProducts(): Promise<Product[]> {
    return reusePrerenderRequest('site:home-products', async () => {
      const [response, categoriesById] = await Promise.all([
        publicContentFetch<unknown>(siteApiUrl('home')),
        getCategoriesById(),
      ])
      const featuredProducts = response && typeof response === 'object'
        ? (response as ApiPublicHome).featuredProducts
        : undefined
      if (!Array.isArray(featuredProducts)) {
        throw new Error('Public site API returned an invalid home featured products response.')
      }
      return featuredProducts.flatMap((product) => {
        if (!product || typeof product !== 'object') return []
        const mapped = toProduct(product as ApiProduct, categoriesById)
        return mapped ? [mapped] : []
      })
    })
  }

  function toProduct(product: ApiProduct, categoriesById: Map<number, ProductCategory>): Product | undefined {
    const sourceCategorySlug = product.categorySlug?.trim()
    const category = (typeof product.categoryId === 'number' ? categoriesById.get(product.categoryId) : undefined)
      || (sourceCategorySlug ? [...categoriesById.values()].find(entry => entry.slug === sourceCategorySlug) : undefined)
    const categorySlug = category?.slug || ''
    const heroPath = assetUrl(product.coverImageUrl)
    const gallery = parseStringArray(product.gallery || product.galleryJson)
    const galleryPaths = [...new Set(gallery.map(assetUrl).filter((path): path is string => Boolean(path) && path !== heroPath))]
    const featuredSpecifications = Array.isArray(product.featuredSpecifications)
      ? product.featuredSpecifications.flatMap((specification) => {
          const label = specification.label?.trim()
          const value = specification.value?.trim()
          if (!label || !value) return []
          return [{
            label,
            value,
            detail: '',
          }]
        }).slice(0, 5)
      : []
    const specifications = {
      ...decodeProductSpecificationValues(product.featuredSpecifications),
      ...decodeProductSpecificationValues(product.specificationsJson),
      ...decodeProductSpecificationValues(product.specifications),
    }
    return projectPublishedProduct(product, {
      categoryName: category?.name || '产品中心',
      categorySlug,
      highlights: featuredSpecifications,
      specifications,
      videoUrl: isHttpsUrl(product.videoUrl?.trim() || '') ? product.videoUrl?.trim() : undefined,
      contentHtml: sanitizeHtml(product.content, false, product.name?.trim() || undefined),
      heroPath,
      galleryPaths,
    })
  }

  function toArticle(article: ApiMedia): Article | undefined {
    const slug = article.slug?.trim()
    const title = article.title?.trim()
    if (!slug || !title) return undefined
    const content = article.content
    const excerpt = article.summary?.trim() || plainText(content)
    const metadata = projectArticleMetadata(article, { title, summary: excerpt, slug })
    const coverImageUrl = assetUrl(article.coverImageUrl)
    const galleryImageUrls = parseStringArray(article.gallery || article.galleryJson).map(assetUrl).filter((path): path is string => Boolean(path))
    const imageUrls = [...new Set([coverImageUrl, ...galleryImageUrls, ...contentImageUrls(content)].filter((path): path is string => Boolean(path)))]
    return {
      slug,
      type: mediaTypeLabel(article.type),
      category: readKnowledgeCategoryRef(article.category),
      title,
      excerpt,
      body: plainText(content),
      bodyHtml: sanitizeHtml(content, true),
      author: article.sourceName?.trim() || undefined,
      publishedAt: article.publishedAt || undefined,
      coverImageUrl,
      imageUrls,
      sourceUrl: safeLink(article.sourceUrl),
      schemaType: articleSchemaType(article.type),
      tags: metadata.tags,
      seo: metadata.seo,
    }
  }

  async function getProducts(categorySlug?: string): Promise<Product[]> {
    const normalizedCategorySlug = categorySlug?.trim()
    const categoriesById = await getCategoriesById()
    const products = await getPublishedProducts(categoriesById)
    if (!normalizedCategorySlug) return products
    const category = [...categoriesById.values()].find(entry => entry.slug === normalizedCategorySlug)
    return category ? productsInProductCategory(products, category) : []
  }

  async function getProductCategoryCatalog(slug: string): Promise<ProductCategoryCatalog | undefined> {
    const categories = await getProductCategories()
    const category = categories.find(entry => entry.slug === slug)
    if (!category) return undefined
    const categoriesById = new Map(categories.map(entry => [entry.id, entry]))
    const products = await getPublishedProducts(categoriesById)
    return { category, categories, products: productsInProductCategory(products, category) }
  }

  async function getProductCategoryLanding(slug: string): Promise<ProductCategoryLanding | undefined> {
    const normalizedSlug = slug.trim()
    if (!normalizedSlug) return undefined
    return reusePrerenderRequest(`site:product-category-landing:${normalizedSlug}`, async () => {
      try {
        const response = await publicContentFetch<unknown>(siteApiUrl(`product-categories/${encodeURIComponent(normalizedSlug)}/landing`))
        const landing = decodeProductCategoryLanding(response, { sanitizeAnswerHtml: value => sanitizeHtml(value) })
        if (landing.category.slug !== normalizedSlug) throw new Error('Product category landing returned a mismatched category.')
        return landing
      } catch (error: unknown) {
        if (isNotFound(error)) return undefined
        throw error
      }
    })
  }

  async function getProductPage(categoryId?: number, keyword = '', page = 1, pageSize = 9): Promise<ProductPage> {
    const query = new URLSearchParams({ categoryId: categoryId ? String(categoryId) : '', keyword, page: String(page), pageSize: String(pageSize) })
    const [response, categoriesById] = await Promise.all([
      publicContentFetch<unknown>(siteApiUrl(`products?${query.toString()}`)),
      getCategoriesById(),
    ])
    const productPage = asPublishedPage<ApiProduct>(response, 'products')
    return {
      ...productPage,
      items: productPage.items.map((product) => toProduct(product, categoriesById)).filter((product): product is Product => Boolean(product)),
    }
  }

  async function getProductBySlug(slug: string): Promise<Product | undefined> {
    const categoriesByIdPromise = getCategoriesById()
    try {
      const [source, categoriesById] = await Promise.all([
        publicContentFetch<ApiProduct>(apiUrl(`products/${encodeURIComponent(slug)}`)),
        categoriesByIdPromise,
      ])
      return toProduct(source, categoriesById)
    } catch (error: unknown) {
      if (isNotFound(error)) {
        const categoriesById = await categoriesByIdPromise
        return (await getPublishedProducts(categoriesById)).find((product) => product.slug === slug)
      }
      throw error
    }
  }

  async function getMediaPage(type?: string, page = 1, pageSize = 10): Promise<MediaPage> {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    const normalizedType = type?.trim()
    if (normalizedType) query.set('type', normalizedType)
    const response = await publicContentFetch<unknown>(apiUrl(`media?${query.toString()}`))
    const mediaPage = asPublishedPage<ApiMedia>(response, 'media')
    return {
      ...mediaPage,
      items: mediaPage.items.map(toArticle).filter((article): article is Article => Boolean(article)),
    }
  }

  async function getKnowledgeCategories(): Promise<KnowledgeCategory[]> {
    return reusePrerenderRequest('site:knowledge-categories', async () =>
      decodeKnowledgeCategoryList(await publicContentFetch<unknown>(siteApiUrl('article-categories'))))
  }

  // Resolves current or historical slugs; the caller redirects when `category.slug` differs from the request.
  async function getKnowledgeCategoryPage(slug: string, page = 1, pageSize = 10): Promise<KnowledgeCategoryPage | undefined> {
    if (!isCanonicalKnowledgeCategorySlug(slug)) return undefined
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    try {
      const response = await publicContentFetch<unknown>(siteApiUrl(`article-categories/${encodeURIComponent(slug)}?${query.toString()}`))
      const source = response && typeof response === 'object' ? response as { category?: unknown, articles?: unknown } : {}
      const articles = asPublishedPage<ApiMedia>(source.articles, 'article-categories')
      return {
        category: decodeKnowledgeCategory(source.category),
        articles: { ...articles, items: articles.items.map(toArticle).filter((article): article is Article => Boolean(article)) },
      }
    } catch (error: unknown) {
      if (isNotFound(error)) return undefined
      throw error
    }
  }

  async function getMedia(type?: string): Promise<Article[]> {
    const query: Record<string, string> = type ? { type } : {}
    return (await getPublishedCollection<ApiMedia>('media', query)).map(toArticle).filter((article): article is Article => Boolean(article))
  }

  async function getMediaBySlug(slug: string): Promise<Article | undefined> {
    return reusePrerenderRequest(`media-detail:${slug}`, async () => {
      try {
        return toArticle(await publicContentFetch<ApiMedia>(apiUrl(`media/${encodeURIComponent(slug)}`)))
      } catch (error: unknown) {
        if (isNotFound(error)) return undefined
        throw error
      }
    })
  }

  async function getVideos(): Promise<PublicVideo[]> {
    return (await getPublishedCollection<unknown>('videos')).map((value) => {
      const video = decodePublicVideo(value)
      return { ...video, coverImageUrl: assetUrl(video.coverImageUrl) }
    })
  }

  async function getVideoBySlug(slug: string): Promise<PublicVideoDetail | undefined> {
    if (!isCanonicalResourceSlug(slug)) return undefined
    return reusePrerenderRequest(`video-detail:${slug}`, async () => {
      try {
        const video = decodePublicVideoDetail(await publicContentFetch<unknown>(apiUrl(`videos/${encodeURIComponent(slug)}`)))
        return { ...video, coverImageUrl: assetUrl(video.coverImageUrl) }
      } catch (error: unknown) {
        if (isNotFound(error)) return undefined
        throw error
      }
    })
  }

  async function getSoftwareDownloads(): Promise<PublicDownload[]> {
    return (await getPublishedCollection<unknown>('software-downloads')).map(decodePublicDownload)
  }

  async function getSoftwareDownloadBySlug(slug: string): Promise<PublicDownloadDetail | undefined> {
    if (!isCanonicalResourceSlug(slug)) return undefined
    return reusePrerenderRequest(`software-download-detail:${slug}`, async () => {
      try {
        return decodePublicDownloadDetail(await publicContentFetch<unknown>(apiUrl(`software-downloads/${encodeURIComponent(slug)}`)))
      } catch (error: unknown) {
        if (isNotFound(error)) return undefined
        throw error
      }
    })
  }

  async function getFaqs(): Promise<Faq[]> {
    return (await getPublishedCollection<ApiServiceFaq>('service/faqs')).flatMap((faq, index) => {
      const question = faq.question?.trim()
      const answer = plainText(faq.answer)
      return question && answer ? [{ slug: String(faq.id ?? `${faq.category || 'support'}-${index}`), question, answer, category: faq.category?.trim() || '服务支持' }] : []
    })
  }

  async function getPolicies(type: ServicePolicyType): Promise<ServicePolicy[]> {
    return (await getPublishedCollection<ApiServicePolicy>('service/policies', { type })).flatMap((policy, index) => {
      const title = policy.title?.trim()
      const content = plainText(policy.content)
      return title && content ? [{
        id: String(policy.id ?? `${policy.type || 'support'}-${index}`),
        type: policy.type?.trim() || '服务支持',
        title,
        content,
        contentHtml: sanitizeHtml(policy.content),
        imageUrl: assetUrl(policy.imageUrl),
      }] : []
    })
  }

  async function getResources(): Promise<Resource[]> {
    return (await getPublishedCollection<ApiResource>('resources')).flatMap((resource, index) => {
      const title = resource.title?.trim() || resource.fileName?.trim()
      return title ? [{ id: String(resource.id ?? `${resource.resourceType || 'resource'}-${title}-${index}`), type: resource.resourceType?.trim() || '技术资料', title, description: plainText(resource.description), coverImageUrl: assetUrl(resource.coverImageUrl), resourceUrl: resourceUrl(resource.resourceUrl), fileName: resource.fileName?.trim() || undefined, fileSizeBytes: resource.fileSizeBytes || undefined }] : []
    })
  }

  async function getAbout(): Promise<CompanyProfile> {
    const entries = await getPublishedCollection<ApiAboutContent>('about')
    const brand = entries.find((entry) => entry.type === 'brand_intro' || entry.type === 'brand' || entry.type === 'introduction')
    const brandImageUrl = assetUrl(brand?.imageUrl)
    return {
      brandTitle: brand?.title?.trim() || undefined,
      brandIntro: plainText(brand?.content),
      brandIntroHtml: sanitizeHtml(brand?.content) || undefined,
      brandImageUrl,
      brandPreviewImageUrl: brandImageUrl || contentImageUrls(brand?.content)[0],
      gallery: entries.flatMap((entry, index) => (entry.type === 'gallery' || entry.type === 'image') && entry.title?.trim() ? [{ id: String(entry.id ?? `gallery-${index}`), title: entry.title.trim(), imageUrl: assetUrl(entry.imageUrl) }] : []),
    }
  }

  async function getCertificates(): Promise<Certificate[]> {
    return (await getPublishedCollection<ApiCertificate>('certificates')).flatMap((entry, index) => {
      const certificate = projectCertificate(entry, index, assetUrl)
      return certificate ? [certificate] : []
    })
  }

  async function getContact(): Promise<ContactInfo | undefined> {
    const load = async () => {
      try {
        const contact = await publicContentFetch<ApiContactInfo>(apiUrl('contact'))
        return mapContact(contact)
      } catch (error: unknown) {
        if (isNotFound(error)) return undefined
        throw error
      }
    }
    if (!import.meta.prerender) return load()
    return prerenderContact ||= load()
  }

  async function getDisplayContact(): Promise<DisplayContactInfo> {
    return displayContact(await getContact() || {})
  }

  return {
    getProducts,
    getProductPage,
    getProductCategoryCatalog,
    getProductCategoryLanding,
    getProductBySlug,
    getProductCategories,
    getMainNavigation,
    getSiteShell,
    getSiteSettings,
    getHomeBanners,
    getHomepageProducts,
    getMediaPage,
    getKnowledgeCategories,
    getKnowledgeCategoryPage,
    getMedia,
    getMediaBySlug,
    getVideos,
    getVideoBySlug,
    getSoftwareDownloads,
    getSoftwareDownloadBySlug,
    getFaqs,
    getPolicies,
    getResources,
    getAbout,
    getCertificates,
    getContact,
    getDisplayContact,
  }
}
