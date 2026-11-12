<script setup lang="ts">
import { ChevronRight, MessageSquareText, PenLine, Search, UsersRound } from 'lucide-vue-next'
import { ForumApiError, forumErrorMessage, throwForumSsrFailure } from '~/composables/useForumApi'
import type { ForumCategory, ForumCommunitySummary, ForumPage, ForumPost } from '~/shared/forum/contracts'

type ForumHomeView = {
  summary?: ForumCommunitySummary
  categories: ForumCategory[]
  posts?: ForumPage<ForumPost>
  errorMessage: string
  disabled: boolean
}

const route = useRoute()
const router = useRouter()
const api = useForumApi()
const requestEvent = import.meta.server ? useRequestEvent() : undefined
const forumTitle = useNavigationLabel('/zh/forum')
const disabled = useState('forum-disabled', () => false)
const search = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
const loading = ref(false)

const page = computed(() => {
  const value = Number(route.query.page)
  return Number.isInteger(value) && value > 0 ? value : 1
})
const keyword = computed(() => typeof route.query.keyword === 'string' ? route.query.keyword.normalize('NFKC').trim().slice(0, 100) : '')
const searchMode = computed(() => Boolean(keyword.value))

const legacyCategoryId = Number(route.query.category)
if (Number.isSafeInteger(legacyCategoryId) && legacyCategoryId > 0) {
  await navigateTo({
    path: `/zh/forum/category/${legacyCategoryId}`,
    query: {
      ...(keyword.value ? { keyword: keyword.value } : {}),
      ...(page.value > 1 ? { page: page.value } : {}),
    },
  }, { redirectCode: 301, replace: true })
}
if (!keyword.value && route.query.page !== undefined) {
  await navigateTo('/zh/forum', { redirectCode: 301, replace: true })
}

async function fetchView(): Promise<ForumHomeView> {
  try {
    if (searchMode.value) {
      const posts = await api.listPosts(page.value, 12, keyword.value)
      return { categories: [], posts, errorMessage: '', disabled: false }
    }
    const [summary, categories, posts] = await Promise.all([
      api.getSummary(),
      api.listCategories(),
      api.listPosts(1, 15),
    ])
    return { summary, categories, posts, errorMessage: '', disabled: false }
  } catch (error) {
    if (!(error instanceof ForumApiError)) throw error
    if (import.meta.server) throwForumSsrFailure(error, requestEvent)
    return {
      categories: [],
      errorMessage: forumErrorMessage(error, '社区内容加载失败，请稍后重试。'),
      disabled: error.code === 'FORUM_DISABLED',
    }
  }
}

const view = ref(await fetchView())
disabled.value = view.value.disabled
const pinnedPosts = computed(() => view.value.posts?.items.filter(post => post.isGloballyPinned).slice(0, 3) || [])
const latestPosts = computed(() => view.value.posts?.items.filter(post => !post.isGloballyPinned).slice(0, 12) || [])

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
  void router.push({ path: '/zh/forum', query: normalized ? { keyword: normalized } : {} })
}

function changePage(nextPage: number) {
  void router.push({
    path: '/zh/forum',
    query: { keyword: keyword.value, ...(nextPage > 1 ? { page: nextPage } : {}) },
  })
}

watch(() => route.fullPath, async () => {
  search.value = keyword.value
  await reload()
})

usePageSeo({
  title: computed(() => searchMode.value ? `搜索：${keyword.value}` : forumTitle.value),
  description: '管道技术社区，覆盖市政排水、建筑排水、工业管道、非开挖修复、检测设备、缺陷判读和作业安全。',
  path: computed(() => searchMode.value
    ? `/zh/forum?keyword=${encodeURIComponent(keyword.value)}${page.value > 1 ? `&page=${page.value}` : ''}`
    : '/zh/forum'),
  noindex: searchMode,
})
useHead({ bodyAttrs: { class: 'forum-route' } })
</script>

<template>
  <div class="forum-page">
    <section class="section forum-section">
      <div class="page-width forum-layout">
        <header class="forum-toolbar">
          <div>
            <h1>{{ searchMode ? '搜索社区' : forumTitle }}</h1>
            <p>{{ searchMode ? `标题和正文中包含“${keyword}”` : '管道检测、修复、判读与设备应用交流' }}</p>
          </div>
          <div class="forum-toolbar__actions">
            <form class="forum-search" role="search" @submit.prevent="submitSearch">
              <label class="visually-hidden" for="forum-search">搜索帖子标题和正文</label>
              <input id="forum-search" v-model="search" type="search" maxlength="100" autocomplete="off" placeholder="搜索标题和正文">
              <button class="button button--secondary" type="submit"><Search :size="17" aria-hidden="true" />搜索</button>
            </form>
            <NuxtLink v-if="!disabled" class="button button--primary" to="/zh/forum/new"><PenLine :size="17" aria-hidden="true" />发布帖子</NuxtLink>
          </div>
        </header>

        <div v-if="loading" class="forum-board forum-board--loading" role="status" aria-live="polite">
          <div v-for="item in 4" :key="item" class="forum-loading-row" aria-hidden="true"><div><Skeleton width="72%" height="1.15rem" /><Skeleton width="55%" height="0.75rem" /></div></div>
          <span class="visually-hidden">正在加载社区内容</span>
        </div>
        <div v-else-if="view.errorMessage" class="forum-state" :class="{ 'forum-state--disabled': view.disabled }" role="alert">
          <h2>{{ view.disabled ? '社区暂未开放' : '社区内容加载失败' }}</h2>
          <p>{{ view.errorMessage }}</p>
          <button v-if="!view.disabled" class="button button--secondary" type="button" @click="reload">重试</button>
        </div>

        <template v-else-if="searchMode">
          <section class="forum-content-section" aria-labelledby="forum-search-results-title">
            <div class="forum-section-heading">
              <h2 id="forum-search-results-title">搜索结果</h2>
              <span>{{ view.posts?.total || 0 }} 篇</span>
            </div>
            <ForumPostList v-if="view.posts?.items.length" :posts="view.posts.items" show-category />
            <div v-else class="forum-state">
              <h2>没有找到相关帖子</h2>
              <p>请尝试缩短关键词，或改用管道类型、缺陷名称和设备类别搜索。</p>
            </div>
            <ForumPager v-if="view.posts" :page="view.posts.page" :page-size="view.posts.pageSize" :total="view.posts.total" @change="changePage" />
          </section>
        </template>

        <template v-else>
          <dl v-if="view.summary" class="forum-summary" aria-label="社区概览">
            <div><UsersRound :size="21" aria-hidden="true" /><dt>会员</dt><dd>{{ view.summary.memberCount }}</dd></div>
            <div><MessageSquareText :size="21" aria-hidden="true" /><dt>已发布主题</dt><dd>{{ view.summary.publishedTopicCount }}</dd></div>
          </dl>

          <section v-if="pinnedPosts.length" class="forum-content-section" aria-labelledby="forum-pinned-title">
            <div class="forum-section-heading"><h2 id="forum-pinned-title">公告与置顶</h2><span>{{ pinnedPosts.length }} 篇</span></div>
            <ForumPostList :posts="pinnedPosts" show-category />
          </section>

          <section class="forum-content-section" aria-labelledby="forum-categories-title">
            <div class="forum-section-heading"><h2 id="forum-categories-title">社区分类</h2><span>{{ view.categories.length }} 个方向</span></div>
            <div v-if="view.categories.length" class="forum-board forum-category-board">
              <div class="forum-board__header forum-board__header--categories" aria-hidden="true"><span>分类</span><span>主题</span><span>评论</span></div>
              <article v-for="category in view.categories" :key="category.id" class="forum-category-row">
                <NuxtLink class="forum-category-row__content" :to="`/zh/forum/category/${category.id}`">
                  <span class="forum-category-icon"><ForumCategoryIcon :icon="category.icon" /></span>
                  <h3>{{ category.name }}</h3>
                  <ChevronRight class="forum-category-row__arrow" :size="20" aria-hidden="true" />
                </NuxtLink>
                <div class="forum-category-row__count"><span>主题</span><strong>{{ category.topicCount }}</strong></div>
                <div class="forum-category-row__count"><span>评论</span><strong>{{ category.commentCount }}</strong></div>
              </article>
            </div>
            <div v-else class="forum-state"><h2>暂时没有可用分类</h2><p>社区分类将在配置完成后显示于此。</p></div>
          </section>

          <section class="forum-content-section" aria-labelledby="forum-latest-title">
            <div class="forum-section-heading"><h2 id="forum-latest-title">最新讨论</h2><span>最近 {{ latestPosts.length }} 篇</span></div>
            <ForumPostList v-if="latestPosts.length" :posts="latestPosts" show-category />
            <div v-else class="forum-state"><h2>暂时没有公开讨论</h2><p>已审核的讨论会在发布后显示于此。</p></div>
          </section>
        </template>
      </div>
    </section>
  </div>
</template>
