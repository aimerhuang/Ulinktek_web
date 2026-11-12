<script setup lang="ts">
import { Download, FileArchive, FileText, Search } from 'lucide-vue-next'
import { DOWNLOAD_PACKAGE_TYPES, packageTypeLabel } from '~/shared/content/resources'
import { paginatedPath, paginatedTitle, parsePaginationQuery, resolvePagination } from '~/shared/content/pagination'

const { getSoftwareDownloads } = useContentApi()
const route = useRoute()
const basePath = '/zh/resources/downloads'
const pageQuery = computed(() => parsePaginationQuery(route.query.page))
if (Object.keys(route.query).some(key => key !== 'page') || !pageQuery.value.canonical) {
  await navigateTo(paginatedPath(basePath, pageQuery.value.page), { redirectCode: 301, replace: true })
}

const downloads = await getSoftwareDownloads()
const { downloadLabel } = useResourceNavigationLabels()
const keyword = ref('')
const packageType = ref('')
const localPage = ref(1)
const pageSize = 10
const routePage = computed(() => pageQuery.value.page)
const routeTotalPages = computed(() => Math.ceil(downloads.length / pageSize))
if (resolvePagination(route.query.page, routeTotalPages.value).action === 'not-found') {
  throw createError({ statusCode: 404, statusMessage: '未找到该下载列表页。' })
}

const filteredDownloads = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase('zh-CN')
  return downloads.filter(download => {
    const matchesKeyword = !query || `${download.name} ${download.summary} ${download.version} ${download.fileName}`.toLocaleLowerCase('zh-CN').includes(query)
    return matchesKeyword && (!packageType.value || download.packageType === packageType.value)
  })
})
const filtering = computed(() => Boolean(keyword.value.trim() || packageType.value))
const page = computed(() => filtering.value ? localPage.value : routePage.value)
const visibleDownloads = computed(() => filteredDownloads.value.slice((page.value - 1) * pageSize, page.value * pageSize))

watch([keyword, packageType], () => {
  localPage.value = 1
  if (filtering.value && routePage.value > 1) void navigateTo(basePath, { replace: true })
})

function downloadListingTo(targetPage: number) {
  return paginatedPath(basePath, targetPage)
}

usePageSeo({
  title: computed(() => paginatedTitle(downloadLabel, routePage.value)),
  description: '下载优联科技当前发布的 Android 应用、Windows 程序、压缩包与 PDF 文档。',
  path: computed(() => paginatedPath(basePath, routePage.value)),
})
</script>

<template>
  <section class="section resource-list-page">
    <div class="page-width">
      <header class="resource-page-heading resource-page-heading--with-count">
        <h1>{{ downloadLabel }}</h1>
        <span>{{ filteredDownloads.length }} 项内容</span>
      </header>

      <div class="resource-filter resource-filter--downloads">
        <div>
          <label for="download-keyword">搜索下载</label>
          <div class="resource-filter__field">
            <Search :size="18" aria-hidden="true" />
            <input id="download-keyword" v-model="keyword" type="search" placeholder="输入名称、版本或文件名">
          </div>
        </div>
        <div>
          <label for="download-type">文件类型</label>
          <select id="download-type" v-model="packageType">
            <option value="">全部类型</option>
            <option v-for="type in DOWNLOAD_PACKAGE_TYPES" :key="type" :value="type">{{ packageTypeLabel(type) }}</option>
          </select>
        </div>
      </div>

      <div v-if="visibleDownloads.length" class="download-resource-list">
        <article v-for="download in visibleDownloads" :key="download.slug" class="download-resource-row">
          <span class="download-resource-row__icon" aria-hidden="true">
            <FileText v-if="download.packageType === 'pdf'" :size="25" />
            <FileArchive v-else :size="25" />
          </span>
          <div class="download-resource-row__content">
            <span class="download-resource-row__type">{{ packageTypeLabel(download.packageType) }}</span>
            <h2><NuxtLink :to="`/zh/resources/downloads/${download.slug}`">{{ download.name }}</NuxtLink></h2>
            <p v-if="download.summary">{{ download.summary }}</p>
          </div>
          <dl class="download-resource-row__meta">
            <div><dt>版本</dt><dd>{{ download.version }}</dd></div>
            <div><dt>更新</dt><dd><time :datetime="download.updatedAt">{{ new Date(download.updatedAt).toLocaleDateString('zh-CN') }}</time></dd></div>
          </dl>
          <div class="download-resource-row__actions">
            <a class="button button--primary" :href="download.downloadUrl">
              <Download :size="17" aria-hidden="true" /> 下载
            </a>
          </div>
        </article>
      </div>
      <div v-else class="empty-state resource-empty-state">
        <h2>{{ downloads.length ? '没有匹配的下载' : '下载内容正在整理' }}</h2>
        <p>{{ downloads.length ? '请尝试调整搜索词或文件类型。' : '已审核的下载内容会在发布后显示于此。' }}</p>
      </div>
      <ResourcePager
        :page="page"
        :page-size="pageSize"
        :total="filteredDownloads.length"
        :mode="filtering ? 'local' : 'links'"
        :to="downloadListingTo"
        @change="localPage = $event"
      />

    </div>
  </section>
</template>
