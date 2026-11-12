<script setup lang="ts">
import { CalendarDays, FileText } from 'lucide-vue-next'
import { ForumApiError, forumErrorMessage } from '~/composables/useForumApi'
import { formatForumDate } from '~/shared/forum/presentation'
import type { ForumPage, ForumPost, PublicForumUserProfile } from '~/shared/forum/contracts'

type UserView = {
  profile?: PublicForumUserProfile
  posts?: ForumPage<ForumPost>
  errorMessage: string
}

const route = useRoute()
const router = useRouter()
const api = useForumApi()
const userId = Number(route.params.id)
if (!Number.isSafeInteger(userId) || userId < 1) {
  throw createError({ statusCode: 404, statusMessage: '未找到该社区用户。' })
}
const page = computed(() => {
  const value = Number(route.query.page)
  return Number.isInteger(value) && value > 0 ? value : 1
})
const loading = ref(false)

async function fetchView(): Promise<UserView> {
  try {
    const [profile, posts] = await Promise.all([
      api.getPublicUser(userId),
      api.listPublicUserPosts(userId, page.value, 10),
    ])
    if (page.value > 1 && posts.total > 0 && !posts.items.length) {
      throw createError({ statusCode: 404, statusMessage: '未找到该用户帖子分页。' })
    }
    return { profile, posts, errorMessage: '' }
  } catch (error) {
    if (error instanceof ForumApiError && error.code === 'NOT_FOUND') {
      throw createError({ statusCode: 404, statusMessage: '未找到该社区用户。' })
    }
    if (!(error instanceof ForumApiError)) throw error
    return { errorMessage: forumErrorMessage(error, '用户主页加载失败，请稍后重试。') }
  }
}

const view = ref(await fetchView())

async function reload() {
  loading.value = true
  try { view.value = await fetchView() } finally { loading.value = false }
}

function changePage(nextPage: number) {
  void router.push({
    path: `/zh/forum/users/${userId}`,
    query: nextPage > 1 ? { page: nextPage } : {},
  })
}

watch(() => route.fullPath, reload)
const title = computed(() => view.value.profile?.displayName || '社区用户')
usePageSeo({ title, description: computed(() => `${title.value}在管道技术社区发布的公开资料和主题。`), path: `/zh/forum/users/${userId}`, noindex: true })
usePageBreadcrumbLabel(() => route.path, title)
useHead({ bodyAttrs: { class: 'forum-route' } })
</script>

<template>
  <div class="forum-page">
    <section class="section forum-section">
      <div class="page-width forum-layout">
        <NuxtLink class="forum-back-link" to="/zh/forum">返回技术社区</NuxtLink>
        <div v-if="loading" class="forum-detail-loading" role="status"><Skeleton width="18rem" height="2rem" /><Skeleton width="100%" height="7rem" /><span class="visually-hidden">正在加载用户主页</span></div>
        <div v-else-if="view.errorMessage" class="forum-state" role="alert"><h1>用户主页加载失败</h1><p>{{ view.errorMessage }}</p><button class="button button--secondary" type="button" @click="reload">重试</button></div>
        <template v-else-if="view.profile && view.posts">
          <header class="forum-profile-header">
            <ForumAvatar :avatar="view.profile.avatar" :name="view.profile.displayName" size="lg" />
            <div class="forum-profile-header__identity">
              <h1>{{ view.profile.displayName }}</h1>
              <p v-if="view.profile.profession" class="forum-profile-profession">{{ view.profile.profession }}</p>
              <p v-if="view.profile.bio" class="forum-profile-bio">{{ view.profile.bio }}</p>
              <p v-else class="forum-profile-bio forum-profile-bio--empty">这位用户尚未填写个人简介。</p>
              <dl class="forum-profile-meta">
                <div><CalendarDays :size="16" aria-hidden="true" /><dt>加入时间</dt><dd><time :datetime="view.profile.joinedAt">{{ formatForumDate(view.profile.joinedAt) }}</time></dd></div>
                <div><FileText :size="16" aria-hidden="true" /><dt>公开主题</dt><dd>{{ view.profile.publishedTopicCount }}</dd></div>
              </dl>
            </div>
          </header>

          <section class="forum-content-section" aria-labelledby="forum-user-posts-title">
            <div class="forum-section-heading"><h2 id="forum-user-posts-title">发布的主题</h2><span>{{ view.posts.total }} 篇</span></div>
            <ForumPostList v-if="view.posts.items.length" :posts="view.posts.items" show-category />
            <div v-else class="forum-state"><h2>暂无公开主题</h2><p>该用户尚未发布通过审核的公开帖子。</p></div>
            <ForumPager :page="view.posts.page" :page-size="view.posts.pageSize" :total="view.posts.total" @change="changePage" />
          </section>
        </template>
      </div>
    </section>
  </div>
</template>
