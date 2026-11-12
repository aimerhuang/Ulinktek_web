import type { RuntimeConfig } from 'nuxt/schema'
import type { H3Event } from 'h3'
import { getArticles, getProducts } from '~/server/utils/cms'
import { fetchPublicUpstream } from '~/server/utils/public-upstream'
import type { Article } from '~/shared/content/articles'
import type { Product } from '~/shared/content/products'
import { projectPublishedProduct, type ProductPublicationSource } from '~/shared/content/product-publication'
import { getPublishedPageItems } from '~/shared/content/public-api'
import { decodePublicDownload, decodePublicVideo } from '~/shared/content/resources'
import type { PublicDownload, PublicVideo } from '~/shared/content/resources'
import { parseMainNavigation } from '~/shared/content/navigation'
import type { SiteNavigationItem } from '~/shared/content/navigation'
import { nonemptyProductCategoryEntries, projectProductCategoryTree } from '~/shared/content/product-categories'
import type { ProductCategory, ProductCategoryEntry, ProductCategorySourceNode } from '~/shared/content/product-categories'
import { articleSchemaType, mediaTypeLabel } from '~/shared/content/media-publication'
import { projectArticleMetadata } from '~/shared/content/article-metadata'
import { decodeProductCategoryLanding } from '~/shared/content/product-category-landing'
import { decodeKnowledgeCategoryList, readKnowledgeCategoryRef, visibleKnowledgeCategories } from '~/shared/content/knowledge-categories'
import type { KnowledgeCategory } from '~/shared/content/knowledge-categories'

type ApiProduct = ProductPublicationSource & { categoryId?: number | null, categorySlug?: string | null, coverImageUrl?: string | null }
type ApiMedia = { type?: string | null, title?: string | null, slug?: string | null, summary?: string | null, coverImageUrl?: string | null, publishedAt?: string | null, category?: unknown }

function externalApiBase(config: RuntimeConfig) {
  const apiBase = (config.apiServerBase || config.public.apiBase)?.replace(/\/+$/, '')
  return apiBase && /^https?:\/\//i.test(apiBase) ? apiBase : undefined
}

function externalSiteApiBase(config: RuntimeConfig) {
  const apiBase = (config.siteApiServerBase || config.public.siteApiBase)?.replace(/\/+$/, '')
  return apiBase && /^https?:\/\//i.test(apiBase) ? apiBase : undefined
}

async function getPublishedCollection<T>(event: H3Event, apiBase: string, endpoint: string): Promise<T[]> {
  return getPublishedPageItems(endpoint, (page, pageSize) => fetchPublicUpstream<unknown>(event, `${apiBase}/${endpoint}?page=${page}&pageSize=${pageSize}`))
}

export type SearchProductCatalog = {
  products: Product[]
  categories: ProductCategory[]
  nonemptyCategories: ProductCategoryEntry[]
}

export async function getSearchProductCatalog(event: H3Event, config: RuntimeConfig): Promise<SearchProductCatalog> {
  const siteApiBase = externalSiteApiBase(config)
  if (!siteApiBase) return { products: await getProducts(config), categories: [], nonemptyCategories: [] }
  const [products, categories] = await Promise.all([
    getPublishedCollection<ApiProduct>(event, siteApiBase, 'products'),
    fetchPublicUpstream<unknown>(event, `${siteApiBase}/product-categories/tree`),
  ])
  if (!Array.isArray(categories)) throw new Error('Public site API returned an invalid product categories response.')
  const categoryTree = projectProductCategoryTree(categories as ProductCategorySourceNode[])
  const categoriesById = new Map(categoryTree.map(category => [category.id, category]))
  const categoriesBySlug = new Map(categoryTree.map(category => [category.slug, category]))
  const publishedProducts = products.flatMap((product) => {
    const category = (typeof product.categoryId === 'number' ? categoriesById.get(product.categoryId) : undefined)
      || categoriesBySlug.get(product.categorySlug?.trim() || '')
    const categorySlug = category?.slug || ''
    const publication = projectPublishedProduct(product, {
      categoryName: category?.name || '产品中心',
      categorySlug,
      heroPath: product.coverImageUrl || undefined,
      galleryPaths: product.coverImageUrl ? [product.coverImageUrl] : [],
    })
    return publication ? [publication] : []
  })
  return {
    products: publishedProducts,
    categories: categoryTree,
    nonemptyCategories: nonemptyProductCategoryEntries(categoryTree, publishedProducts),
  }
}

export async function getSearchProducts(event: H3Event, config: RuntimeConfig): Promise<Product[]> {
  return (await getSearchProductCatalog(event, config)).products
}

export async function getSearchArticles(event: H3Event, config: RuntimeConfig): Promise<Article[]> {
  const apiBase = externalApiBase(config)
  if (!apiBase) return getArticles(config)
  return (await getPublishedCollection<ApiMedia>(event, apiBase, 'media')).flatMap((article) => {
    const slug = article.slug?.trim()
    const title = article.title?.trim()
    if (!slug || !title) return []
    const excerpt = article.summary?.trim() || ''
    const metadata = projectArticleMetadata(article, { title, summary: excerpt, slug })
    return [{
      slug,
      type: mediaTypeLabel(article.type),
      category: readKnowledgeCategoryRef(article.category),
      title,
      excerpt,
      body: '',
      publishedAt: article.publishedAt || undefined,
      coverImageUrl: article.coverImageUrl || undefined,
      imageUrls: article.coverImageUrl ? [article.coverImageUrl] : [],
      schemaType: articleSchemaType(article.type),
      tags: metadata.tags,
      seo: metadata.seo,
    }]
  })
}

export async function getSearchVideos(event: H3Event, config: RuntimeConfig): Promise<PublicVideo[]> {
  const apiBase = externalApiBase(config)
  if (!apiBase) return []
  return (await getPublishedCollection<unknown>(event, apiBase, 'videos')).map(decodePublicVideo)
}

export async function getSearchDownloads(event: H3Event, config: RuntimeConfig): Promise<PublicDownload[]> {
  const apiBase = externalApiBase(config)
  if (!apiBase) return []
  return (await getPublishedCollection<unknown>(event, apiBase, 'software-downloads')).map(decodePublicDownload)
}

// Only enabled categories with published articles are discoverable; empty ones stay noindex.
export async function getSearchKnowledgeCategories(event: H3Event, config: RuntimeConfig): Promise<KnowledgeCategory[]> {
  const siteApiBase = externalSiteApiBase(config)
  if (!siteApiBase) return []
  return visibleKnowledgeCategories(decodeKnowledgeCategoryList(await fetchPublicUpstream<unknown>(event, `${siteApiBase}/article-categories`)))
}

// Published category intros keyed by slug; categories without a landing record are simply absent.
export async function getSearchCategoryIntros(event: H3Event, config: RuntimeConfig, slugs: string[]): Promise<Map<string, string>> {
  const siteApiBase = externalSiteApiBase(config)
  if (!siteApiBase) return new Map()
  const intros = await Promise.all(slugs.map(async (slug) => {
    try {
      const landing = decodeProductCategoryLanding(
        await fetchPublicUpstream<unknown>(event, `${siteApiBase}/product-categories/${encodeURIComponent(slug)}/landing`),
        { sanitizeAnswerHtml: value => value },
      )
      return landing.intro ? [slug, landing.intro] as const : undefined
    } catch (error: unknown) {
      if ((error as { statusCode?: number } | null)?.statusCode === 404) return undefined
      throw error
    }
  }))
  return new Map(intros.filter((entry): entry is readonly [string, string] => Boolean(entry)))
}

export type SearchSiteContact = { companyName?: string, address?: string, phone?: string, email?: string }

export async function getSearchSiteContact(event: H3Event, config: RuntimeConfig): Promise<SearchSiteContact> {
  const siteApiBase = externalSiteApiBase(config)
  if (!siteApiBase) return {}
  const site = await fetchPublicUpstream<{ contact?: Record<string, unknown> | null }>(event, `${siteApiBase}/site`)
  const text = (value: unknown) => (typeof value === 'string' && value.trim()) || undefined
  const contact = site?.contact || {}
  return { companyName: text(contact.companyName), address: text(contact.address), phone: text(contact.phone), email: text(contact.email) }
}

export async function getSearchMainNavigation(event: H3Event, config: RuntimeConfig): Promise<SiteNavigationItem[]> {
  const siteApiBase = externalSiteApiBase(config)
  if (!siteApiBase) throw new Error('NUXT_SITE_API_SERVER_BASE is required to generate navigation-backed discovery output.')
  return parseMainNavigation(await fetchPublicUpstream<unknown>(event, `${siteApiBase}/navigation?position=main`))
}
