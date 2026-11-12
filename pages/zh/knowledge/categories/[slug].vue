<script setup lang="ts">
import { articlePublicSlug, isCanonicalKnowledgeCategorySlug, knowledgeArticlePath, knowledgeCategoryPath, KNOWLEDGE_BASE_PATH } from '~/shared/content/knowledge'
import { paginatedPath, paginatedTitle, parsePaginationQuery, resolvePagination } from '~/shared/content/pagination'
import { absoluteSiteUrl, breadcrumbListEntity, serializeJsonLd, websiteEntityId } from '~/shared/content/structured-data'

// Pagination only changes the query; remount so the page-specific data reloads.
definePageMeta({ key: route => route.fullPath })

const route = useRoute()
const { getKnowledgeCategoryPage, getKnowledgeCategories } = useContentApi()
const requestedSlug = String(route.params.slug)
if (!isCanonicalKnowledgeCategorySlug(requestedSlug)) {
  throw createError({ statusCode: 404, statusMessage: '未找到该知识分类。' })
}

const pageQuery = parsePaginationQuery(route.query.page)
if (Object.keys(route.query).some(key => key !== 'page') || !pageQuery.canonical) {
  await navigateTo(paginatedPath(knowledgeCategoryPath(requestedSlug), pageQuery.page), { redirectCode: 301, replace: true })
}

const [{ data: categoryPage }, { data: knowledgeCategories }] = await Promise.all([
  useAsyncData(`knowledge-category:${requestedSlug}:${pageQuery.page}`, () => getKnowledgeCategoryPage(requestedSlug, pageQuery.page)),
  useAsyncData('knowledge-categories', getKnowledgeCategories),
])
const resolved = categoryPage.value
if (!resolved) throw createError({ statusCode: 404, statusMessage: '未找到该知识分类。' })

const category = resolved.category
const categoryPath = knowledgeCategoryPath(category.slug)
// A historical slug resolves to the renamed category; keep the page number on the permanent redirect.
if (category.slug !== requestedSlug) {
  await navigateTo(paginatedPath(categoryPath, pageQuery.page), { redirectCode: 301, replace: true })
}

const currentPage = pageQuery.page
const totalPages = Math.ceil(resolved.articles.total / resolved.articles.pageSize)
if (resolvePagination(route.query.page, totalPages).action === 'not-found') {
  throw createError({ statusCode: 404, statusMessage: '未找到该知识分类页。' })
}

const articles = resolved.articles.items
const knowledgeTitle = useNavigationLabel(KNOWLEDGE_BASE_PATH)
usePageBreadcrumbLabel(() => route.path, () => category.name)
const canonicalPath = paginatedPath(categoryPath, currentPage)
const description = category.seoDescription || category.description || `${knowledgeTitle.value}中「${category.name}」分类的已发布文章。`

usePageSeo({
  title: paginatedTitle(category.seoTitle || category.name, currentPage),
  description,
  path: canonicalPath,
  image: articles.find(article => article.coverImageUrl)?.coverImageUrl,
  robots: category.publishedArticleCount === 0 ? 'noindex, follow' : undefined,
})

const config = useRuntimeConfig()
const pageUrl = absoluteSiteUrl(config.public.siteUrl, canonicalPath)
const breadcrumb = breadcrumbListEntity(config.public.siteUrl, categoryPath, [
  { name: '首页', path: '/' },
  { name: knowledgeTitle.value, path: KNOWLEDGE_BASE_PATH },
  { name: category.name, path: categoryPath },
])
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({
      '@context': 'https://schema.org',
      '@graph': [{
        '@type': 'CollectionPage',
        '@id': pageUrl,
        name: paginatedTitle(category.name, currentPage),
        description,
        url: pageUrl,
        about: { '@type': 'Thing', name: category.name },
        isPartOf: { '@id': websiteEntityId(config.public.siteUrl) },
        breadcrumb: { '@id': breadcrumb['@id'] },
        mainEntity: { '@id': `${pageUrl}#articles` },
      }, {
        '@type': 'ItemList',
        '@id': `${pageUrl}#articles`,
        numberOfItems: articles.length,
        itemListElement: articles.map((article, index) => {
          const articleUrl = absoluteSiteUrl(config.public.siteUrl, knowledgeArticlePath(articlePublicSlug(article)))
          return {
            '@type': 'ListItem',
            position: (currentPage - 1) * resolved.articles.pageSize + index + 1,
            item: {
              '@type': article.schemaType || 'Article',
              '@id': `${articleUrl}#article`,
              headline: article.title,
              url: articleUrl,
              articleSection: category.name,
            },
          }
        }),
      }, breadcrumb],
    }),
  }],
})
</script>

<template>
  <section class="section section--listing media-list-section">
    <div class="page-width">
      <KnowledgeCategoryTabs :categories="knowledgeCategories || []" :current-slug="category.slug" />
      <header class="knowledge-category-header">
        <h1>{{ category.name }}</h1>
        <p v-if="category.description">{{ category.description }}</p>
      </header>
      <KnowledgeArticleList v-if="articles.length" :articles="articles" />
      <div v-else class="empty-state">
        <h2>该分类内容正在整理</h2>
        <p>已审核的文章会在发布后显示于此，也可以先浏览<NuxtLink :to="KNOWLEDGE_BASE_PATH">全部知识文章</NuxtLink>。</p>
      </div>
      <KnowledgePagination :base-path="categoryPath" :current-page="currentPage" :total-pages="totalPages" :label="`${category.name}分页`" />
    </div>
  </section>
</template>
