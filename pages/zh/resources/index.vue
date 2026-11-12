<script setup lang="ts">
import { ArrowRight, Download, PlaySquare } from 'lucide-vue-next'

const { getVideos, getSoftwareDownloads } = useContentApi()
const [videos, downloads] = await Promise.all([getVideos(), getSoftwareDownloads()])
const { resourceLabel, videoLabel, downloadLabel } = useResourceNavigationLabels()

usePageSeo({
  title: resourceLabel,
  description: `查看优联科技发布的${videoLabel}与${downloadLabel}资源。`,
  path: '/zh/resources',
})
</script>

<template>
  <section class="resource-directory section">
    <div class="page-width">
      <header class="resource-page-heading">
        <h1>{{ resourceLabel }}</h1>
        <p>按资源类型进入独立目录，查看已审核发布的视频与当前版本下载。</p>
      </header>
      <div class="resource-directory__list">
        <NuxtLink id="videos" class="resource-directory__entry" to="/zh/resources/videos">
          <span class="resource-directory__icon" aria-hidden="true"><PlaySquare :size="30" /></span>
          <span class="resource-directory__content">
            <strong>{{ videoLabel }}</strong>
            <span>查看设备操作、功能演示及应用视频。</span>
          </span>
          <span class="resource-directory__count">{{ videos.length }} 项</span>
          <ArrowRight :size="22" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink id="software" class="resource-directory__entry" to="/zh/resources/downloads">
          <span class="resource-directory__icon" aria-hidden="true"><Download :size="30" /></span>
          <span class="resource-directory__content">
            <strong>{{ downloadLabel }}</strong>
            <span>获取当前发布的应用、程序、压缩包与 PDF 文档。</span>
          </span>
          <span class="resource-directory__count">{{ downloads.length }} 项</span>
          <ArrowRight :size="22" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
