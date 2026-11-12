<script setup lang="ts">
import { PenLine, Search } from 'lucide-vue-next'
import { ForumApiError, forumErrorMessage, throwForumSsrFailure } from '~/composables/useForumApi'
import type { ForumCategorySummary, ForumPage, ForumPost } from '~/shared/forum/contracts'

type CategoryView = {
  category?: ForumCategorySummary
  posts?: ForumPage<ForumPost>
  errorMessage: string
  disabled: boolean
}

const route = useRoute()
const router = useRouter()
const api = useForumApi()
const requestEvent = import.meta.server ? useRequestEvent() : undefined
const disabled = useState('forum-disabled', () => false)
const categoryId = Number(route.params.id)
if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
  throw createError({ statusCode: 404, statusMessage: '未找到该社区分类。' })
}

const page = computed(() => {
  const value = Number(route.query.page)
  return Number.isInteger(value) && value > 0 ? value : 1
})
const keyword = computed(() => typeof route.query.keyword === 'string' ? route.query.keyword.normalize('NFKC').trim().slice(0, 100) : '')
const search = ref(keyword.value)
const loading = ref(false)
const basePath = `/zh/forum/category/${categoryId}`

async function fetchView(): Promise<CategoryView> {
  try {
    const [categories, posts] = await Promise.all([
      api.listCategories(),
      api.listPosts(page.value, 12, keyword.value, categoryId),
    ])
    const category = categories.find(item => item.id === categoryId)
      || posts.items.find(item => item.category.id === categoryId)?.category
    if (!category) throw createError({ statusCode: 404, statusMessage: '未找到该社区分类。' })
    if (page.value > 1 && posts.total > 0 && !posts.items.length) {
      throw createError({ statusCode: 404, statusMessage: '未找到该分类分页。' })
    }
    return { category, posts, errorMessage: '', disabled: false }
  } catch (error) {
    if (!(error instanceof ForumApiError)) throw error
    if (import.meta.server) throwForumSsrFailure(error, requestEvent)
    return {
      errorMessage: forumErrorMessage(error, '分类内容加载失败，请稍后重试。'),
      disabled: error.code === 'FORUM_DISABLED',
    }
  }
}

const view = ref(await fetchView())
disabled.value = view.value.disabled

async function reload() {
  loading.value = true
  try {
    view.value = await fetchView()
    disabled.value = view.value.disabled
  } finally {
    loading.value = false
  }
}

function submitSearch() {
  const normalized = search.value.normalize('NFKC').trim().slice(0, 100)
  void router.push({ path: basePath, query: normalized ? { keyword: normalized } : {} })
}

function changePage(nextPage: number) {
  void router.push({
    path: basePath,
    query: {
      ...(keyword.value ? { keyword: keyword.value } : {}),
      ...(nextPage > 1 ? { page: nextPage } : {}),
    },
  })
}

watch(() => route.fullPath, async () => {
  search.value = keyword.value
  await reload()
})

const title = computed(() => view.value.category?.name || '社区分类')
const noindex = computed(() => Boolean(keyword.value) || page.value > 1)
usePageSeo({
  title,
  description: computed(() => `${title.value}相关的公开技术讨论。`),
  path: basePath,
  noindex,
})
usePageBreadcrumbLabel(() => route.path, title)
useHead({ bodyAttrs: { class: 'forum-route' } })
</script>

<template>
  <div class="forum-page">
    <section class="section forum-section">
      <div class="page-width forum-layout">
        <NuxtLink class="forum-back-link" to="/zh/forum">返回技术社区</NuxtLink>
        <header class="forum-toolbar">
          <div>
            <h1>{{ title }}</h1>
            <p>{{ keyword ? `当前分类中包含“${keyword}”的结果` : '按发布时间查看该分类的公开讨论' }}</p>
          </div>
          <div class="forum-toolbar__actions">
            <form class="forum-search" role="search" @submit.prevent="submitSearch">
              <label class="visually-hidden" for="forum-category-search">搜索当前分类</label>
              <input id="forum-category-search" v-model="search" type="search" maxlength="100" autocomplete="off" placeholder="搜索当前分类">
              <button class="button button--secondary" type="submit"><Search :size="17" aria-hidden="true" />搜索</button>
            </form>
            <NuxtLink v-if="!disabled" class="button button--primary" :to="{ path: '/zh/forum/new', query: { category: String(categoryId) } }"><PenLine :size="17" aria-hidden="true" />发布帖子</NuxtLink>
          </div>
        </header>

        <div v-if="loading" class="forum-board forum-board--loading" role="status"><div v-for="item in 4" :key="item" class="forum-loading-row"><div><Skeleton width="72%" height="1.15rem" /><Skeleton width="55%" height="0.75rem" /></div></div><span class="visually-hidden">正在加载分类帖子</span></div>
        <div v-else-if="view.errorMessage" class="forum-state" :class="{ 'forum-state--disabled': view.disabled }" role="alert">
          <h2>{{ view.disabled ? '社区暂未开放' : '分类加载失败' }}</h2><p>{{ view.errorMessage }}</p>
          <button v-if="!view.disabled" class="button button--secondary" type="button" @click="reload">重试</button>
        </div>
        <template v-else-if="view.posts">
          <div class="forum-section-heading"><h2>{{ keyword ? '搜索结果' : '全部主题' }}</h2><span>{{ view.posts.total }} 篇</span></div>
          <ForumPostList v-if="view.posts.items.length" :posts="view.posts.items" />
          <div v-else class="forum-state"><h2>{{ keyword ? '没有找到相关帖子' : '该分类暂无公开帖子' }}</h2><p>{{ keyword ? '请调整关键词后重试。' : '已审核的讨论会在发布后显示于此。' }}</p></div>
          <ForumPager :page="view.posts.page" :page-size="view.posts.pageSize" :total="view.posts.total" @change="changePage" />
        </template>
      </div>
    </section>
  </div>
</template>
