<script setup lang="ts">
import { articlePublicSlug, knowledgeArticlePath, KNOWLEDGE_BASE_PATH } from '~/shared/content/knowledge'
import { paginatedPath, paginatedTitle, parsePaginationQuery, resolvePagination } from '~/shared/content/pagination'
import { absoluteSiteUrl, breadcrumbListEntity, serializeJsonLd, websiteEntityId } from '~/shared/content/structured-data'

const { getMediaPage, getKnowledgeCategories } = useContentApi()
const route = useRoute()
const knowledgeTitle = useNavigationLabel(KNOWLEDGE_BASE_PATH)
const pageQuery = computed(() => parsePaginationQuery(route.query.page))
if (Object.keys(route.query).some(key => key !== 'page') || !pageQuery.value.canonical) {
  await navigateTo(paginatedPath(KNOWLEDGE_BASE_PATH, pageQuery.value.page), { redirectCode: 301, replace: true })
}
const currentPage = computed(() => pageQuery.value.page)
const knowledgeKey = computed(() => `knowledge-base-articles:${currentPage.value}`)
const [{ data: knowledgeData }, { data: knowledgeCategories }] = await Promise.all([
  useAsyncData(knowledgeKey, () => getMediaPage(undefined, currentPage.value)),
  useAsyncData('knowledge-categories', getKnowledgeCategories),
])
const knowledgeArticles = computed(() => knowledgeData.value?.items || [])
const pageSize = computed(() => knowledgeData.value?.pageSize || 10)
const totalPages = computed(() => Math.ceil((knowledgeData.value?.total || 0) / pageSize.value))
if (resolvePagination(route.query.page, totalPages.value).action === 'not-found') {
  throw createError({ statusCode: 404, statusMessage: '未找到该知识库列表页。' })
}

const description = '查看优联科技发布的管道检测科普、设备性能对比、选型采购指南、工程应用案例与使用维护知识。'
const canonicalPath = computed(() => paginatedPath(KNOWLEDGE_BASE_PATH, currentPage.value))

usePageSeo({
  title: computed(() => paginatedTitle(knowledgeTitle.value, currentPage.value)),
  description,
  path: canonicalPath,
})

const config = useRuntimeConfig()
const structuredData = computed(() => {
  const pageUrl = absoluteSiteUrl(config.public.siteUrl, canonicalPath.value)
  const breadcrumb = breadcrumbListEntity(config.public.siteUrl, canonicalPath.value, [
    { name: '首页', path: '/' },
    { name: knowledgeTitle.value, path: KNOWLEDGE_BASE_PATH },
  ])
  return {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'CollectionPage',
      '@id': pageUrl,
      name: paginatedTitle(knowledgeTitle.value, currentPage.value),
      description,
      url: pageUrl,
      isPartOf: { '@id': websiteEntityId(config.public.siteUrl) },
      breadcrumb: { '@id': breadcrumb['@id'] },
      mainEntity: { '@id': `${pageUrl}#articles` },
    }, {
      '@type': 'ItemList',
      '@id': `${pageUrl}#articles`,
      numberOfItems: knowledgeArticles.value.length,
      itemListElement: knowledgeArticles.value.map((article, index) => {
        const articleUrl = absoluteSiteUrl(config.public.siteUrl, knowledgeArticlePath(articlePublicSlug(article)))
        return {
          '@type': 'ListItem',
          position: (currentPage.value - 1) * pageSize.value + index + 1,
          item: {
            '@type': article.schemaType || 'Article',
            '@id': `${articleUrl}#article`,
            headline: article.title,
            url: articleUrl,
            articleSection: article.category?.name,
          },
        }
      }),
    }, breadcrumb],
  }
})
useHead(() => ({ script: [{ type: 'application/ld+json', innerHTML: serializeJsonLd(structuredData.value) }] }))
</script>

<template>
  <h1 class="visually-hidden">{{ knowledgeTitle }}</h1>
  <section class="section section--listing media-list-section">
    <div class="page-width">
      <KnowledgeCategoryTabs :categories="knowledgeCategories || []" />
      <KnowledgeArticleList v-if="knowledgeArticles.length" :articles="knowledgeArticles" />
      <div v-else class="empty-state">
        <h2>知识内容正在整理</h2>
        <p>已审核的内容会在发布后显示于此。</p>
      </div>
      <KnowledgePagination :base-path="KNOWLEDGE_BASE_PATH" :current-page="currentPage" :total-pages="totalPages" label="知识库分页" />
    </div>
  </section>
</template>
