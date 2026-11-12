<script setup lang="ts">
import { Pin } from 'lucide-vue-next'
import { ForumApiError, forumErrorMessage, throwForumSsrFailure } from '~/composables/useForumApi'
import { formatForumDate, forumExcerpt, sanitizeForumPostBody } from '~/shared/forum/presentation'
import { forumIndexPolicy, isForumPostIndexable } from '~/shared/forum/indexing'
import { absoluteSiteUrl, breadcrumbListEntity, serializeJsonLd } from '~/shared/content/structured-data'
import type { ForumPostDetail } from '~/shared/forum/contracts'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const api = useForumApi()
const requestEvent = import.meta.server ? useRequestEvent() : undefined
const session = useForumSession()
const feedback = useForumFormFeedback()
const pageSize = 20
const detail = ref<ForumPostDetail>()
const loading = ref(false)
const loadError = ref('')
const disabled = useState('forum-disabled', () => false)
const commentBody = ref('')
const submitting = ref(false)
const successMessage = ref('')

const postId = computed(() => {
  const value = Number(route.params.id)
  return Number.isSafeInteger(value) && value > 0 ? value : undefined
})
if (!postId.value) throw createError({ statusCode: 404, statusMessage: '未找到该社区帖子。' })

const commentPage = computed(() => {
  const value = Number(route.query.commentPage)
  return Number.isInteger(value) && value > 0 ? value : 1
})
const postPath = computed(() => `/zh/forum/${postId.value}`)
const loginTarget = computed(() => ({
  path: '/zh/forum/login',
  query: { returnTo: `${route.path}${commentPage.value > 1 ? `?commentPage=${commentPage.value}` : ''}#comment-form` },
}))
const sanitizedPostBody = computed(() => sanitizeForumPostBody(detail.value?.post.body || ''))

async function fetchPost() {
  try {
    const response = await api.getPost(postId.value!, commentPage.value, pageSize)
    if (commentPage.value > 1 && response.comments.total > 0 && !response.comments.items.length) {
      throw createError({ statusCode: 404, statusMessage: '未找到该评论分页。' })
    }
    return response
  } catch (error) {
    if (error instanceof ForumApiError && error.code === 'NOT_FOUND') {
      throw createError({ statusCode: 404, statusMessage: '未找到该社区帖子。' })
    }
    throw error
  }
}

try {
  detail.value = await fetchPost()
} catch (error) {
  if (!(error instanceof ForumApiError)) throw error
  if (import.meta.server) throwForumSsrFailure(error, requestEvent)
  disabled.value = error.code === 'FORUM_DISABLED'
  loadError.value = forumErrorMessage(error, '帖子加载失败，请稍后重试。')
}

async function loadPost() {
  loading.value = true
  loadError.value = ''
  disabled.value = false
  try {
    detail.value = await fetchPost()
  } catch (error) {
    if (!(error instanceof ForumApiError)) throw error
    detail.value = undefined
    disabled.value = error.code === 'FORUM_DISABLED'
    loadError.value = forumErrorMessage(error, '帖子加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

function changeCommentPage(page: number) {
  void router.push({ path: route.path, query: { ...(page > 1 ? { commentPage: page } : {}) }, hash: '#comments' })
}

async function submitComment() {
  if (feedback.forumDisabled.value) return
  feedback.reset()
  successMessage.value = ''
  const body = commentBody.value.normalize('NFKC').trim()
  if (!body) {
    feedback.fieldErrors.value = { body: '请输入评论内容。' }
    return
  }
  if (body.length > 5000) {
    feedback.fieldErrors.value = { body: '评论不能超过 5000 个字符。' }
    return
  }
  submitting.value = true
  try {
    await session.authorized(token => api.createComment(token, postId.value!, body))
    commentBody.value = ''
    successMessage.value = '评论已提交，等待审核。审核通过后会显示在公开评论中。'
  } catch (error) {
    feedback.capture(error, '评论提交失败，请稍后重试。')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await session.restore()
  if (route.hash === '#comment-form') nextTick(() => document.querySelector<HTMLElement>('#comment-form textarea')?.focus())
})
watch(() => [postId.value, commentPage.value], loadPost)

const postTitle = computed(() => detail.value?.post.title || '论坛帖子')
const postDescription = computed(() => detail.value ? forumExcerpt(detail.value.post.body, 160) : '查看管道技术社区的公开帖子和评论。')
usePageSeo({
  title: postTitle,
  description: postDescription,
  path: postPath,
  noindex: computed(() => commentPage.value > 1),
  // Same threshold as sitemap.xml, so a page is never listed there and noindexed here.
  robots: computed(() => detail.value && !isForumPostIndexable(detail.value.post, forumIndexPolicy(config.public)) ? 'noindex, follow' : undefined),
  ogType: 'article',
})
usePageBreadcrumbLabel(() => route.path, postTitle)
useHead(() => {
  if (!detail.value) return { bodyAttrs: { class: 'forum-route' } }
  const post = detail.value.post
  const postUrl = absoluteSiteUrl(config.public.siteUrl, postPath.value)
  const authorUrl = absoluteSiteUrl(config.public.siteUrl, `/zh/forum/users/${post.authorId}`)
  const breadcrumb = breadcrumbListEntity(config.public.siteUrl, postPath.value, [
    { name: '首页', path: '/' },
    { name: '技术社区', path: '/zh/forum' },
    { name: post.category.name, path: `/zh/forum/category/${post.category.id}` },
    { name: post.title, path: postPath.value },
  ])
  return {
    bodyAttrs: { class: 'forum-route' },
    script: [{
      type: 'application/ld+json',
      innerHTML: serializeJsonLd({
        '@context': 'https://schema.org',
        '@type': 'DiscussionForumPosting',
        '@id': `${postUrl}#posting`,
        url: postUrl,
        headline: post.title,
        text: forumExcerpt(post.body, 500),
        datePublished: post.publishedAt,
        author: { '@type': 'Person', name: post.displayName, url: authorUrl },
        interactionStatistic: {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/CommentAction',
          userInteractionCount: post.commentCount,
        },
        commentCount: post.commentCount,
        // Only the comments rendered on this page, so the markup matches the visible HTML.
        comment: detail.value.comments.items.length
          ? detail.value.comments.items.map(comment => ({
              '@type': 'Comment',
              '@id': `${postUrl}#comment-${comment.id}`,
              text: forumExcerpt(comment.body, 500),
              datePublished: comment.publishedAt,
              author: {
                '@type': 'Person',
                name: comment.displayName,
                url: absoluteSiteUrl(config.public.siteUrl, `/zh/forum/users/${comment.authorId}`),
              },
            }))
          : undefined,
      }),
    }, {
      type: 'application/ld+json',
      innerHTML: serializeJsonLd({ '@context': 'https://schema.org', ...breadcrumb }),
    }],
  }
})
</script>

<template>
  <div class="forum-page">
    <section class="section forum-section">
      <div class="page-width forum-detail-layout">
        <NuxtLink class="forum-back-link" :to="detail ? `/zh/forum/category/${detail.post.category.id}` : '/zh/forum'">{{ detail ? `返回${detail.post.category.name}` : '返回技术社区' }}</NuxtLink>
        <div v-if="loading" class="forum-detail-loading" role="status"><Skeleton width="min(34rem, 82%)" height="2.25rem" /><Skeleton width="14rem" height="0.9rem" /><div class="forum-detail-loading__body"><Skeleton v-for="item in 6" :key="item" :width="item === 6 ? '62%' : '100%'" height="0.95rem" /></div><span class="visually-hidden">正在加载帖子</span></div>
        <div v-else-if="loadError" class="forum-state" :class="{ 'forum-state--disabled': disabled }" role="alert"><h1>{{ disabled ? '社区暂未开放' : '帖子加载失败' }}</h1><p>{{ loadError }}</p><button v-if="!disabled" class="button button--secondary" type="button" @click="loadPost">重试</button></div>
        <template v-else-if="detail">
          <article class="forum-post-detail">
            <header>
              <div class="forum-post-detail__labels">
                <NuxtLink class="forum-section-label" :to="`/zh/forum/category/${detail.post.category.id}`"><ForumCategoryIcon :icon="detail.post.category.icon" :size="15" />{{ detail.post.category.name }}</NuxtLink>
                <span v-if="detail.post.postType === 'announcement'" class="forum-post-badge forum-post-badge--announcement">公告</span>
                <span v-if="detail.post.isGloballyPinned" class="forum-post-badge forum-post-badge--pinned"><Pin :size="12" aria-hidden="true" />置顶</span>
              </div>
              <h1>{{ detail.post.title }}</h1>
              <div class="forum-byline">
                <NuxtLink class="forum-author-link" :to="`/zh/forum/users/${detail.post.authorId}`"><ForumAvatar :avatar="detail.post.authorAvatar" :name="detail.post.displayName" size="sm" /><span><strong>{{ detail.post.displayName }}</strong><small v-if="detail.post.authorProfession">{{ detail.post.authorProfession }}</small></span></NuxtLink>
                <time :datetime="detail.post.publishedAt">{{ formatForumDate(detail.post.publishedAt) }}</time>
                <span>浏览 {{ detail.post.viewCount }} 次</span>
              </div>
            </header>
            <div class="forum-rich-text rich-content" v-html="sanitizedPostBody"></div>
          </article>

          <section id="comments" class="forum-comments" aria-labelledby="comments-title">
            <div class="forum-comments__heading"><h2 id="comments-title">评论</h2><span>{{ detail.post.commentCount }} 条</span></div>
            <div v-if="detail.comments.items.length" class="forum-comment-list">
              <article v-for="comment in detail.comments.items" :id="`comment-${comment.id}`" :key="comment.id" class="forum-comment">
                <header>
                  <NuxtLink class="forum-author-link" :to="`/zh/forum/users/${comment.authorId}`"><ForumAvatar :avatar="comment.authorAvatar" :name="comment.displayName" size="sm" /><span><strong>{{ comment.displayName }}</strong><small v-if="comment.authorProfession">{{ comment.authorProfession }}</small></span></NuxtLink>
                  <time :datetime="comment.publishedAt">{{ formatForumDate(comment.publishedAt) }}</time>
                </header>
                <p>{{ comment.body }}</p>
              </article>
            </div>
            <div v-else class="forum-comments__empty">暂时没有公开评论。</div>
            <ForumPager :page="detail.comments.page" :page-size="detail.comments.pageSize" :total="detail.comments.total" @change="changeCommentPage" />
          </section>

          <section id="comment-form" class="forum-comment-form" aria-labelledby="comment-form-title">
            <h2 id="comment-form-title">参与讨论</h2>
            <form v-if="session.isAuthenticated.value" @submit.prevent="submitComment">
              <label for="comment-body">评论内容</label>
              <textarea id="comment-body" v-model="commentBody" rows="7" maxlength="5000" :aria-describedby="feedback.fieldErrors.value.body ? 'comment-body-error' : undefined" />
              <p v-if="feedback.fieldErrors.value.body" id="comment-body-error" class="forum-field-error">{{ feedback.fieldErrors.value.body }}</p>
              <p class="forum-field-help">评论将在审核通过后公开，最多 5000 个字符。</p>
              <p v-if="feedback.message.value" class="form-feedback form-feedback--error" role="alert">{{ feedback.message.value }}</p>
              <p v-if="successMessage" class="form-feedback form-feedback--success" role="status">{{ successMessage }}</p>
              <button class="button button--primary" type="submit" :disabled="submitting || feedback.isRateLimited.value || feedback.forumDisabled.value">{{ submitting ? '提交中' : feedback.retrySeconds.value ? `${feedback.retrySeconds.value} 秒后重试` : '提交评论' }}</button>
            </form>
            <div v-else class="forum-signin-prompt"><p>登录论坛账号后可以发表评论。</p><NuxtLink class="button button--primary" :to="loginTarget">登录后评论</NuxtLink></div>
          </section>
        </template>
      </div>
    </section>
  </div>
</template>
