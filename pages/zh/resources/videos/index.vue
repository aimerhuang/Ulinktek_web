<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { videoSourceLabel } from '~/shared/content/resources'
import { paginatedPath, paginatedTitle, parsePaginationQuery, resolvePagination } from '~/shared/content/pagination'

const { getVideos } = useContentApi()
const route = useRoute()
const basePath = '/zh/resources/videos'
const pageQuery = computed(() => parsePaginationQuery(route.query.page))
if (Object.keys(route.query).some(key => key !== 'page') || !pageQuery.value.canonical) {
  await navigateTo(paginatedPath(basePath, pageQuery.value.page), { redirectCode: 301, replace: true })
}

const videos = await getVideos()
const { videoLabel } = useResourceNavigationLabels()
const keyword = ref('')
const localPage = ref(1)
const pageSize = 9
const routePage = computed(() => pageQuery.value.page)
const routeTotalPages = computed(() => Math.ceil(videos.length / pageSize))
if (resolvePagination(route.query.page, routeTotalPages.value).action === 'not-found') {
  throw createError({ statusCode: 404, statusMessage: '未找到该视频列表页。' })
}

const filteredVideos = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase('zh-CN')
  if (!query) return videos
  return videos.filter(video => `${video.title} ${video.summary}`.toLocaleLowerCase('zh-CN').includes(query))
})
const filtering = computed(() => Boolean(keyword.value.trim()))
const page = computed(() => filtering.value ? localPage.value : routePage.value)
const visibleVideos = computed(() => filteredVideos.value.slice((page.value - 1) * pageSize, page.value * pageSize))

watch(keyword, () => {
  localPage.value = 1
  if (filtering.value && routePage.value > 1) void navigateTo(basePath, { replace: true })
})

function videoListingTo(targetPage: number) {
  return paginatedPath(basePath, targetPage)
}

usePageSeo({
  title: computed(() => paginatedTitle(videoLabel, routePage.value)),
  description: '浏览优联科技发布的设备操作、功能演示与应用视频。',
  path: computed(() => paginatedPath(basePath, routePage.value)),
})
</script>

<template>
  <section class="section resource-list-page">
    <div class="page-width">
      <header class="resource-page-heading resource-page-heading--with-count">
        <div><h1>{{ videoLabel }}</h1><p>选择视频查看完整介绍与播放内容。</p></div>
        <span>{{ filteredVideos.length }} 项内容</span>
      </header>

      <div class="resource-filter">
        <label for="video-keyword">搜索视频</label>
        <div class="resource-filter__field">
          <Search :size="18" aria-hidden="true" />
          <input id="video-keyword" v-model="keyword" type="search" placeholder="输入标题或内容关键词">
        </div>
      </div>

      <div v-if="visibleVideos.length" class="video-resource-grid">
        <article v-for="video in visibleVideos" :key="video.slug" class="video-resource-card">
          <NuxtLink class="video-resource-card__media" :to="`/zh/resources/videos/${video.slug}`">
            <MediaPlaceholder :label="videoSourceLabel(video.sourceType)" :alt="video.title" :src="video.coverImageUrl" kind="scene" />
            <span class="video-resource-card__play" aria-hidden="true" />
          </NuxtLink>
          <div class="video-resource-card__body">
            <span>{{ videoSourceLabel(video.sourceType) }}</span>
            <h2><NuxtLink :to="`/zh/resources/videos/${video.slug}`">{{ video.title }}</NuxtLink></h2>
            <p v-if="video.summary">{{ video.summary }}</p>
          </div>
        </article>
      </div>
      <div v-else class="empty-state resource-empty-state">
        <h2>{{ videos.length ? '没有匹配的视频' : '视频内容正在整理' }}</h2>
        <p>{{ videos.length ? '请尝试调整搜索关键词。' : '已审核的视频会在发布后显示于此。' }}</p>
      </div>
      <ResourcePager
        :page="page"
        :page-size="pageSize"
        :total="filteredVideos.length"
        :mode="filtering ? 'local' : 'links'"
        :to="videoListingTo"
        @change="localPage = $event"
      />
    </div>
  </section>
</template>
