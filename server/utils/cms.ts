import { articles as localArticles, type Article } from '~/shared/content/articles'
import { faqs as localFaqs, type Faq } from '~/shared/content/faqs'
import { manuals as localManuals, type Manual } from '~/shared/content/manuals'
import { products as localProducts, type Product } from '~/shared/content/products'
import { projectPublishedProduct, truncatePublicationText } from '~/shared/content/product-publication'
import { publicContentFetchOptions } from '~/shared/content/upstream'
import { projectArticleMetadata } from '~/shared/content/article-metadata'

type CmsConfig = {
  directusUrl?: string
  directusToken?: string
  contentApiTimeoutSeconds?: unknown
}

type DirectusResponse<T> = { data: T }

type DirectusProduct = {
  id: string | number
  slug: string
  model: string
  category_zh?: string | null
  category_slug?: string | null
  title_zh?: string | null
  summary_zh?: string | null
  description_zh?: string | null
  applications_zh?: unknown
  highlights_zh?: unknown
  seo_title_zh?: string | null
  seo_description_zh?: string | null
  hero_image_url?: string | null
}

type DirectusArticle = {
  slug: string
  custom_slug?: string | null
  type?: string | null
  title_zh?: string | null
  excerpt_zh?: string | null
  body_zh?: string | null
  author_zh?: string | null
  published_at?: string | null
  updated_at?: string | null
  cover_image_url?: string | null
  video_url?: string | null
}

type DirectusFaq = { slug: string, question_zh?: string | null, answer_zh?: string | null, category_zh?: string | null, product_slug?: string | null, published_at?: string | null }
type DirectusManual = { slug: string, title_zh?: string | null, product_slug?: string | null, version?: string | null, language?: string | null, published_at?: string | null, file?: string | null }

function getCmsBaseUrl(config: CmsConfig) {
  return config.directusUrl?.replace(/\/$/, '')
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
  if (typeof value === 'string') return value.split('\n').map((item) => item.trim()).filter(Boolean)
  return []
}

function asHighlights(value: unknown): Product['highlights'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const source = item as Record<string, unknown>
    if (typeof source.label !== 'string' || typeof source.value !== 'string') return []
    return [{ label: source.label, value: source.value, detail: typeof source.detail === 'string' ? source.detail : '' }]
  })
}

function mapProduct(item: DirectusProduct): Product {
  const name = item.title_zh?.trim() || item.model
  const description = item.description_zh?.trim() || item.summary_zh?.trim() || ''
  const publication = projectPublishedProduct({
    slug: item.slug,
    modelNo: item.model,
    name,
    summary: item.summary_zh,
    content: description,
    productKind: 'finished_product',
  }, {
    categoryName: item.category_zh?.trim() || '管道检测设备',
    categorySlug: item.category_slug?.trim() || '',
    highlights: asHighlights(item.highlights_zh),
    heroPath: item.hero_image_url?.trim() || undefined,
    galleryPaths: item.hero_image_url?.trim() ? [item.hero_image_url.trim()] : [],
  })
  if (!publication) throw new Error('Directus returned an invalid published product.')
  return {
    ...publication,
    applications: asStringArray(item.applications_zh),
    seo: {
      title: item.seo_title_zh?.trim() || publication.seo.title,
      description: truncatePublicationText(item.seo_description_zh?.trim() || publication.description, 160),
    },
  }
}

function mapArticle(item: DirectusArticle): Article {
  const title = item.title_zh?.trim() || item.slug
  const excerpt = item.excerpt_zh?.trim() || ''
  const metadata = projectArticleMetadata(undefined, { title, summary: excerpt, slug: item.slug })
  return {
    slug: item.slug,
    customSlug: item.custom_slug?.trim() || undefined,
    type: item.type?.trim() || '技术文章',
    title,
    excerpt,
    body: item.body_zh?.trim() || '',
    bodyHtml: item.body_zh?.trim() || undefined,
    author: item.author_zh?.trim() || undefined,
    publishedAt: item.published_at || undefined,
    updatedAt: item.updated_at || undefined,
    coverImageUrl: item.cover_image_url?.trim() || undefined,
    imageUrls: item.cover_image_url?.trim() ? [item.cover_image_url.trim()] : [],
    videoUrl: item.video_url?.trim() || undefined,
    tags: metadata.tags,
    seo: metadata.seo,
  }
}

function mapFaq(item: DirectusFaq): Faq {
  return { slug: item.slug, question: item.question_zh?.trim() || item.slug, answer: item.answer_zh?.trim() || '', category: item.category_zh?.trim() || '甯歌闂', productSlug: item.product_slug?.trim() || undefined, publishedAt: item.published_at || undefined }
}

function mapManual(item: DirectusManual): Manual {
  return { slug: item.slug, title: item.title_zh?.trim() || item.slug, productSlug: item.product_slug?.trim() || undefined, version: item.version?.trim() || '', language: item.language?.trim() || 'zh-CN', publishedAt: item.published_at || undefined }
}

async function directusGet<T>(config: CmsConfig, path: string, query: Record<string, string> = {}) {
  const baseUrl = getCmsBaseUrl(config)
  if (!baseUrl) throw new Error('Directus is not configured')

  const url = new URL(`${baseUrl}${path}`)
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value))
  const response = await $fetch<DirectusResponse<T>>(url.toString(), {
    ...publicContentFetchOptions({ includeTrustedSsrHeader: false, timeoutSeconds: config.contentApiTimeoutSeconds }),
    headers: config.directusToken ? { Authorization: `Bearer ${config.directusToken}` } : undefined,
  })
  return response.data
}

function unavailable(error: unknown): never {
  console.error('Directus content request failed', error)
  throw createError({ statusCode: 502, statusMessage: '内容服务暂时不可用，请稍后再试。' })
}

const productFields = 'slug,model,category_zh,category_slug,title_zh,summary_zh,description_zh,applications_zh,highlights_zh,seo_title_zh,seo_description_zh,hero_image_url'
const articleFields = 'slug,custom_slug,type,title_zh,excerpt_zh,body_zh,author_zh,published_at,updated_at,cover_image_url,video_url'
const faqFields = 'slug,question_zh,answer_zh,category_zh,product_slug,published_at'
const manualFields = 'slug,title_zh,product_slug,version,language,published_at,file'

export async function getProducts(config: CmsConfig): Promise<Product[]> {
  if (!getCmsBaseUrl(config)) return localProducts
  try {
    const data = await directusGet<DirectusProduct[]>(config, '/items/products', {
      fields: productFields,
      'filter[status][_eq]': 'published',
      sort: '-published_at,-date_created',
      limit: '-1',
    })
    return data.map(mapProduct)
  } catch (error) {
    return unavailable(error)
  }
}

export async function getProductBySlug(config: CmsConfig, slug: string): Promise<Product | undefined> {
  if (!getCmsBaseUrl(config)) return localProducts.find((product) => product.slug === slug)
  try {
    const data = await directusGet<DirectusProduct[]>(config, '/items/products', {
      fields: productFields,
      'filter[status][_eq]': 'published',
      'filter[slug][_eq]': slug,
      limit: '1',
    })
    return data[0] ? mapProduct(data[0]) : undefined
  } catch (error) {
    return unavailable(error)
  }
}

export async function getArticles(config: CmsConfig): Promise<Article[]> {
  if (!getCmsBaseUrl(config)) return localArticles
  try {
    const data = await directusGet<DirectusArticle[]>(config, '/items/articles', {
      fields: articleFields,
      'filter[status][_eq]': 'published',
      sort: '-published_at,-date_created',
      limit: '-1',
    })
    return data.map(mapArticle)
  } catch (error) {
    return unavailable(error)
  }
}

export async function getArticleBySlug(config: CmsConfig, slug: string): Promise<Article | undefined> {
  if (!getCmsBaseUrl(config)) return localArticles.find((article) => article.slug === slug)
  try {
    const data = await directusGet<DirectusArticle[]>(config, '/items/articles', {
      fields: articleFields,
      'filter[status][_eq]': 'published',
      'filter[slug][_eq]': slug,
      limit: '1',
    })
    return data[0] ? mapArticle(data[0]) : undefined
  } catch (error) {
    return unavailable(error)
  }
}

export async function getFaqs(config: CmsConfig, productSlug?: string): Promise<Faq[]> {
  if (!getCmsBaseUrl(config)) return localFaqs.filter((faq) => !productSlug || faq.productSlug === productSlug)
  try {
    const query: Record<string, string> = { fields: faqFields, 'filter[status][_eq]': 'published', sort: '-published_at,-date_created', limit: '-1' }
    if (productSlug) query['filter[product_slug][_eq]'] = productSlug
    return (await directusGet<DirectusFaq[]>(config, '/items/faqs', query)).map(mapFaq)
  } catch (error) { return unavailable(error) }
}

export async function getManuals(config: CmsConfig, productSlug?: string): Promise<Manual[]> {
  if (!getCmsBaseUrl(config)) return localManuals.filter((manual) => !productSlug || manual.productSlug === productSlug)
  try {
    const query: Record<string, string> = { fields: manualFields, 'filter[status][_eq]': 'published', sort: '-published_at,-date_created', limit: '-1' }
    if (productSlug) query['filter[product_slug][_eq]'] = productSlug
    return (await directusGet<DirectusManual[]>(config, '/items/manuals', query)).map(mapManual)
  } catch (error) { return unavailable(error) }
}

export async function getPublishedManualFile(config: CmsConfig, slug: string) {
  if (!getCmsBaseUrl(config)) return undefined
  try {
    const data = await directusGet<DirectusManual[]>(config, '/items/manuals', { fields: manualFields, 'filter[status][_eq]': 'published', 'filter[slug][_eq]': slug, limit: '1' })
    const manual = data[0]
    if (!manual?.file) return undefined
    return { fileId: manual.file, filename: `${mapManual(manual).title}.pdf` }
  } catch (error) { return unavailable(error) }
}

export async function getManualAsset(config: CmsConfig, fileId: string) {
  const baseUrl = getCmsBaseUrl(config)
  if (!baseUrl) return undefined
  try {
    const response = await fetch(`${baseUrl}/assets/${encodeURIComponent(fileId)}`, { headers: config.directusToken ? { Authorization: `Bearer ${config.directusToken}` } : undefined })
    if (!response.ok) return undefined
    return response
  } catch (error) { return unavailable(error) }
}

