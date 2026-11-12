<script setup lang="ts">
import { ForumApiError } from '~/composables/useForumApi'
import { normalizeForumUsername, safeForumReturnPath } from '~/shared/forum/contracts'

const route = useRoute()
const session = useForumSession()
const feedback = useForumFormFeedback()
const username = ref('')
const password = ref('')
const submitting = ref(false)
const returnTo = computed(() => safeForumReturnPath(route.query.returnTo))
const registerTarget = computed(() => ({ path: '/zh/forum/register', query: { ...(returnTo.value !== '/zh/forum' ? { returnTo: returnTo.value } : {}) } }))

async function submit() {
  if (feedback.forumDisabled.value) return
  feedback.reset()
  const normalizedUsername = normalizeForumUsername(username.value)
  const errors: Record<string, string> = {}
  if (!/^[a-z0-9_-]{6,64}$/.test(normalizedUsername)) errors.username = '用户名须为 6-64 位小写字母、数字、下划线或连字符。'
  if (password.value.length < 8 || password.value.length > 128) errors.password = '密码须为 8-128 个字符。'
  if (Object.keys(errors).length) {
    feedback.fieldErrors.value = errors
    return
  }
  submitting.value = true
  try {
    await session.login(normalizedUsername, password.value)
    password.value = ''
    await navigateTo(returnTo.value)
  } catch (error) {
    feedback.capture(error, '用户名或密码错误。')
    if (error instanceof ForumApiError && error.code === 'UNAUTHORIZED') feedback.message.value = '用户名或密码错误。'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await session.restore()
  if (session.isAuthenticated.value) await navigateTo(returnTo.value)
})

usePageSeo({ title: '论坛登录', description: '登录优联科技技术论坛。', path: '/zh/forum/login', noindex: true })
useHead({ bodyAttrs: { class: 'forum-route' } })
</script>

<template>
  <section class="section forum-auth-page">
    <div class="page-width">
      <div class="forum-form-panel">
        <h1>登录技术论坛</h1>
        <p>使用独立的论坛账号参与讨论。</p>
        <form @submit.prevent="submit">
          <div class="forum-field">
            <label for="login-username">用户名</label>
            <input id="login-username" v-model="username" type="text" minlength="6" maxlength="64" autocomplete="username" autocapitalize="none" spellcheck="false">
            <p v-if="feedback.fieldErrors.value.username" class="forum-field-error">{{ feedback.fieldErrors.value.username }}</p>
          </div>
          <div class="forum-field">
            <label for="login-password">密码</label>
            <input id="login-password" v-model="password" type="password" minlength="8" maxlength="128" autocomplete="current-password">
            <p v-if="feedback.fieldErrors.value.password" class="forum-field-error">{{ feedback.fieldErrors.value.password }}</p>
          </div>
          <p v-if="feedback.message.value" class="form-feedback form-feedback--error" role="alert">{{ feedback.message.value }}</p>
          <button class="button button--primary" type="submit" :disabled="submitting || feedback.isRateLimited.value || feedback.forumDisabled.value">
            {{ submitting ? '登录中' : feedback.retrySeconds.value ? `${feedback.retrySeconds.value} 秒后重试` : '登录' }}
          </button>
        </form>
        <p class="forum-auth-switch">还没有论坛账号？<NuxtLink :to="registerTarget">注册账号</NuxtLink></p>
      </div>
    </div>
  </section>
</template>
