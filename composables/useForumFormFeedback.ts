import { ForumApiError, forumErrorMessage } from '~/composables/useForumApi'

function fieldKey(value: string) {
  const leaf = value.split('.').at(-1) || value
  return `${leaf.charAt(0).toLowerCase()}${leaf.slice(1)}`
}

export function useForumFormFeedback() {
  const message = ref('')
  const fieldErrors = ref<Record<string, string>>({})
  const retryUntil = ref(0)
  const forumDisabled = useState('forum-disabled', () => false)
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined

  const retrySeconds = computed(() => Math.max(0, Math.ceil((retryUntil.value - now.value) / 1000)))
  const isRateLimited = computed(() => retrySeconds.value > 0)

  function reset() {
    message.value = ''
    fieldErrors.value = {}
  }

  function capture(error: unknown, fallback?: string) {
    reset()
    message.value = forumErrorMessage(error, fallback)
    if (error instanceof ForumApiError) {
      if (error.code === 'FORUM_DISABLED') forumDisabled.value = true
      fieldErrors.value = Object.fromEntries(error.details.map(detail => [fieldKey(detail.field), detail.message]))
      if (error.retryAfterSeconds) {
        retryUntil.value = Date.now() + error.retryAfterSeconds * 1000
        now.value = Date.now()
        if (!timer) timer = setInterval(() => { now.value = Date.now() }, 1000)
      }
    }
  }

  onScopeDispose(() => {
    if (timer) clearInterval(timer)
  })

  return { message, fieldErrors, retrySeconds, isRateLimited, forumDisabled, reset, capture }
}
