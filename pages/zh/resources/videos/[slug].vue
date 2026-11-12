<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import { videoSourceLabel } from '~/shared/content/resources'
import { absoluteSiteUrl, breadcrumbListEntity, organizationEntityId, serializeJsonLd } from '~/shared/content/structured-data'

const route = useRoute()
const { getVideoBySlug } = useContentApi()
const video = await getVideoBySlug(String(route.params.slug))
if (!video) throw createError({ statusCode: 404, statusMessage: '未找到该视频。' })
const { resourceLabel, videoLabel } = useResourceNavigationLabels()

usePageBreadcrumbLabel(() => route.path, () => video.title)

const config = useRuntimeConfig()
const videoPath = `/zh/resources/videos/${video.slug}`
const canonicalUrl = absoluteSiteUrl(config.public.siteUrl, videoPath)
const imageUrl = video.coverImageUrl ? absoluteSiteUrl(config.public.siteUrl, video.coverImageUrl) : undefined
// Editor copy that only repeats the title is no description; fall back to a sentence built from published facts.
const videoDescription = [video.description, video.summary]
  .map(value => value?.trim())
  .find(value => value && value !== video.title.trim())
  || `${video.title}。${config.public.siteName}（ULINKTEK）发布的管道检测设备${videoLabel}，${video.playbackUrl ? '可在本页观看' : '可前往原平台观看'}。`
usePageSeo({ title: video.title, description: videoDescription, path: `/zh/resources/videos/${video.slug}`, image: imageUrl, ogType: 'video.other' })
const videoStructuredData = imageUrl
  ? {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      '@id': `${canonicalUrl}#video`,
      name: video.title,
      description: videoDescription,
      thumbnailUrl: imageUrl,
      uploadDate: video.publishedAt,
      dateModified: video.updatedAt,
      ...(video.playbackUrl ? { contentUrl: absoluteSiteUrl(config.public.siteUrl, video.playbackUrl) } : {}),
      url: canonicalUrl,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      publisher: { '@id': organizationEntityId(config.public.siteUrl) },
    }
  : undefined
const videoBreadcrumb = breadcrumbListEntity(config.public.siteUrl, videoPath, [
  { name: '首页', path: '/' },
  { name: resourceLabel, path: '/zh/resources' },
  { name: videoLabel, path: '/zh/resources/videos' },
  { name: video.title, path: videoPath },
])
useHead({
  script: [...(videoStructuredData ? [{
    type: 'application/ld+json' as const,
    innerHTML: serializeJsonLd(videoStructuredData),
  }] : []), {
    type: 'application/ld+json' as const,
    innerHTML: serializeJsonLd({ '@context': 'https://schema.org', ...videoBreadcrumb }),
  }],
})
</script>

<template>
  <article class="resource-detail">
    <section class="section resource-detail__main">
      <div class="page-width resource-video-detail">
        <div class="resource-video-detail__media">
          <ResourceVideoPlayer v-if="video.playbackUrl" :title="video.title" :playback-url="video.playbackUrl" :poster="video.coverImageUrl" />
          <div v-else class="resource-watch-panel">
            <MediaPlaceholder :label="videoSourceLabel(video.sourceType)" :alt="video.title" :src="video.coverImageUrl" kind="scene" loading="eager" />
            <a v-if="video.watchUrl" class="button button--primary" :href="video.watchUrl" target="_blank" rel="noopener noreferrer">
              前往观看 <ExternalLink :size="17" aria-hidden="true" />
            </a>
          </div>
        </div>
        <div class="resource-detail__content">
          <p class="resource-detail__type">{{ videoSourceLabel(video.sourceType) }}</p>
          <h1>{{ video.title }}</h1>
          <dl class="resource-detail__meta">
            <div><dt>发布时间</dt><dd><time :datetime="video.publishedAt">{{ new Date(video.publishedAt).toLocaleDateString('zh-CN') }}</time></dd></div>
            <div><dt>更新时间</dt><dd><time :datetime="video.updatedAt">{{ new Date(video.updatedAt).toLocaleDateString('zh-CN') }}</time></dd></div>
          </dl>
          <p v-if="video.description" class="resource-detail__description">{{ video.description }}</p>
          <p v-else class="resource-detail__description">该视频暂未提供文字说明。</p>
          <p class="resource-parent-link"><NuxtLink class="text-link" to="/zh/resources/videos">返回视频库</NuxtLink></p>
        </div>
      </div>
    </section>
  </article>
</template>
