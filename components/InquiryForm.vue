<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import {
  buildInquiryPayload,
  inquiryMessageForProduct,
  inquiryRequestErrorMessage,
  inquiryValidationErrorFromResponse,
  isInquiryAcceptedStatus,
  parseInquiryCaptchaChallenge,
  validateInquiryPayload,
  type InquiryDraft,
  type InquiryValidationError,
} from '~/shared/inquiries/contracts'

const props = defineProps<{ productModel?: string }>()
const route = useRoute()
const siteApiUrl = useSiteApiUrl()
const state = reactive<InquiryDraft & { consent: boolean }>({
  name: '',
  email: '',
  phone: '',
  company: '',
  message: inquiryMessageForProduct(props.productModel),
  captchaId: '',
  captchaCode: '',
  consent: false,
  website: '',
})
const status = ref<'idle' | 'sending' | 'success' | 'error'>('idle')
const errorMessage = ref('')
const errorField = ref<InquiryValidationError['field']>()
const captchaStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const captchaImageDataUrl = ref('')
const captchaLoadError = ref('')
const { state: privacyPolicy, load: loadPrivacyPolicy } = useLegalDocument('privacy')
const privacyPolicyAvailable = computed(() => privacyPolicy.value.status === 'configured' && Boolean(privacyPolicy.value.document))

function errorStatus(error: unknown) {
  if (typeof error !== 'object' || error === null) return undefined
  if ('statusCode' in error && typeof error.statusCode === 'number') return error.statusCode
  if ('status' in error && typeof error.status === 'number') return error.status
  return undefined
}

function showValidationError(error: InquiryValidationError) {
  status.value = 'error'
  errorField.value = error.field
  errorMessage.value = error.message
}

function captchaRequestErrorMessage(status?: number) {
  if (status === 429) return '验证码刷新过于频繁，请稍后再试。'
  if (status === 503) return '在线询盘暂不可用，请稍后再试。'
  return '验证码加载失败，请重试。'
}

async function loadCaptcha(clearFieldError = true) {
  captchaStatus.value = 'loading'
  captchaLoadError.value = ''
  captchaImageDataUrl.value = ''
  state.captchaId = ''
  state.captchaCode = ''
  if (clearFieldError && errorField.value === 'captchaCode') {
    status.value = 'idle'
    errorField.value = undefined
    errorMessage.value = ''
  }

  try {
    const response = await $fetch<unknown>(siteApiUrl('inquiries/captcha'), { cache: 'no-store' })
    const challenge = parseInquiryCaptchaChallenge(response)
    if (!challenge) throw new Error('Invalid inquiry captcha response')
    state.captchaId = challenge.captchaId
    captchaImageDataUrl.value = challenge.imageDataUrl
    captchaStatus.value = 'ready'
  } catch (error) {
    captchaStatus.value = 'error'
    captchaLoadError.value = captchaRequestErrorMessage(errorStatus(error))
  }
}

function normalizeCaptchaInput() {
  state.captchaCode = state.captchaCode
    .normalize('NFKC')
    .replace(/[^A-Za-z0-9]/gu, '')
    .toUpperCase()
    .slice(0, 4)
  if (errorField.value === 'captchaCode') {
    status.value = 'idle'
    errorField.value = undefined
    errorMessage.value = ''
  }
}

async function submitInquiry() {
  if (!privacyPolicyAvailable.value || !privacyPolicy.value.document) {
    status.value = 'error'
    errorField.value = 'payload'
    errorMessage.value = '隐私政策尚不可用，暂时无法提交询盘。'
    return
  }
  if (!state.consent) {
    status.value = 'error'
    errorField.value = 'payload'
    errorMessage.value = '请阅读并同意隐私政策。'
    return
  }
  if (captchaStatus.value !== 'ready') {
    return showValidationError({ field: 'captchaCode', message: '请先刷新验证码。' })
  }
  const payload = buildInquiryPayload(state, route.path)
  const validationError = validateInquiryPayload(payload)
  if (validationError) return showValidationError(validationError)

  status.value = 'sending'
  errorField.value = undefined
  errorMessage.value = ''
  try {
    const response = await $fetch.raw(siteApiUrl('inquiries'), {
      method: 'POST',
      body: payload,
    })
    if (!isInquiryAcceptedStatus(response.status)) throw new Error(`Unexpected inquiry response status: ${response.status}`)
    status.value = 'success'
  } catch (error) {
    const validationError = inquiryValidationErrorFromResponse(error)
    if (validationError) showValidationError(validationError)
    else {
      status.value = 'error'
      errorField.value = 'payload'
      errorMessage.value = inquiryRequestErrorMessage(errorStatus(error))
    }
    await loadCaptcha(false)
  }
}

watch(privacyPolicyAvailable, (available) => {
  if (!available) state.consent = false
})

onMounted(() => {
  void Promise.all([loadPrivacyPolicy(), loadCaptcha()])
})
</script>

<template>
  <form class="inquiry-form" novalidate @submit.prevent="submitInquiry">
    <div class="form-grid">
      <label>
        姓名
        <input v-model="state.name" name="name" autocomplete="name" required minlength="2" maxlength="100" :aria-invalid="errorField === 'name'" :aria-describedby="errorField === 'name' ? 'inquiry-name-error' : undefined" />
        <span v-if="errorField === 'name'" id="inquiry-name-error" class="inquiry-field-error" role="alert">{{ errorMessage }}</span>
      </label>
      <label>
        公司名称
        <input v-model="state.company" name="company" autocomplete="organization" maxlength="200" :aria-invalid="errorField === 'company'" :aria-describedby="errorField === 'company' ? 'inquiry-company-error' : undefined" />
        <span v-if="errorField === 'company'" id="inquiry-company-error" class="inquiry-field-error" role="alert">{{ errorMessage }}</span>
      </label>
      <label>
        联系邮箱 <span class="field-optional">与电话至少填写一项</span>
        <input v-model="state.email" name="email" type="email" autocomplete="email" maxlength="200" :aria-invalid="errorField === 'email' || errorField === 'contact'" :aria-describedby="errorField === 'email' ? 'inquiry-email-error' : errorField === 'contact' ? 'inquiry-contact-error' : undefined" />
        <span v-if="errorField === 'email'" id="inquiry-email-error" class="inquiry-field-error" role="alert">{{ errorMessage }}</span>
      </label>
      <label>
        联系电话 <span class="field-optional">与邮箱至少填写一项</span>
        <input v-model="state.phone" name="phone" type="tel" autocomplete="tel" maxlength="32" inputmode="tel" :aria-invalid="errorField === 'phone' || errorField === 'contact'" :aria-describedby="errorField === 'phone' ? 'inquiry-phone-error' : errorField === 'contact' ? 'inquiry-contact-error' : undefined" />
        <span v-if="errorField === 'phone'" id="inquiry-phone-error" class="inquiry-field-error" role="alert">{{ errorMessage }}</span>
      </label>
      <p v-if="errorField === 'contact'" id="inquiry-contact-error" class="inquiry-field-error form-grid__full" role="alert">{{ errorMessage }}</p>
      <label class="form-grid__full">
        咨询内容
        <textarea v-model="state.message" name="message" required minlength="10" maxlength="4000" rows="3" :aria-invalid="errorField === 'message'" :aria-describedby="errorField === 'message' ? 'inquiry-message-error' : undefined" />
        <span v-if="errorField === 'message'" id="inquiry-message-error" class="inquiry-field-error" role="alert">{{ errorMessage }}</span>
      </label>
      <label class="honeypot" aria-hidden="true">
        网站
        <input v-model="state.website" name="website" tabindex="-1" autocomplete="off" />
      </label>
    </div>
    <div class="inquiry-footer">
      <div class="captcha-field">
        <label for="inquiry-captcha">验证码 <span class="field-optional">4 位英文或数字</span></label>
        <div class="captcha-control">
          <input
            id="inquiry-captcha"
            v-model="state.captchaCode"
            name="captchaCode"
            type="text"
            inputmode="text"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            maxlength="4"
            required
            :disabled="captchaStatus !== 'ready'"
            :aria-invalid="errorField === 'captchaCode'"
            :aria-describedby="errorField === 'captchaCode' ? 'inquiry-captcha-error' : captchaLoadError ? 'inquiry-captcha-load-error' : undefined"
            @input="normalizeCaptchaInput"
          />
          <div class="captcha-image" aria-live="polite">
            <img v-if="captchaStatus === 'ready'" :src="captchaImageDataUrl" alt="4 位验证码图片" width="116" height="44" draggable="false" />
            <span v-else-if="captchaStatus === 'loading'">加载中</span>
            <span v-else>未加载</span>
          </div>
          <button
            class="captcha-refresh"
            type="button"
            :disabled="captchaStatus === 'loading' || status === 'sending'"
            title="换一张验证码"
            aria-label="换一张验证码"
            @click="loadCaptcha()"
          >
            <RefreshCw :size="18" aria-hidden="true" />
          </button>
        </div>
        <span v-if="errorField === 'captchaCode'" id="inquiry-captcha-error" class="inquiry-field-error" role="alert">{{ errorMessage }}</span>
        <p v-if="captchaLoadError" id="inquiry-captcha-load-error" class="inquiry-field-error" role="alert">{{ captchaLoadError }}</p>
      </div>
      <label class="consent">
        <input v-model="state.consent" type="checkbox" required :disabled="!privacyPolicyAvailable" />
        <span>我已阅读并同意 <NuxtLink to="/zh/privacy" target="_blank" rel="noopener noreferrer">隐私政策</NuxtLink></span>
      </label>
      <button class="button button--primary inquiry-submit" :disabled="status === 'sending' || status === 'success' || !privacyPolicyAvailable || captchaStatus !== 'ready'" type="submit">
        {{ status === 'sending' ? '正在提交' : status === 'success' ? '已提交' : '提交' }}
      </button>
    </div>
    <p v-if="privacyPolicy.status === 'loading'" class="form-feedback" role="status">正在加载隐私政策。</p>
    <p v-else-if="privacyPolicy.status === 'unconfigured'" class="form-feedback form-feedback--error" role="alert">隐私政策尚未配置，在线询盘暂不可用。</p>
    <p v-else-if="privacyPolicy.status === 'error'" class="form-feedback form-feedback--error" role="alert">
      {{ privacyPolicy.error }}
      <button class="inline-command" type="button" @click="loadPrivacyPolicy">重新加载</button>
    </p>
    <p v-if="status === 'success'" class="form-feedback form-feedback--success" role="status">已收到您的咨询，我们将尽快联系您。</p>
    <p v-if="status === 'error' && (!errorField || errorField === 'payload')" class="form-feedback form-feedback--error" role="alert">{{ errorMessage }}</p>
  </form>
</template>
