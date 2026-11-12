<script setup lang="ts">
import { articlePublicSlug, knowledgeArticlePath, knowledgeCategoryPath, KNOWLEDGE_BASE_PATH } from '~/shared/content/knowledge'
import { readableImageAlt, sanitizeRichHtml } from '~/shared/content/rich-html'
import { absoluteSiteUrl, breadcrumbListEntity, organizationEntityId, serializeJsonLd } from '~/shared/content/structured-data'

const route = useRoute()
const { getMediaBySlug } = useContentApi()
const requestedSlug = String(route.params.slug)
const article = await getMediaBySlug(requestedSlug)
if (!article) throw createError({ statusCode: 404, statusMessage: '未找到该知识文章。' })
const effectiveSlug = articlePublicSlug(article)
const articlePath = knowledgeArticlePath(effectiveSlug)
if (requestedSlug !== effectiveSlug) {
  await navigateTo({ path: articlePath, query: route.query }, { redirectCode: 301, replace: true })
}
const knowledgeTitle = useNavigationLabel(KNOWLEDGE_BASE_PATH)
const category = article.category
  ? { name: article.category.name, path: knowledgeCategoryPath(article.category.slug) }
  : undefined
usePageBreadcrumbLabel(() => route.path, () => article.title, () => category ? [{ label: category.name, to: category.path }] : [])

const config = useRuntimeConfig()
const safeContentUrl = (value?: string) => {
  const normalized = value?.trim()
  if (!normalized) return undefined
  if (/^https:\/\//i.test(normalized)) return normalized
  return /^\/assets\//.test(normalized) && !normalized.includes('\\') ? normalized : undefined
}
const sanitizedBodyHtml = article.bodyHtml?.includes('<')
  ? sanitizeRichHtml(article.bodyHtml, {
      linkUrl: safeContentUrl,
      imageUrl: safeContentUrl,
      videoUrl: safeContentUrl,
      imageAlt: (alt, position) => readableImageAlt(alt, `${article.title} 配图 ${position}`),
    })
  : undefined
const articleUrl = absoluteSiteUrl(config.public.siteUrl, articlePath)
const articleImageUrls = article.imageUrls.map(image => absoluteSiteUrl(config.public.siteUrl, image))
const articleImageUrl = articleImageUrls[0]
usePageSeo({
  title: article.seo.title,
  description: article.seo.description,
  keywords: article.seo.keywords,
  path: article.seo.canonicalPath,
  absoluteTitle: true,
  image: articleImageUrl,
  ogType: 'article',
})
const articleBreadcrumb = breadcrumbListEntity(config.public.siteUrl, articlePath, [
  { name: '首页', path: '/' },
  { name: knowledgeTitle.value, path: KNOWLEDGE_BASE_PATH },
  ...(category ? [{ name: category.name, path: category.path }] : []),
  { name: article.title, path: articlePath },
])
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({
      '@context': 'https://schema.org',
      '@type': article.schemaType || 'Article',
      '@id': `${articleUrl}#article`,
      headline: article.title,
      articleSection: category?.name,
      description: article.seo.description || undefined,
      keywords: article.seo.keywords || undefined,
      about: article.tags.length ? article.tags.map(name => ({ '@type': 'Thing', name })) : undefined,
      mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
      url: articleUrl,
      image: articleImageUrls.length ? articleImageUrls : undefined,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      author: article.author ? { '@type': 'Organization', name: article.author } : undefined,
      publisher: { '@id': organizationEntityId(config.public.siteUrl) },
    }),
  }, {
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({ '@context': 'https://schema.org', ...articleBreadcrumb }),
  }],
})
</script>

<template>
  <article>
    <section class="page-hero article-hero">
      <div class="page-width article-layout">
        <p class="eyebrow">
          <NuxtLink v-if="category" :to="category.path">{{ category.name }}</NuxtLink>
          <template v-else>{{ article.type }}</template>
        </p>
        <h1>{{ article.title }}</h1>
        <p v-if="article.excerpt">{{ article.excerpt }}</p>
        <p class="article-meta">
          <span v-if="article.author">{{ article.author }}</span>
          <time v-if="article.publishedAt" :datetime="article.publishedAt">{{ new Date(article.publishedAt).toLocaleDateString('zh-CN') }}</time>
        </p>
      </div>
    </section>
    <section class="section">
      <div class="page-width article-layout">
        <div v-if="sanitizedBodyHtml" class="article-body rich-content" v-html="sanitizedBodyHtml" />
        <div v-else class="article-body">{{ article.body }}</div>
        <p v-if="article.sourceUrl" class="article-source">
          <a :href="article.sourceUrl" target="_blank" rel="noopener noreferrer">查看内容来源</a>
        </p>
        <p class="resource-parent-link">
          <NuxtLink v-if="category" class="text-link" :to="category.path">查看更多{{ category.name }}</NuxtLink>
          <NuxtLink v-else class="text-link" :to="KNOWLEDGE_BASE_PATH">返回{{ knowledgeTitle }}</NuxtLink>
        </p>
      </div>
    </section>
  </article>
</template>
