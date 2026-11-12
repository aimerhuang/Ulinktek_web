<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import { downloadOperatingSystem, downloadSchemaType, formatFileSize, packageTypeLabel, packageTypeMime } from '~/shared/content/resources'
import { absoluteSiteUrl, breadcrumbListEntity, organizationEntityId, serializeJsonLd } from '~/shared/content/structured-data'

const route = useRoute()
const { getSoftwareDownloadBySlug } = useContentApi()
const download = await getSoftwareDownloadBySlug(String(route.params.slug))
if (!download) throw createError({ statusCode: 404, statusMessage: '未找到该下载。' })
const { resourceLabel, downloadLabel } = useResourceNavigationLabels()

usePageBreadcrumbLabel(() => route.path, () => download.name)

const config = useRuntimeConfig()
const downloadPath = `/zh/resources/downloads/${download.slug}`
const canonicalUrl = absoluteSiteUrl(config.public.siteUrl, downloadPath)
const downloadUrl = absoluteSiteUrl(config.public.siteUrl, download.downloadUrl)
const schemaType = downloadSchemaType(download.packageType)
const encodingFormat = packageTypeMime(download.packageType)
const description = download.description || download.summary
// Without editor copy, describe the file from its published facts instead of repeating the name.
const fallbackDescription = `${download.name}（${packageTypeLabel(download.packageType)}，版本 ${download.version}），由${config.public.siteName}官方提供下载。`
usePageSeo({ title: download.name, description: description || fallbackDescription, path: downloadPath })
const downloadStructuredData = {
  '@context': 'https://schema.org',
  '@type': schemaType,
  '@id': `${canonicalUrl}#download`,
  name: download.name,
  description: description || fallbackDescription,
  url: canonicalUrl,
  mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  dateModified: download.updatedAt,
  encodingFormat,
  ...(schemaType === 'SoftwareApplication'
    ? { softwareVersion: download.version, downloadUrl, operatingSystem: downloadOperatingSystem(download.packageType), applicationCategory: 'UtilitiesApplication' }
    : schemaType === 'DigitalDocument'
      ? { encoding: { '@type': 'MediaObject', contentUrl: downloadUrl, encodingFormat, contentSize: download.fileSizeBytes !== undefined ? formatFileSize(download.fileSizeBytes) : undefined } }
      : { contentUrl: downloadUrl, contentSize: download.fileSizeBytes !== undefined ? formatFileSize(download.fileSizeBytes) : undefined }),
  publisher: { '@id': organizationEntityId(config.public.siteUrl) },
}
const downloadBreadcrumb = breadcrumbListEntity(config.public.siteUrl, downloadPath, [
  { name: '首页', path: '/' },
  { name: resourceLabel, path: '/zh/resources' },
  { name: downloadLabel, path: '/zh/resources/downloads' },
  { name: download.name, path: downloadPath },
])
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: serializeJsonLd(downloadStructuredData),
  }, {
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({ '@context': 'https://schema.org', ...downloadBreadcrumb }),
  }],
})
</script>

<template>
  <article class="resource-detail">
    <section class="section resource-detail__main">
      <div class="page-width download-detail">
        <header class="download-detail__header">
          <span class="download-detail__type">{{ download.packageType.toUpperCase() }}</span>
          <div>
            <p>{{ packageTypeLabel(download.packageType) }}</p>
            <h1>{{ download.name }}</h1>
          </div>
        </header>

        <div class="download-detail__layout">
          <div class="resource-detail__content">
            <h2>版本说明</h2>
            <p v-if="download.description" class="resource-detail__description">{{ download.description }}</p>
            <p v-else class="resource-detail__description">该下载暂未提供版本说明。</p>
            <p class="resource-parent-link"><NuxtLink class="text-link" to="/zh/resources/downloads">返回下载中心</NuxtLink></p>
          </div>
          <aside class="download-detail__summary" aria-label="下载信息">
            <dl class="resource-detail__meta">
              <div><dt>当前版本</dt><dd>{{ download.version }}</dd></div>
              <div><dt>文件类型</dt><dd>{{ packageTypeLabel(download.packageType) }}</dd></div>
              <div><dt>文件大小</dt><dd>{{ formatFileSize(download.fileSizeBytes) }}</dd></div>
              <div><dt>文件名</dt><dd>{{ download.fileName }}</dd></div>
              <div><dt>更新时间</dt><dd><time :datetime="download.updatedAt">{{ new Date(download.updatedAt).toLocaleDateString('zh-CN') }}</time></dd></div>
            </dl>
            <a class="button button--primary download-detail__action" :href="download.downloadUrl">
              <Download :size="18" aria-hidden="true" /> 下载当前版本
            </a>
          </aside>
        </div>
      </div>
    </section>
  </article>
</template>
