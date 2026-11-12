<script setup lang="ts">
import { MailCheck, UserPlus } from 'lucide-vue-next'
import { ForumApiError } from '~/composables/useForumApi'
import {
  isValidForumEmail,
  normalizeForumEmail,
  normalizeForumUsername,
  safeForumReturnPath,
} from '~/shared/forum/contracts'

const route = useRoute()
const api = useForumApi()
const session = useForumSession()
const feedback = useForumFormFeedback()
const sendFeedback = useForumFormFeedback()
const username = ref('')
const password = ref('')
const displayName = ref('')
const email = ref('')
const verificationCode = ref('')
const submitting = ref(false)
const sendingCode = ref(false)
const codeSentTo = ref('')
const codeInvalidated = ref(false)
const sendStatus = ref('')
const resendUntil = ref(0)
const now = ref(Date.now())
const verificationCodeInput = ref<HTMLInputElement>()
let resendTimer: ReturnType<typeof setInterval> | undefined
const returnTo = computed(() => safeForumReturnPath(route.query.returnTo))
const loginTarget = computed(() => ({ path: '/zh/forum/login', query: { ...(returnTo.value !== '/zh/forum' ? { returnTo: returnTo.value } : {}) } }))
const resendSeconds = computed(() => Math.max(
  sendFeedback.retrySeconds.value,
  Math.ceil(Math.max(0, resendUntil.value - now.value) / 1000),
))

function startResendCooldown(seconds = 60) {
  resendUntil.value = Date.now() + seconds * 1000
  now.value = Date.now()
  if (!resendTimer) {
    resendTimer = setInterval(() => {
      now.value = Date.now()
      if (now.value >= resendUntil.value && resendTimer) {
        clearInterval(resendTimer)
        resendTimer = undefined
      }
    }, 1000)
  }
}

async function sendVerificationCode() {
  if (sendFeedback.forumDisabled.value || sendingCode.value || resendSeconds.value) return
  sendFeedback.reset()
  sendStatus.value = ''
  const normalizedEmail = normalizeForumEmail(email.value)
  if (!isValidForumEmail(normalizedEmail)) {
    sendFeedback.fieldErrors.value = { email: '请输入有效的邮箱地址，且不能超过 160 个字符。' }
    return
  }

  sendingCode.value = true
  try {
    await api.sendRegistrationEmailVerificationCode(normalizedEmail)
    codeSentTo.value = normalizedEmail
    codeInvalidated.value = false
    verificationCode.value = ''
    sendStatus.value = '若该邮箱可用于注册，验证码邮件将在几分钟内送达。请在 10 分钟内完成注册。'
    startResendCooldown()
    await nextTick()
    verificationCodeInput.value?.focus()
  } catch (error) {
    sendFeedback.capture(error, '验证码邮件暂时无法发送，请稍后重试。')
    if (error instanceof ForumApiError && error.code === 'RATE_LIMITED') {
      startResendCooldown(error.retryAfterSeconds || 60)
    }
  } finally {
    sendingCode.value = false
  }
}

async function submit() {
  if (feedback.forumDisabled.value) return
  feedback.reset()
  const normalizedUsername = normalizeForumUsername(username.value)
  const normalizedDisplayName = displayName.value.normalize('NFKC').trim()
  const normalizedEmail = normalizeForumEmail(email.value)
  const normalizedVerificationCode = verificationCode.value.trim()
  const errors: Record<string, string> = {}
  if (!/^[a-z0-9_-]{6,64}$/.test(normalizedUsername)) errors.username = '用户名须为 6-64 位小写字母、数字、下划线或连字符。'
  if (password.value.length < 8 || password.value.length > 128) errors.password = '密码须为 8-128 个字符。'
  if (!normalizedDisplayName || normalizedDisplayName.length > 64) errors.displayName = '昵称须为 1-64 个字符。'
  if (!isValidForumEmail(normalizedEmail)) errors.email = '请输入有效的邮箱地址，且不能超过 160 个字符。'
  if (!/^[0-9]{6}$/.test(normalizedVerificationCode)) errors.verificationCode = '请输入邮件中的 6 位数字验证码。'
  if (codeInvalidated.value) errors.verificationCode = '邮箱已更改，请重新发送验证码。'
  if (Object.keys(errors).length) {
    feedback.fieldErrors.value = errors
    return
  }
  submitting.value = true
  try {
    await api.register({
      username: normalizedUsername,
      password: password.value,
      displayName: normalizedDisplayName,
      email: normalizedEmail,
      verificationCode: normalizedVerificationCode,
    })
    await session.login(normalizedUsername, password.value)
    password.value = ''
    await navigateTo(returnTo.value)
  } catch (error) {
    feedback.capture(error, '注册失败，请检查填写内容后重试。')
    if (error instanceof ForumApiError && error.code === 'VALIDATION_ERROR' && !error.details.length) {
      feedback.message.value = '注册信息或邮箱验证码无效，请检查后重试。'
    } else if (error instanceof ForumApiError && error.code === 'CONFLICT') {
      feedback.message.value = '用户名或邮箱不可用，请更换后重试。'
    }
  } finally {
    submitting.value = false
  }
}

watch(email, (value) => {
  const normalizedEmail = normalizeForumEmail(value)
  sendFeedback.reset()
  sendStatus.value = ''
  if (codeSentTo.value && normalizedEmail !== codeSentTo.value) {
    codeInvalidated.value = true
    verificationCode.value = ''
  }
})

onScopeDispose(() => {
  if (resendTimer) clearInterval(resendTimer)
})

onMounted(async () => {
  await session.restore()
  if (session.isAuthenticated.value) await navigateTo(returnTo.value)
})

usePageSeo({ title: '论坛注册', description: '注册优联科技技术论坛账号。', path: '/zh/forum/register', noindex: true })
useHead({ bodyAttrs: { class: 'forum-route' } })
</script>

<template>
  <section class="section forum-auth-page">
    <div class="page-width">
      <div class="forum-form-panel">
        <h1>注册论坛账号</h1>
        <p>验证邮箱后创建账号，注册成功将自动登录。</p>
        <form @submit.prevent="submit">
          <div class="forum-field">
            <label for="register-username">用户名</label>
            <input id="register-username" v-model="username" type="text" minlength="6" maxlength="64" pattern="[a-z0-9_-]{6,64}" autocomplete="username" autocapitalize="none" spellcheck="false">
            <p class="forum-field-help">6-64 位小写字母、数字、下划线或连字符。</p>
            <p v-if="feedback.fieldErrors.value.username" class="forum-field-error">{{ feedback.fieldErrors.value.username }}</p>
          </div>
          <div class="forum-field">
            <label for="register-password">密码</label>
            <input id="register-password" v-model="password" type="password" minlength="8" maxlength="128" autocomplete="new-password">
            <p v-if="feedback.fieldErrors.value.password" class="forum-field-error">{{ feedback.fieldErrors.value.password }}</p>
          </div>
          <div class="forum-field">
            <label for="register-display-name">昵称</label>
            <input id="register-display-name" v-model="displayName" type="text" maxlength="64" autocomplete="nickname">
            <p v-if="feedback.fieldErrors.value.displayName" class="forum-field-error">{{ feedback.fieldErrors.value.displayName }}</p>
          </div>
          <div class="forum-field">
            <label for="register-email">邮箱</label>
            <div class="forum-verification-control">
              <input id="register-email" v-model="email" type="email" maxlength="160" autocomplete="email" required>
              <button class="button button--secondary" type="button" :disabled="sendingCode || submitting || Boolean(resendSeconds) || sendFeedback.forumDisabled.value" @click="sendVerificationCode">
                <MailCheck :size="16" aria-hidden="true" />
                {{ sendingCode ? '发送中' : resendSeconds ? `${resendSeconds} 秒后重发` : codeSentTo ? '重新发送' : '发送验证码' }}
              </button>
            </div>
            <p v-if="sendFeedback.fieldErrors.value.email || feedback.fieldErrors.value.email" class="forum-field-error">{{ sendFeedback.fieldErrors.value.email || feedback.fieldErrors.value.email }}</p>
            <p v-if="sendFeedback.message.value" class="form-feedback form-feedback--error" role="alert">{{ sendFeedback.message.value }}</p>
            <p v-if="sendStatus" class="forum-verification-status" role="status">{{ sendStatus }}</p>
          </div>
          <div class="forum-field">
            <label for="register-verification-code">邮箱验证码</label>
            <input id="register-verification-code" ref="verificationCodeInput" v-model="verificationCode" type="text" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code" required>
            <p v-if="feedback.fieldErrors.value.verificationCode" class="forum-field-error">{{ feedback.fieldErrors.value.verificationCode }}</p>
          </div>
          <p v-if="feedback.message.value" class="form-feedback form-feedback--error" role="alert">{{ feedback.message.value }}</p>
          <button class="button button--primary" type="submit" :disabled="submitting || feedback.isRateLimited.value || feedback.forumDisabled.value">
            <UserPlus :size="16" aria-hidden="true" />
            {{ submitting ? '注册中' : feedback.retrySeconds.value ? `${feedback.retrySeconds.value} 秒后重试` : '注册并登录' }}
          </button>
        </form>
        <p class="forum-auth-switch">已有论坛账号？<NuxtLink :to="loginTarget">返回登录</NuxtLink></p>
      </div>
    </div>
  </section>
</template>
