import type { RuntimeConfig } from 'nuxt/schema'
import type { H3Event } from 'h3'
import { getSearchArticles, getSearchDownloads, getSearchKnowledgeCategories, getSearchProductCatalog, getSearchVideos } from '~/server/utils/search-content'
import { articlePublicSlug, knowledgeArticlePath, knowledgeCategoryPath, KNOWLEDGE_BASE_PATH } from '~/shared/content/knowledge'
import { productCategoryPath } from '~/shared/content/product-category'
import { productsInProductCategory } from '~/shared/content/product-categories'
import { sitemapLastModified } from '~/shared/content/discovery'
import { getIndexableForumContent } from '~/server/utils/forum-discovery'

export type IndexableUrl = { path: string; lastModified?: string }

// A collection page changes whenever one of its members does; ISO-8601 UTC strings sort chronologically.
function latestModified(entries: Array<{ lastModified?: string }>) {
  return entries.reduce<string | undefined>((latest, { lastModified }) => (lastModified && (!latest || lastModified > latest) ? lastModified : latest), undefined)
}

export async function getIndexableZhUrls(event: H3Event, config: RuntimeConfig): Promise<IndexableUrl[]> {
  const [productCatalog, articles, videos, downloads, forum, knowledgeCategories] = await Promise.all([
    getSearchProductCatalog(event, config),
    getSearchArticles(event, config),
    getSearchVideos(event, config),
    getSearchDownloads(event, config),
    getIndexableForumContent(event, config),
    getSearchKnowledgeCategories(event, config),
  ])
  const { products, nonemptyCategories } = productCatalog
  const productEntries = products.map(product => ({ path: `/zh/products/${product.slug}`, lastModified: sitemapLastModified(product.publishedAt) }))
  const videoEntries = videos.map(video => ({ path: `/zh/resources/videos/${video.slug}`, lastModified: sitemapLastModified(video.updatedAt || video.publishedAt) }))
  const downloadEntries = downloads.map(download => ({ path: `/zh/resources/downloads/${download.slug}`, lastModified: sitemapLastModified(download.updatedAt) }))
  const articleEntries = articles.map(article => ({ path: knowledgeArticlePath(articlePublicSlug(article)), lastModified: sitemapLastModified(article.publishedAt) }))
  const forumPostEntries = forum.posts.map(post => ({ path: `/zh/forum/${post.id}`, categoryId: post.category.id, lastModified: sitemapLastModified(post.publishedAt) }))
  const productLastModifiedBySlug = new Map(products.map(product => [product.slug, sitemapLastModified(product.publishedAt)]))
  const entries: IndexableUrl[] = [
    { path: '/', lastModified: latestModified([...productEntries, ...articleEntries, ...videoEntries, ...downloadEntries]) },
    { path: '/zh/products', lastModified: latestModified(productEntries) },
    { path: '/zh/oem-odm' },
    { path: KNOWLEDGE_BASE_PATH, lastModified: latestModified(articleEntries) },
    ...knowledgeCategories.map(category => ({
      path: knowledgeCategoryPath(category.slug),
      lastModified: latestModified(articles
        .filter(article => article.category?.slug === category.slug)
        .map(article => ({ lastModified: sitemapLastModified(article.publishedAt) }))),
    })),
    { path: '/zh/support' },
    { path: '/zh/faq' },
    ...nonemptyCategories.map(category => ({
      path: productCategoryPath(category.slug),
      lastModified: latestModified(productsInProductCategory(products, category).map(product => ({ lastModified: productLastModifiedBySlug.get(product.slug) }))),
    })),
    ...productEntries,
    { path: '/zh/resources', lastModified: latestModified([...videoEntries, ...downloadEntries]) },
    { path: '/zh/resources/videos', lastModified: latestModified(videoEntries) },
    ...videoEntries,
    { path: '/zh/resources/downloads', lastModified: latestModified(downloadEntries) },
    ...downloadEntries,
    ...articleEntries,
    { path: '/zh/about' },
    { path: '/zh/about/certificate' },
    { path: '/zh/contact' },
    { path: '/zh/forum', lastModified: latestModified(forumPostEntries) },
    ...forum.categories.map(category => ({
      path: `/zh/forum/category/${category.id}`,
      lastModified: latestModified(forumPostEntries.filter(post => post.categoryId === category.id)),
    })),
    ...forumPostEntries.map(({ path, lastModified }) => ({ path, lastModified })),
  ]

  return [...new Map(entries.map(entry => [entry.path, entry])).values()]
}

export async function getIndexableZhPaths(event: H3Event, config: RuntimeConfig) {
  return (await getIndexableZhUrls(event, config)).map(entry => entry.path)
}

