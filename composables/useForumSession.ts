import { ForumApiError } from '~/composables/useForumApi'
import { forumSessionExpiryDelay, normalizeForumUsername, type ForumUser } from '~/shared/forum/contracts'

type ForumSession = {
  accessToken: string
  expiresAt: string
  user: ForumUser
}

const STORAGE_KEY = 'ulink-forum-session-v1'
let restoreRequest: Promise<void> | undefined
let expiryTimer: ReturnType<typeof setTimeout> | undefined

function validStoredSession(value: unknown): ForumSession | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  const item = value as Partial<ForumSession>
  if (typeof item.accessToken !== 'string' || !item.accessToken || typeof item.expiresAt !== 'string') return
  if (!item.user || typeof item.user !== 'object' || forumSessionExpiryDelay(item.expiresAt) <= 0) return
  const user = item.user as ForumUser
  if (!Number.isInteger(user.id) || user.id <= 0 || !user.username || !user.displayName || typeof user.isEnabled !== 'boolean') return
  return {
    accessToken: item.accessToken,
    expiresAt: item.expiresAt,
    user: { ...user, emailVerified: user.emailVerified === true },
  }
}

export function useForumSession() {
  const api = useForumApi()
  const session = useState<ForumSession | undefined>('forum-session', () => undefined)
  const ready = useState('forum-session-ready', () => false)

  const clear = () => {
    if (expiryTimer) clearTimeout(expiryTimer)
    expiryTimer = undefined
    session.value = undefined
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
  }

  const persist = () => {
    if (import.meta.client && session.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(session.value))
  }

  const scheduleExpiry = () => {
    if (expiryTimer) clearTimeout(expiryTimer)
    if (!session.value) return
    const delay = forumSessionExpiryDelay(session.value.expiresAt)
    if (delay <= 0) {
      clear()
      return
    }
    expiryTimer = setTimeout(clear, Math.min(delay, 2_147_483_647))
  }

  const token = () => {
    if (!session.value) return undefined
    if (forumSessionExpiryDelay(session.value.expiresAt) <= 0) {
      clear()
      return undefined
    }
    return session.value.accessToken
  }

  const restore = async () => {
    if (!import.meta.client || ready.value) return
    if (restoreRequest) return restoreRequest
    restoreRequest = (async () => {
      try {
        const stored = validStoredSession(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'))
        if (!stored) {
          clear()
          return
        }
        const user = await api.getCurrentUser(stored.accessToken)
        session.value = { ...stored, user }
        scheduleExpiry()
        persist()
      } catch {
        clear()
      } finally {
        ready.value = true
        restoreRequest = undefined
      }
    })()
    return restoreRequest
  }

  const login = async (username: string, password: string) => {
    const response = await api.login({ username: normalizeForumUsername(username), password })
    if (forumSessionExpiryDelay(response.expiresAt) <= 0) {
      throw new ForumApiError(401, 'UNAUTHORIZED', '论坛登录会话已经过期。')
    }
    const user = await api.getCurrentUser(response.accessToken)
    session.value = { accessToken: response.accessToken, expiresAt: response.expiresAt, user }
    ready.value = true
    scheduleExpiry()
    persist()
    return user
  }

  const refresh = async () => {
    const accessToken = token()
    if (!accessToken || !session.value) throw new ForumApiError(401, 'UNAUTHORIZED', '请先登录论坛。')
    try {
      const user = await api.getCurrentUser(accessToken)
      session.value = { ...session.value, user }
      persist()
      return user
    } catch (error) {
      if (error instanceof ForumApiError && error.status === 401) clear()
      throw error
    }
  }

  const authorized = async <T>(action: (accessToken: string) => Promise<T>) => {
    const accessToken = token()
    if (!accessToken) throw new ForumApiError(401, 'UNAUTHORIZED', '请先登录论坛。')
    try {
      return await action(accessToken)
    } catch (error) {
      if (error instanceof ForumApiError && error.status === 401) clear()
      throw error
    }
  }

  return {
    session: readonly(session),
    ready: readonly(ready),
    isAuthenticated: computed(() => Boolean(token())),
    user: computed(() => session.value?.user),
    restore,
    login,
    refresh,
    logout: clear,
    authorized,
  }
}
